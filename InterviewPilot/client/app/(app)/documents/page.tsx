'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';
import type {
  CvSummary,
  DocumentResponseDto,
  DocumentType,
  JdSummary,
} from '@interviewpilot/shared';
import {
  deleteDocument,
  fetchDocuments,
  pasteJdDocument,
  uploadDocument,
} from '../../../lib/api';
import { AppShell } from '../../../components/layout/AppShell';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<DocumentType>('CV');
  const [documents, setDocuments] = useState<DocumentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pasted JD form state
  const [pastedText, setPastedText] = useState('');
  const [jdTitle, setJdTitle] = useState('');

  const loadDocs = async () => {
    try {
      setLoading(true);
      const res = await fetchDocuments();
      setDocuments(res.data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const res = await uploadDocument(file, activeTab);
      setSuccess(`Uploaded ${file.name} successfully.`);
      setDocuments((prev) => [res.data.document, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setError(null);
    setSuccess(null);
    setPasting(true);

    try {
      const res = await pasteJdDocument({
        pastedText: pastedText.trim(),
        originalName: jdTitle.trim() || undefined,
      });
      setSuccess('Job description analyzed and saved successfully.');
      setPastedText('');
      setJdTitle('');
      setDocuments((prev) => [res.data.document, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job description');
    } finally {
      setPasting(false);
    }
  };

  const handleDelete = async (id: string, name: string | null) => {
    if (!confirm(`Are you sure you want to delete ${name || 'this document'}?`)) {
      return;
    }

    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSuccess('Document deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const filteredDocs = documents.filter((d) => d.type === activeTab);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Document Repository
          </h1>
          <p className="text-slate-600 mt-1">
            Upload your CV and target Job Descriptions. InterviewPilot extracts verified facts and tailors interview questions specifically to your background.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3 text-emerald-700 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('CV')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'CV'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Curriculum Vitae (CV) ({documents.filter((d) => d.type === 'CV').length}/5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('JD')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'JD'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Job Descriptions (JD) ({documents.filter((d) => d.type === 'JD').length}/5)
          </button>
        </div>

        {/* Upload / Paste Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload Card */}
          <Card className="border-dashed border-2 border-slate-300 hover:border-indigo-500 transition-colors bg-slate-50/50">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Upload {activeTab === 'CV' ? 'Resume / CV' : 'Job Description File'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF or DOCX up to 5 MB. Strictly verified by magic bytes.
                </p>
              </div>

              <div>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="cursor-pointer"
                    disabled={uploading}
                  >
                    {uploading ? 'Analyzing...' : 'Choose File'}
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Pasted JD Form (Only shown on JD tab) */}
          {activeTab === 'JD' ? (
            <Card className="border border-slate-200">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
                  <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                  <span>Or Paste Job Description Text</span>
                </div>
                <form onSubmit={handlePasteSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={jdTitle}
                    onChange={(e) => setJdTitle(e.target.value)}
                    placeholder="Role Title (optional, e.g. Senior Frontend Engineer)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    maxLength={100}
                  />
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste the full job requirements, responsibilities, and qualifications..."
                    rows={4}
                    maxLength={15000}
                    className="w-full text-xs p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {pastedText.length}/15,000 characters
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pasting || pastedText.trim().length < 10}
                    >
                      {pasting ? 'Analyzing...' : 'Analyze JD'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-200 bg-slate-50 flex items-center justify-center p-6 text-center text-slate-500 text-xs">
              <div>
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">CV Privacy Guarantee</p>
                <p className="mt-1">
                  Your CV is stored in private storage, parsed locally, and never shared across users. Chunks are filtered strictly to your own user ID.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Saved {activeTab === 'CV' ? 'Resumes' : 'Job Descriptions'}
          </h2>

          {loading ? (
            <div className="text-sm text-slate-400 py-8 text-center">
              Loading documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
              No {activeTab} documents uploaded yet. Upload one above to unlock tailored interview modes.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const cvSummary = doc.type === 'CV' ? (doc.summary as CvSummary | null) : null;
                const jdSummary = doc.type === 'JD' ? (doc.summary as JdSummary | null) : null;

                return (
                  <Card key={doc.id} className="border border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start sm:items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {doc.type}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-sm">
                                {doc.originalName || 'Untitled Document'}
                              </h3>
                              {doc.status === 'READY' && (
                                <Badge variant="success">
                                  READY
                                </Badge>
                              )}
                              {doc.status === 'PROCESSING' && (
                                <Badge variant="thinking">
                                  <Clock className="w-3 h-3 mr-1 inline" /> PROCESSING
                                </Badge>
                              )}
                              {doc.status === 'FAILED' && (
                                <Badge variant="danger">
                                  FAILED: {doc.failureReason || 'ERROR'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {doc.sourceKind === 'PASTED' ? 'Pasted Text' : doc.mimeType} •{' '}
                              {doc.sizeBytes ? `${Math.round(doc.sizeBytes / 1024)} KB` : ''} •{' '}
                              Added {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id, doc.originalName)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Summary chips */}
                      {doc.status === 'READY' && (
                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          {cvSummary && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="font-semibold text-slate-500">Extracted Skills:</span>
                              {cvSummary.skills.slice(0, 6).map((s, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                  {s}
                                </span>
                              ))}
                              {cvSummary.technologies.slice(0, 4).map((t, idx) => (
                                <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {jdSummary && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="font-semibold text-slate-500">Key Requirements:</span>
                              {jdSummary.requiredSkills.slice(0, 6).map((s, idx) => (
                                <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Next Step Callout */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-indigo-950 text-sm">
              Ready for your interview rehearsal?
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              Choose an interview mode and select your uploaded CV or target JD to begin.
            </p>
          </div>
          <Link href="/interviews/setup" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
              Setup Interview <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
