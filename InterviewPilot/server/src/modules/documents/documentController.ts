import type { Request, Response, NextFunction } from 'express';
import { DocumentTypeEnum } from '@interviewpilot/shared';
import { AppError } from '../../lib/errors.js';
import {
  deleteUserDocument,
  getDocumentContentStream,
  getUserDocumentById,
  listUserDocuments,
  pasteJdDocument,
  uploadUserDocument,
} from './documentService.js';

export async function handleUploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const file = req.file;
    if (!file) {
      throw new AppError('INVALID_FILE', 'No file was provided for upload.', 400);
    }

    const rawType = String(req.body.type || '').toUpperCase();
    const typeParsed = DocumentTypeEnum.safeParse(rawType);
    if (!typeParsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Invalid document type. Allowed types are CV or JD.',
        400
      );
    }

    const document = await uploadUserDocument({
      userId: req.actor.id,
      isDemo: req.actor.isDemo,
      type: typeParsed.data,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    res.status(201).json({
      data: { document },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handlePasteJdDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const document = await pasteJdDocument({
      userId: req.actor.id,
      isDemo: req.actor.isDemo,
      pastedText: req.body.pastedText,
      originalName: req.body.originalName,
    });

    res.status(201).json({
      data: { document },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const queryType = req.query.type ? String(req.query.type).toUpperCase() : undefined;
    const typeFilter = queryType ? DocumentTypeEnum.safeParse(queryType) : undefined;
    const validFilter = typeFilter?.success ? typeFilter.data : undefined;

    const documents = await listUserDocuments(req.actor.id, validFilter);

    res.status(200).json({
      data: { documents },
      meta: { requestId: req.requestId, total: documents.length },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDocumentById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const document = await getUserDocumentById(
      req.actor.id,
      String(req.params.id || ''),
      req.actor.role === 'ADMIN'
    );

    res.status(200).json({
      data: { document },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDocumentContent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const content = await getDocumentContentStream(
      req.actor.id,
      String(req.params.id || ''),
      req.actor.role === 'ADMIN'
    );

    res.setHeader('Content-Type', content.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(content.originalName)}"`
    );
    res.status(200).send(content.buffer);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    await deleteUserDocument(
      req.actor.id,
      String(req.params.id || ''),
      req.actor.role === 'ADMIN'
    );

    res.status(200).json({
      data: { deleted: true },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}
