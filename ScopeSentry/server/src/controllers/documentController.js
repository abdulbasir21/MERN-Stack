import {
  uploadDocument,
  listDocuments,
  getDocumentById,
  getDocumentDownloadUrl,
  deleteDocument,
  reprocessDocument
} from '../services/documentService.js';

export async function handleUploadDocument(req, res, next) {
  try {
    const { category, simulateDbFailure } = req.body;
    const document = await uploadDocument(req.user.id, req.params.projectId, {
      file: req.file,
      category,
      simulateDbFailure: simulateDbFailure === 'true' || simulateDbFailure === true
    });
    res.status(201).json({
      data: { document }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListDocuments(req, res, next) {
  try {
    const documents = await listDocuments(req.user.id, req.params.projectId, req.query);
    res.status(200).json({
      data: { documents }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDocument(req, res, next) {
  try {
    const document = await getDocumentById(req.user.id, req.params.id);
    res.status(200).json({
      data: { document }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDownloadDocument(req, res, next) {
  try {
    const result = await getDocumentDownloadUrl(req.user.id, req.params.id);
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteDocument(req, res, next) {
  try {
    const result = await deleteDocument(req.user.id, req.params.id);
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleReprocessDocument(req, res, next) {
  try {
    const document = await reprocessDocument(req.user.id, req.params.id, req.file?.buffer);
    res.status(200).json({
      data: { document }
    });
  } catch (err) {
    next(err);
  }
}
