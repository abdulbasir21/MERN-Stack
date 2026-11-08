import ImageKit from 'imagekit';
import { env } from '../config/env.js';

let imagekitClient: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (!imagekitClient) {
    if (!env.IMAGEKIT_PUBLIC_KEY || !env.IMAGEKIT_PRIVATE_KEY || !env.IMAGEKIT_URL_ENDPOINT) {
      throw new Error('ImageKit configuration is missing in server environment.');
    }

    imagekitClient = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }

  return imagekitClient;
}

export async function uploadToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder = '/crewdesk/avatars'
): Promise<{ url: string; fileId: string }> {
  const ik = getImageKit();
  const res = await ik.upload({
    file: fileBuffer,
    fileName,
    folder,
  });

  return {
    url: res.url,
    fileId: res.fileId,
  };
}

export async function deleteFromImageKit(fileId: string): Promise<void> {
  const ik = getImageKit();
  try {
    await ik.deleteFile(fileId);
  } catch (err) {
    console.error('Failed to delete old file from ImageKit:', err);
  }
}
