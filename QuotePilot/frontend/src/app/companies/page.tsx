'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Building2,
  MapPin,
  Layers,
  ArrowRight,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Navbar } from '@/components/layout/Navbar';
import imageKitAssets from '@/config/imagekit-assets.json';

interface CompanyListItem {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  city: string;
  categories: string[];
  ratingAverage: number;
  ratingCount: number;
  minStartingPrice?: number;
  logo?: {
    url: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function CompaniesDirectoryContent() {
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get<{ categories: Category[] }>('/categories');
        setCategories(res.data.categories);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCategories();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    setLoadError(null);
    const wakeTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 1500);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCity) params.set('city', selectedCity);
      if (sortBy) params.set('sort', sortBy);

      const res = await api.get<CompanyListItem[]>(`/companies?${params.toString()}`);
      setCompanies(res.data);
      setTotal(res.meta?.total || res.data.length);
    } catch (err: any) {
      console.error('Failed to search companies', err);
      setLoadError(err.message || 'Unable to connect to registry.');
    } finally {
      clearTimeout(wakeTimer);
      setIsWakingUp(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [selectedCategory, selectedCity, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCompanies();
  };

  return (
    <div className="min-h-screen bg-paper-canvas text-ink-primary pb-20 font-sans">
      {/* Universal Fully Responsive Navigation Bar */}
      <Navbar activeTab="companies" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Title Zone */}
        <div className="pb-6 border-b border-paper-border flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="text-xs font-mono text-ink-muted mb-1 flex items-center gap-1.5">
              <Link href="/" className="hover:text-brand-teal">Marketplace</Link>
              <span>›</span>
              <span className="text-brand-teal font-medium">Approved Providers</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink-primary tracking-tight">
              Find Verified Commercial Firms
            </h1>
            <p className="text-sm text-ink-secondary mt-1">
              Direct quotation covenants, SECP arbitration standards, and transparent milestone breakdown.
            </p>
          </div>

          <span className="text-xs font-mono px-3.5 py-1.5 rounded-lg bg-white border border-paper-border text-ink-secondary flex items-center gap-2 shadow-xs">
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-brand-teal animate-spin" />
                <span>Querying Verified Registry...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                <span>{total} Verified {total === 1 ? 'Firm' : 'Firms'} Listed</span>
              </>
            )}
          </span>
        </div>

        {/* Filter Bar with Lucide Icons */}
        <div className="py-6 flex flex-col lg:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="w-full lg:w-96 flex gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by company, service, or discipline..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal placeholder:text-ink-muted"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="font-mono text-xs">
              Search
            </Button>
          </form>

          <div className="w-full lg:w-auto flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 text-xs bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer font-mono text-ink-primary"
            >
              <option value="">All Disciplines</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* City Dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-10 px-3 text-xs bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer font-mono text-ink-primary"
            >
              <option value="">All Jurisdictions</option>
              <option value="Islamabad">Islamabad</option>
              <option value="Lahore">Lahore</option>
              <option value="Karachi">Karachi</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 text-xs bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer font-mono text-ink-primary"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="-ratingAverage">Sort: Highest Rated</option>
              <option value="-createdAt">Sort: Newly Approved</option>
              <option value="priceAsc">Sort: Starting Floor (Low-High)</option>
            </select>
          </div>
        </div>

        {/* Active Cloud Loading / Server Wakeup Indicator Banner */}
        {loading && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-teal-50 border border-teal-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-600/10 border border-teal-600/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-teal-950">
                    {isWakingUp ? 'Waking Up Cloud Server on Render...' : 'Connecting to Verified Providers Registry...'}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-200/70 text-teal-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs font-mono text-teal-800 mt-0.5">
                  {isWakingUp
                    ? 'Free-tier cloud backend spins down after inactivity. Cold-start spin-up takes ~15–20s on first load.'
                    : 'Querying SECP-registered commercial studios, covenants, and live starting floors.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-teal-800 shrink-0 self-end md:self-auto bg-white/80 px-3 py-1.5 rounded-lg border border-teal-200/60 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
              <span>{isWakingUp ? 'Spinning Up Node.js...' : 'Fetching Records...'}</span>
            </div>
          </div>
        )}

        {/* Server Cold-Start Error Recovery Card */}
        {loadError && !loading && (
          <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-3 mb-6">
            <h3 className="text-lg font-serif font-bold text-amber-950">Cloud Backend is Awakening</h3>
            <p className="text-xs font-mono text-amber-800 max-w-md mx-auto">
              The free-tier server was sleeping and is completing its initial wake-up. Click below to reload all verified companies.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={loadCompanies}
              className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover"
            >
              Wake Server &amp; Reload Registry
            </Button>
          </div>
        )}

        {/* Results Grid with Framer Motion Lift */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="overflow-hidden flex flex-col justify-between h-72 border border-paper-border bg-white rounded-2xl relative shadow-xs"
              >
                <div className="h-32 bg-stone-100 flex items-center justify-center relative overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-stone-200 text-xs font-mono text-ink-muted shadow-2xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                    <span>Loading Firm #{i}...</span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-stone-200/80 rounded w-2/3 animate-pulse" />
                  <div className="h-3.5 bg-stone-100 rounded w-full animate-pulse" />
                  <div className="h-3.5 bg-stone-100 rounded w-4/5 animate-pulse" />
                </div>
                <div className="p-4 border-t border-paper-border flex justify-between items-center bg-stone-50/50">
                  <div className="h-3.5 bg-stone-200/70 rounded w-24 animate-pulse" />
                  <div className="h-3.5 bg-stone-200/70 rounded w-16 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-paper-border space-y-3">
            <h3 className="text-lg font-serif font-bold text-ink-primary">No matching firms found</h3>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              Try broadening your category or jurisdiction filter to view all accredited providers.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedCity('');
              }}
              className="font-mono text-xs"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((co, idx) => {
              const previewImg =
                (imageKitAssets as Record<string, string>)[co.categories[0]] ||
                co.logo?.url ||
                (imageKitAssets as Record<string, string>)[co.slug.includes('hearth') ? 'hearth-architecture.jpg' : 'pixel-branding.jpg'];

              return (
                <motion.div
                  key={co.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="overflow-hidden flex flex-col justify-between h-full hover:shadow-paper transition-all border-paper-border bg-white">
                    <div>
                      {/* Top Scene Preview Ribbon */}
                      <div className="relative h-32 w-full overflow-hidden bg-stone-900 group">
                        <img
                          src={previewImg}
                          alt={co.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-2 right-2">
                          <Badge variant="approved">SECP Audited</Badge>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-serif font-bold text-lg text-ink-primary">{co.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-ink-muted mt-0.5">
                              <MapPin className="w-3 h-3 text-brand-teal" />
                              <span>{co.city}</span>
                              <span>•</span>
                              <span>{co.categories[0]}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{co.ratingAverage.toFixed(1)}</span>
                          </div>
                        </div>

                        {co.tagline && (
                          <p className="text-xs text-ink-secondary line-clamp-2 mt-2 leading-relaxed font-sans">
                            {co.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="pt-4 border-t border-paper-border flex items-center justify-between">
                        <div>
                          {co.minStartingPrice !== undefined && (
                            <div>
                              <span className="text-[10px] text-ink-muted block uppercase font-mono">
                                Starting Floor
                              </span>
                              <span className="font-mono text-xs font-bold text-brand-teal">
                                PKR {co.minStartingPrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <Link href={`/companies/${co.slug}`}>
                          <Button variant="primary" size="sm" className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover flex items-center gap-1.5">
                            <span>Request Quote</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CompaniesDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-serif text-stone-500">Loading directory...</div>}>
      <CompaniesDirectoryContent />
    </Suspense>
  );
}
