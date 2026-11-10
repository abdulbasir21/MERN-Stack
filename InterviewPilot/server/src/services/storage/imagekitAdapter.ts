import ImageKit from 'imagekit';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { setUserStorageCleanupHook } from './storageCleanupHook.js';

export interface StorageUploadResult {
  fileId: string;
  name: string;
  size: number;
}

export interface StorageAdapter {
  uploadPrivateFile(
    userId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<StorageUploadResult>;
  deleteFile(fileId: string): Promise<void>;
  getFileBuffer(fileId: string): Promise<Buffer>;
  deleteAllUserFiles(userId: string): Promise<number>;
}

class ImageKitStorageAdapter implements StorageAdapter {
  private ik: ImageKit;

  constructor() {
    this.ik = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY || '',
      privateKey: env.IMAGEKIT_PRIVATE_KEY || '',
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT || '',
    });
  }

  async uploadPrivateFile(
    userId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<StorageUploadResult> {
    const response = await this.ik.upload({
      file: fileBuffer,
      fileName,
      folder: `/interviewpilot/${userId}/`,
      isPrivateFile: true,
      useUniqueFileName: true,
    });

    return {
      fileId: response.fileId,
      name: response.name,
      size: response.size,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.ik.deleteFile(fileId);
    } catch (err) {
      // If already deleted or not found, do not fail
      console.warn(`[IMAGEKIT] deleteFile error for ${fileId}:`, err);
    }
  }

  async getFileBuffer(fileId: string): Promise<Buffer> {
    const fileDetails = await this.ik.getFileDetails(fileId);
    if (!fileDetails || !fileDetails.url) {
      throw new Error(`File ${fileId} not found in storage.`);
    }

    const response = await fetch(fileDetails.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file ${fileId} from storage: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteAllUserFiles(userId: string): Promise<number> {
    const docs = await prisma.uploadedDocument.findMany({
      where: { userId, storageFileId: { not: null } },
      select: { storageFileId: true },
    });

    let count = 0;
    for (const doc of docs) {
      if (doc.storageFileId) {
        await this.deleteFile(doc.storageFileId);
        count++;
      }
    }
    return count;
  }
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private files = new Map<string, { userId: string; buffer: Buffer; fileName: string }>();
  private idCounter = 1;

  async uploadPrivateFile(
    userId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<StorageUploadResult> {
    const fileId = `mock_file_${this.idCounter++}_${Date.now()}`;
    this.files.set(fileId, { userId, buffer: Buffer.from(fileBuffer), fileName });
    return {
      fileId,
      name: fileName,
      size: fileBuffer.length,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    this.files.delete(fileId);
  }

  async getFileBuffer(fileId: string): Promise<Buffer> {
    const item = this.files.get(fileId);
    if (!item) {
      throw new Error(`Mock file ${fileId} not found.`);
    }
    return item.buffer;
  }

  async deleteAllUserFiles(userId: string): Promise<number> {
    let count = 0;
    for (const [id, item] of this.files.entries()) {
      if (item.userId === userId) {
        this.files.delete(id);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.files.clear();
  }
}

let activeStorageAdapter: StorageAdapter = new ImageKitStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  return activeStorageAdapter;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  activeStorageAdapter = adapter;
}

export function resetStorageAdapter(): void {
  activeStorageAdapter = new ImageKitStorageAdapter();
}

// Wire the storage cleanup hook for Phase 2 account deletion (USR-3)
setUserStorageCleanupHook(async (userId: string) => {
  await activeStorageAdapter.deleteAllUserFiles(userId);
});
