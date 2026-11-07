'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Globe,
  Star,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Briefcase,
  Mail,
  Phone,
  Layers,
  FileCheck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Navbar } from '@/components/layout/Navbar';
import imageKitAssets from '@/config/imagekit-assets.json';

interface PortfolioItem {
  _id?: string;
  title: string;
  description?: string;
  image: {
    url: string;
    fileId: string;
  };
}

interface CompanyDetail {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  mainCategory: string;
  portfolio: PortfolioItem[];
  ratingAverage: number;
  ratingCount: number;
  verified: boolean;
  logo?: {
    url: string;
  };
}

interface PublicService {
  id: string;
  title: string;
  category: string;
  description?: string;
  startingPrice?: number;
  pricingUnit?: string;
  deliveryTimeEstimate?: string;
}

interface PublicReview {
  id: string;
  rating: number;
  comment?: string;
  reviewerDisplayName: string;
  createdAt: string;
}

export default function PublicCompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'reviews'>('services');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected portfolio modal preview
  const [previewImage, setPreviewImage] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const [compRes, srvRes, revRes] = await Promise.all([
          api.get<{ company: CompanyDetail }>(`/companies/${slug}`),
          api.get<{ services: PublicService[] }>(`/companies/${slug}/services`),
          api.get<{ reviews: PublicReview[] }>(`/companies/${slug}/reviews`).catch(() => ({ data: { reviews: [] } })),
        ]);
        setCompany(compRes.data.company);
        setServices(srvRes.data.services);
        setReviews(revRes.data?.reviews || []);
      } catch (err: unknown) {
        const e = err as { error?: { message?: string } };
        setError(e.error?.message || 'Company not found or currently inactive.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProfile();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-canvas flex items-center justify-center p-6">
        <div className="text-ink-secondary font-serif animate-pulse text-lg flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          <span>Loading verified company docket &amp; quotation catalog...</span>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-paper-canvas flex flex-col items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-semantic-error-tint text-semantic-error flex items-center justify-center">
            <X className="w-6 h-6 text-semantic-error" />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-primary">Provider Not Found</h2>
          <p className="text-xs text-ink-muted">{error || 'This company profile is not active in the registry.'}</p>
          <Link href="/companies">
            <Button variant="secondary" size="sm" className="font-mono text-xs">
              Browse All Approved Providers
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const coverImage =
    (imageKitAssets as Record<string, string>)[company.mainCategory] ||
    (imageKitAssets as Record<string, string>)[slug.includes('hearth') || company.mainCategory.includes('Interior') ? 'hearth-architecture.jpg' : 'pixel-branding.jpg'] ||
    '/images/pixel-branding.jpg';

  return (
    <div className="min-h-screen bg-paper-canvas text-ink-primary pb-20 font-sans">
      {/* Universal Fully Responsive Navigation Bar */}
      <Navbar activeTab="companies" />

      {/* Hero Studio Scenic Banner */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-stone-900">
        <img
          src={coverImage}
          alt={company.name}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        <div className="absolute top-4 right-4">
          <Badge variant="approved" className="shadow-md">
            SECP Arbitration Standard
          </Badge>
        </div>
      </div>

      {/* Studio Header Card (Floating over Banner) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <Card className="p-6 sm:p-8 bg-white border border-paper-border shadow-modal">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-paper-sunken border border-paper-border flex items-center justify-center font-serif font-bold text-3xl text-brand-teal overflow-hidden shrink-0 shadow-sm">
                {company.logo?.url ? (
                  <img src={company.logo.url} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  company.name.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-primary tracking-tight">
                    {company.name}
                  </h1>
                  <Badge variant="approved">Verified Provider</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{company.city}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{company.mainCategory}</span>
                  </span>
                  {company.website && (
                    <>
                      <span>•</span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-teal hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{company.website.replace(/^https?:\/\//, '')}</span>
                      </a>
                    </>
                  )}
                </div>

                {company.tagline && (
                  <p className="text-xs sm:text-sm text-ink-secondary italic pt-0.5 font-sans">
                    "{company.tagline}"
                  </p>
                )}
              </div>
            </div>

            {/* Escrow & Reputation Box */}
            <div className="rounded-xl p-4 flex items-center gap-5 border border-paper-border bg-paper-sunken/60 shrink-0">
              <div className="text-center pr-4 border-r border-paper-border">
                <div className="flex items-center gap-1 text-2xl font-serif font-bold text-amber-900 font-mono">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  <span>{company.ratingAverage.toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-ink-muted font-mono uppercase">
                  {company.ratingCount} Verified Reviews
                </span>
              </div>

              <div className="text-xs space-y-0.5 text-ink-secondary font-mono">
                <div className="font-semibold text-brand-teal flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Meezan Escrow Protected</span>
                </div>
                <div className="text-ink-muted text-[11px]">Audited Commercial Covenants</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 Cols): About & Portfolio Showcase */}
          <div className="lg:col-span-5 space-y-6">
            {/* About Studio */}
            <Card className="p-6 space-y-3">
              <h3 className="font-serif font-bold text-lg text-ink-primary border-b pb-2 border-paper-border">
                About the Studio
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line font-sans">
                {company.description ||
                  'Specialized commercial firm executing institutional project deliverables under strict timeline, scope, and payment covenants.'}
              </p>

              {(company.contactEmail || company.contactPhone) && (
                <div className="pt-3 border-t border-paper-border space-y-1.5 text-xs text-ink-muted font-mono">
                  {company.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-brand-teal" />
                      <span>{company.contactEmail}</span>
                    </div>
                  )}
                  {company.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-brand-teal" />
                      <span>{company.contactPhone}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Verified Portfolio Showcase */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-paper-border">
                <h3 className="font-serif font-bold text-lg text-ink-primary">
                  Verified Portfolio ({company.portfolio?.length || 0})
                </h3>
                <span className="text-[10px] font-mono text-brand-teal bg-brand-teal-tint px-2 py-0.5 rounded font-semibold">
                  ImageKit CDN
                </span>
              </div>

              {(!company.portfolio || company.portfolio.length === 0) ? (
                <p className="text-xs text-ink-muted italic py-4 text-center font-mono">
                  No portfolio items uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {company.portfolio.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      onClick={() => setPreviewImage(item)}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-paper-border bg-paper-sunken relative hover:border-brand-teal/50 transition-all shadow-2xs"
                    >
                      <div className="h-28 overflow-hidden bg-stone-900">
                        <img
                          src={item.image.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <h4 className="font-serif font-bold text-xs text-ink-primary truncate">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (7 Cols): Active Services Catalog & Verified Reviews */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tab Controls */}
            <div className="flex items-center gap-6 border-b border-paper-border">
              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`pb-3 text-sm font-serif font-bold transition-colors relative flex items-center gap-2 ${
                  activeTab === 'services'
                    ? 'text-brand-teal border-b-2 border-brand-teal -mb-px'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Services &amp; Checklists ({services.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 text-sm font-serif font-bold transition-colors relative flex items-center gap-2 ${
                  activeTab === 'reviews'
                    ? 'text-brand-teal border-b-2 border-brand-teal -mb-px'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>Verified Client Reviews</span>
                <span className="text-xs font-mono font-normal bg-paper-sunken px-2 py-0.5 rounded-full text-ink-secondary">
                  {reviews.length}
                </span>
              </button>
            </div>

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted font-mono">
                  Select a service below to initiate intake audit verification.
                </p>

                {services.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-paper-border">
                    <p className="text-sm font-serif text-ink-secondary">
                      This studio has not published active services yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((srv) => (
                      <Card
                        key={srv.id}
                        className="p-6 hover:shadow-paper transition-all flex flex-col justify-between border-paper-border"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-serif font-bold text-lg text-ink-primary">
                              {srv.title}
                            </h3>
                            <Badge variant="neutral">{srv.category}</Badge>
                          </div>

                          {srv.description && (
                            <p className="text-xs text-ink-secondary leading-relaxed font-sans">
                              {srv.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted pt-1">
                            {srv.startingPrice !== undefined && (
                              <span className="font-bold text-brand-teal">
                                Floor: PKR {srv.startingPrice.toLocaleString()} ({srv.pricingUnit || 'starting_at'})
                              </span>
                            )}
                            {srv.deliveryTimeEstimate && (
                              <span>Turnaround SLA: {srv.deliveryTimeEstimate}</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-paper-border flex items-center justify-between">
                          <div className="text-[11px] text-ink-muted font-mono flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                            <span>Includes AI Intake Brief Verification</span>
                          </div>

                          <Link href={`/inquire?serviceId=${srv.id}&companySlug=${company.slug}`}>
                            <Button variant="primary" size="sm" className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover flex items-center gap-1.5">
                              <span>Request Quotation</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* Aggregate Summary */}
                <Card className="p-6 bg-paper-sunken/60 border border-paper-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand-teal font-bold block">
                      Audited Institutional Reputation
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-4xl font-serif font-bold text-ink-primary">
                        {company.ratingAverage ? company.ratingAverage.toFixed(1) : '5.0'}
                      </span>
                      <div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= Math.round(company.ratingAverage || 5) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-mono text-ink-muted">
                          Based on {reviews.length} verified completed covenant(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-ink-muted hidden sm:block">
                    <span className="font-semibold text-brand-teal">BR-14 Audited</span>
                    <div>Reviews locked to accepted quotations</div>
                  </div>
                </Card>

                {reviews.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-paper-border space-y-2">
                    <p className="text-sm font-serif text-ink-primary">No public reviews published yet.</p>
                    <p className="text-xs text-ink-muted font-mono">
                      Reviews appear here once clients accept and execute formal quotation covenants.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <Card key={rev.id} className="p-5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-paper-border">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-mono text-xs font-bold">
                              {rev.reviewerDisplayName?.slice(0, 1) || 'C'}
                            </div>
                            <div>
                              <span className="font-serif font-bold text-sm text-ink-primary block">
                                {rev.reviewerDisplayName}
                              </span>
                              <span className="text-[10px] font-mono text-brand-teal flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified Client Sign-Off</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${star <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-mono text-ink-muted">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {rev.comment && (
                          <p className="text-xs text-ink-secondary font-sans leading-relaxed italic pl-10">
                            "{rev.comment}"
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Portfolio Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-paper-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-96 bg-black flex items-center justify-center">
              <img
                src={previewImage.image.url}
                alt={previewImage.title}
                className="max-h-96 w-full object-contain"
              />
            </div>
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink-primary">{previewImage.title}</h3>
                {previewImage.description && (
                  <p className="text-xs text-ink-secondary mt-1">{previewImage.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-paper-sunken text-ink-muted hover:text-ink-primary flex items-center justify-center transition-colors"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
