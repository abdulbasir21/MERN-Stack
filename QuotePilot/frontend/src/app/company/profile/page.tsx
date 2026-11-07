'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { X, Trash2, Upload, Plus } from 'lucide-react';
import { CompanyWorkspaceHeader } from '@/components/company/CompanyWorkspaceHeader';

interface PortfolioItem {
  _id?: string;
  title: string;
  description?: string;
  image: {
    url: string;
    fileId: string;
  };
}

interface CompanyData {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  mainCategory: string;
  status: string;
  portfolio: PortfolioItem[];
  logo?: {
    url: string;
    fileId: string;
  };
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isLoggingOut } = useAuth();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Form Fields
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');

  // Portfolio modal
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [portfolioImageFile, setPortfolioImageFile] = useState<File | null>(null);
  const [portfolioImagePreview, setPortfolioImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggingOut || (typeof window !== 'undefined' && (window as any).__isLoggingOut)) {
      return;
    }
    if (!authLoading && (!user || user.role !== 'company_admin')) {
      router.push('/login');
    }
  }, [user, authLoading, isLoggingOut, router]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ company: CompanyData }>('/company/me');
      const co = res.data.company;
      setCompany(co);
      setName(co.name || '');
      setTagline(co.tagline || '');
      setDescription(co.description || '');
      setCity(co.city || '');
      setContactEmail(co.contactEmail || '');
      setContactPhone(co.contactPhone || '');
      setWebsite(co.website || '');
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setError(e.error?.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'company_admin') {
      loadCompany();
    }
  }, [user]);

  // Upload helper using ImageKit Auth Endpoint
  const uploadToImageKit = async (file: File): Promise<{ url: string; fileId: string }> => {
    const authRes = await api.get<{
      token: string;
      expire: number;
      signature: string;
      publicKey: string;
    }>('/uploads/imagekit-auth');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', `${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
    formData.append('publicKey', authRes.data.publicKey);
    formData.append('signature', authRes.data.signature);
    formData.append('expire', authRes.data.expire.toString());
    formData.append('token', authRes.data.token);

    const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!ikRes.ok) {
      const errData = await ikRes.json().catch(() => ({}));
      throw new Error(errData.message || 'ImageKit upload failed');
    }

    const data = await ikRes.json();
    return { url: data.url, fileId: data.fileId };
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const uploaded = await uploadToImageKit(file);
      await api.patch('/company/me', { logo: uploaded });
      setCompany((prev) => (prev ? { ...prev, logo: uploaded } : prev));
      setSuccessMsg('Logo updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.patch<{ company: CompanyData }>('/company/me', {
        name: name.trim() || undefined,
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
      });
      setCompany(res.data.company);
      setSuccessMsg('Profile changes saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setError(e.error?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioTitle.trim() || !portfolioImageFile) {
      alert('Please provide a portfolio title and select an image.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const uploadedImage = await uploadToImageKit(portfolioImageFile);

      const res = await api.post<{ item: PortfolioItem }>('/company/portfolio', {
        title: portfolioTitle.trim(),
        description: portfolioDescription.trim() || undefined,
        image: uploadedImage,
      });

      setCompany((prev) =>
        prev ? { ...prev, portfolio: [...prev.portfolio, res.data.item] } : prev
      );

      setIsPortfolioModalOpen(false);
      setPortfolioTitle('');
      setPortfolioDescription('');
      setPortfolioImageFile(null);
      setPortfolioImagePreview(null);
      setSuccessMsg('Portfolio item added.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      setError(e.error?.message || e.message || 'Failed to add portfolio item.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePortfolio = async (itemId?: string) => {
    if (!itemId) return;
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      await api.delete(`/company/portfolio/${itemId}`);
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              portfolio: prev.portfolio.filter((item) => item._id !== itemId),
            }
          : prev
      );
      setSuccessMsg('Portfolio item removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      alert(e.error?.message || 'Failed to delete portfolio item.');
    }
  };

  if (authLoading || (loading && !company)) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center p-6">
        <div className="text-stone-500 font-serif animate-pulse text-lg">
          Loading company profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 text-stone-900 pb-16">
      {/* Studio Workspace Unified Header */}
      <CompanyWorkspaceHeader activeTab="profile" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Title */}
        <div className="border-b border-paper-200 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="text-xs font-mono text-stone-500 mb-1">
              <span>Provider Desk</span> &gt;{' '}
              <span className="text-teal-900 font-medium">Profile &amp; Showcase</span>
            </nav>
            <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
              Company Profile &amp; Portfolio Studio
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Manage your commercial identity, public profile details, corporate logo, and verified work portfolio.
            </p>
          </div>

          <Badge variant={company?.status === 'approved' ? 'success' : 'warning'}>
            Status: {company?.status?.toUpperCase()}
          </Badge>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium">
            {successMsg}
          </div>
        )}

        {/* Section 1: Logo & Visual Identity */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-paper-100 border border-paper-300 flex items-center justify-center overflow-hidden shrink-0">
                {company?.logo?.url ? (
                  <img
                    src={company.logo.url}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-serif font-bold text-2xl text-teal-800">
                    {company?.name?.slice(0, 2).toUpperCase() || 'QP'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Company Logo</h3>
                <p className="text-xs text-stone-500 max-w-sm mt-0.5">
                  Uploaded to ImageKit CDN and displayed across marketplace listings and client quote slips.
                </p>
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-paper-300 hover:bg-paper-100 cursor-pointer text-xs font-semibold text-stone-800 transition-colors shadow-xs">
                <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
          </div>
        </Card>

        {/* Section 2: General Profile Details */}
        <Card className="p-6">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b pb-2 border-paper-200">
              Commercial Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Legal / Trading Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="City / Hub"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <Input
              label="Corporate Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Modern Architecture & Industrial Print Design Studio"
              maxLength={120}
            />

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Company Bio / About
              </label>
              <textarea
                rows={4}
                className="w-full p-3 text-sm bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                placeholder="Describe your studio, past experience, and corporate covenants..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Official Website URL"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
              <Input
                label="Contact Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
              <Input
                label="Contact Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@company.com"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" isLoading={saving}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 3: Portfolio Showcase Gallery (Max 20 Items) */}
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3 border-paper-200">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Portfolio Showcase ({company?.portfolio?.length || 0}/20)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Upload verified project case studies to demonstrate capabilities on your marketplace profile.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPortfolioModalOpen(true)}
              disabled={(company?.portfolio?.length || 0) >= 20}
            >
              + Add Portfolio Project
            </Button>
          </div>

          {(!company?.portfolio || company.portfolio.length === 0) ? (
            <div className="py-10 text-center rounded-xl bg-paper-100/50 border border-dashed border-paper-300">
              <p className="text-sm text-stone-500 font-serif">No portfolio items added yet.</p>
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(true)}
                className="mt-2 text-xs font-semibold text-teal-800 hover:underline"
              >
                Add your first project image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {company.portfolio.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="rounded-xl overflow-hidden bg-white border border-paper-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="h-44 bg-paper-100 overflow-hidden relative">
                    <img
                      src={item.image.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 line-clamp-1">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="pt-3 mt-3 border-t border-paper-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeletePortfolio(item._id)}
                        className="text-xs text-stone-400 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Add Portfolio Modal */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-50 w-full max-w-lg rounded-2xl border border-paper-200 shadow-2xl overflow-hidden">
            <div className="p-5 bg-white border-b border-paper-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Add Portfolio Project
              </h3>
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paper-100 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors"
                title="Close modal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddPortfolio} className="p-6 space-y-4">
              <Input
                label="Project Title *"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
                placeholder="e.g. Sustainable Packaging for Citrus Beverage"
                required
              />

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Project Description
                </label>
                <textarea
                  rows={3}
                  className="w-full p-3 text-sm bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  placeholder="Summarize project scope, deliverables, or outcome..."
                  value={portfolioDescription}
                  onChange={(e) => setPortfolioDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Project Image *
                </label>
                <div className="p-4 rounded-xl border border-dashed border-paper-300 bg-white text-center">
                  {portfolioImagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={portfolioImagePreview}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPortfolioImageFile(null);
                          setPortfolioImagePreview(null);
                        }}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <span className="text-xs text-stone-500 block mb-2">
                        Upload high-resolution screenshot or render (.webp, .jpg, .png)
                      </span>
                      <span className="inline-block px-3 py-1.5 rounded-lg bg-paper-100 text-teal-800 text-xs font-medium">
                        Select File
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPortfolioImageFile(file);
                            setPortfolioImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-paper-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={uploading}>
                  Upload &amp; Add to Portfolio
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
