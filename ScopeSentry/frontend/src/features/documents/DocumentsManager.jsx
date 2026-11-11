import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';

const CATEGORY_CONFIG = {
  original_contract: { label: 'Original Contract', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  original_specification: { label: 'Original Specification', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  revised_specification: { label: 'Revised Specification', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  change_request: { label: 'Change Request', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  meeting_notes: { label: 'Meeting Notes', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  supporting_document: { label: 'Supporting Document', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

export default function DocumentsManager({ projectId, isArchived }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('original_specification');

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Delete modal state
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/projects/${projectId}/documents`);
      setDocuments(res?.data?.documents || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext || '')) {
      setUploadError('Invalid file type. Only PDF and DOCX files are supported.');
      setSelectedFile(null);
      return;
    }

    // 10MB limit check
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF or DOCX file to upload');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', category);

    try {
      await apiClient(`/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData
      });
      setIsUploadOpen(false);
      setSelectedFile(null);
      setCategory('original_specification');
      fetchDocuments();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await apiClient(`/documents/${doc.id}/download`);
      if (res?.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await apiClient(`/documents/${docToDelete.id}`, { method: 'DELETE' });
      setDocToDelete(null);
      fetchDocuments();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete document');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-headline text-primary tracking-tight">Project Documents</h2>
          <p className="text-xs text-secondary mt-0.5">
            PDF and DOCX contract specifications, architectural revisions, and addenda.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          disabled={isArchived}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface rounded-xl border border-border p-4 animate-pulse flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="font-headline font-bold text-sm text-primary">No Documents Uploaded</h3>
          <p className="text-xs text-secondary">
            Upload original baseline contracts and revised addenda to enable AI comparison and cost detection.
          </p>
          {!isArchived && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Now</span>
            </button>
          )}
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/75 text-secondary font-semibold">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pages / Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => {
                  const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.supporting_document;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-primary">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-primary-container shrink-0" />
                          <span className="truncate max-w-xs">{doc.originalFilename}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {doc.processingStatus === 'ready' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Ready
                          </span>
                        )}
                        {['pending', 'extracting', 'indexing'].includes(doc.processingStatus) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Processing
                          </span>
                        )}
                        {doc.processingStatus === 'failed' && (
                          <span
                            title={doc.failureReason || 'Extraction failed'}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded cursor-help"
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {doc.failureReason === 'no_extractable_text' ? 'Scanned (No Text)' : 'Failed'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-secondary font-mono text-[11px]">
                        <span>{doc.pageCount ? `${doc.pageCount} pgs` : '—'}</span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {doc.extractedText && (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview Extracted Text"
                              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDownload(doc)}
                            title="Download Original File"
                            className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDocToDelete(doc);
                            }}
                            title="Delete Document"
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary-container" />
                <h3 className="font-headline font-bold text-base text-primary">Upload Document</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Document Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                >
                  <option value="original_specification">Original Specification</option>
                  <option value="revised_specification">Revised Specification</option>
                  <option value="original_contract">Original Contract</option>
                  <option value="change_request">Change Request</option>
                  <option value="meeting_notes">Meeting Notes</option>
                  <option value="supporting_document">Supporting Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Select File (PDF or DOCX, max 10MB) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="w-full text-xs text-secondary file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-container/10 file:text-primary-container hover:file:bg-primary-container/20 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Uploading...</span>
                    </>
                  ) : (
                    <span>Upload</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extracted Text Preview Modal (BR-D8: Safe Plain Text) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-container" />
                <div>
                  <h3 className="font-headline font-bold text-sm text-primary truncate max-w-md">
                    {previewDoc.originalFilename}
                  </h3>
                  <span className="text-[10px] font-mono text-secondary">
                    {previewDoc.pageCount || 1} Pages • Extracted Plain Text
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-primary leading-relaxed bg-slate-50/50 whitespace-pre-wrap select-text">
              {previewDoc.extractedText || 'No text extracted.'}
            </div>

            <div className="px-6 py-3 border-t border-border bg-surface flex justify-between items-center text-[11px] text-secondary">
              <span>Untrusted document data (isolated text rendering)</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-primary font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal (BR-D7) */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-headline font-bold text-base text-primary">Delete Document?</h3>
              <p className="text-xs text-secondary">
                Are you sure you want to delete <strong className="text-primary">{docToDelete.originalFilename}</strong>?
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-[11px] text-secondary text-center">
              This will remove the file from private cloud storage and drop all associated text chunks.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setDocToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
