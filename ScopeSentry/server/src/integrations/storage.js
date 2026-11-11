import ImageKit from '@imagekit/nodejs';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

let imagekitClient = null;

function getImageKitClient() {
  if (!imagekitClient) {
    imagekitClient = new ImageKit({
      publicKey: config.imagekitPublicKey || 'mock_public_key',
      privateKey: config.imagekitPrivateKey || 'mock_private_key',
      urlEndpoint: config.imagekitUrlEndpoint || 'https://ik.imagekit.io/mock_endpoint'
    });
  }
  return imagekitClient;
}

// In-memory test spy/mock state for deterministic tests (AGENTS.md rule 4)
let testMock = null;

export function setImageKitMock(mock) {
  testMock = mock;
}

export function getImageKitMock() {
  return testMock;
}

export function clearImageKitMock() {
  testMock = null;
}

/**
 * Upload a private file buffer to ImageKit
 */
export async function uploadPrivateFile({ buffer, originalFilename, folder = '/scopesentry/documents' }) {
  if (testMock?.upload) {
    return testMock.upload({ buffer, originalFilename, folder });
  }

  // AGENTS.md rule 4: Mock ImageKit in automated tests so we never hit external file storage
  if (config.env === 'test' && !process.env.USE_REAL_IMAGEKIT) {
    const fileId = `mock_ik_${crypto.randomUUID()}`;
    return {
      fileId,
      name: originalFilename,
      filePath: `${folder}/${fileId}`,
      url: `https://ik.imagekit.io/mock/${fileId}`
    };
  }

  const client = getImageKitClient();
  const fileExt = originalFilename.includes('.') ? originalFilename.split('.').pop() : 'bin';
  const serverFileName = `${crypto.randomUUID()}.${fileExt}`;

  const response = await client.upload({
    file: buffer.toString('base64'),
    fileName: serverFileName,
    folder,
    isPrivateFile: true,
    useUniqueFileName: true
  });

  return {
    fileId: response.fileId,
    name: response.name,
    filePath: response.filePath,
    url: response.url
  };
}

/**
 * Generate a short-lived authenticated URL for private file access (BR-D5)
 */
export async function getPrivateDownloadUrl(filePath, expireSeconds = 300) {
  if (testMock?.getDownloadUrl) {
    return testMock.getDownloadUrl(filePath, expireSeconds);
  }

  if (config.env === 'test' && !process.env.USE_REAL_IMAGEKIT) {
    return `https://ik.imagekit.io/mock/signed${filePath}?expires=${Date.now() + expireSeconds * 1000}`;
  }

  const client = getImageKitClient();
  const url = client.url({
    path: filePath,
    signed: true,
    expireSeconds
  });

  return url;
}

/**
 * Delete a private file from ImageKit
 */
export async function deletePrivateFile(fileId) {
  if (testMock?.delete) {
    return testMock.delete(fileId);
  }

  if (config.env === 'test' && !process.env.USE_REAL_IMAGEKIT) {
    return { success: true, fileId };
  }

  const client = getImageKitClient();
  await client.deleteFile(fileId);
  return { success: true, fileId };
}
