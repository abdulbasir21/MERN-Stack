import { Request, Response } from 'express';
import ImageKit from 'imagekit';
import { env } from '../../config/env';
import { sendSuccess, sendBadRequest, sendInternalError } from '../../utils/response';

let imagekitInstance: ImageKit | null = null;

export function getImageKitInstance(): ImageKit {
  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT
    });
  }
  return imagekitInstance;
}

export class UploadController {
  static getAuthParams = (_req: Request, res: Response): void => {
    const ik = getImageKitInstance();
    const authParams = ik.getAuthenticationParameters();

    sendSuccess(res, {
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT
    });
  };

  static uploadDirect = async (req: Request, res: Response): Promise<void> => {
    try {
      const { file, fileName, folder } = req.body;
      if (!file || !fileName) {
        sendBadRequest(res, 'file and fileName are required');
        return;
      }

      const ik = getImageKitInstance();
      const result = await ik.upload({
        file,
        fileName,
        folder: folder || '/quotepilot/uploads',
        useUniqueFileName: true
      });

      sendSuccess(res, {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        fileType: result.fileType
      }, 201);
    } catch (err: any) {
      console.error('ImageKit upload error:', err);
      sendInternalError(res, err.message || 'Image upload failed');
    }
  };
}
