'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Scale,
  Lock,
  FileCheck,
  Star,
  Building2,
  Coins,
  Clock,
  Award,
  Code2,
  Compass,
  Palette,
  Calculator,
  Megaphone,
  FileText,
  Layers,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Briefcase,
  Zap,
  MousePointerClick,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Navbar } from '@/components/layout/Navbar';
import imageKitAssets from '@/config/imagekit-assets.json';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface CompanySummary {
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Web Development': Code2,
  'Interior Design': Compass,
  'Logo Design': Palette,
  'Accounting': Calculator,
  'Digital Marketing': Megaphone,
  'Content Writing': FileText,
  'Architecture & 3D': Layers,
  'App Development': Smartphone,
};

export default function MarketplaceHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredCompanies, setFeaturedCompanies] = useState<CompanySummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Parallax Scrolling Engine (Multi-plane transforms)
  const { scrollY } = useScroll();
  const heroAura1Y = useTransform(scrollY, [0, 800], [0, 220]);
  const heroAura2Y = useTransform(scrollY, [0, 800], [0, -160]);
  const heroTextY = useTransform(scrollY, [0, 600], [0, -45]);
  const heroCardY = useTransform(scrollY, [0, 600], [0, 90]);
  const heroImgScale = useTransform(scrollY, [0, 600], [1, 1.15]);
  const floatingSealY = useTransform(scrollY, [0, 600], [0, -75]);
  const floatingSealRotate = useTransform(scrollY, [0, 600], [0, 35]);

  // Staggered column parallax for categories
  const colOddY = useTransform(scrollY, [300, 1400], [25, -20]);
  const colEvenY = useTransform(scrollY, [300, 1400], [-15, 35]);
  const statsY = useTransform(scrollY, [100, 500], [35, 0]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    const wakeTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 1500);

    try {
      const [catRes, compRes] = await Promise.all([
        api.get<{ categories: Category[] }>('/categories'),
        api.get<CompanySummary[]>('/companies?limit=6&sort=-ratingAverage'),
      ]);
      setCategories(catRes.data.categories);
      setFeaturedCompanies(compRes.data);
    } catch (err: any) {
      console.error('Failed to load marketplace home data:', err);
      setLoadError(err.message || 'Server waking up took longer than expected.');
    } finally {
      clearTimeout(wakeTimer);
      setIsWakingUp(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/companies?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/companies');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  // Distinct ImageKit asset mapping per company
  const getCompanySceneImage = (comp: CompanySummary) => {
    const category = comp.categories[0] || 'Web Development';
    const assets = imageKitAssets as Record<string, string>;

    if (comp.slug === 'pixel-and-pine-studio') return assets['Web Development'] || assets['pixel-branding.jpg'];
    if (comp.slug === 'hearth-interiors') return assets['hearth-architecture.jpg'] || assets['Interior Design'];
    if (comp.slug === 'archiform-3d-renders') return assets['Architecture & 3D'];
    if (comp.slug === 'monogram-and-co') return assets['Logo Design'];
    if (comp.slug === 'ledgerstone-advisory-audit') return assets['Accounting'];
    if (comp.slug === 'apex-growth-studio') return assets['Digital Marketing'];
    if (comp.slug === 'scribe-and-quill-editorial') return assets['Content Writing'];
    if (comp.slug === 'swiftcraft-mobile-labs') return assets['App Development'];

    return assets[category] || assets['hero-covenant.jpg'];
  };

  return (
    <div className="min-h-screen bg-paper-canvas text-ink-primary selection:bg-brand-teal selection:text-white font-sans overflow-x-hidden">
      {/* Universal Fully Responsive Navigation Bar */}
      <Navbar activeTab="home" />

      {/* Hero Section with Multi-Layer Parallax Background & Depth */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-16 sm:pb-24 border-b border-paper-border bg-gradient-to-b from-[#F7F4EE] via-[#FAF8F4] to-paper-canvas">
        {/* Parallax Floating Ambient Light Spheres */}
        <motion.div
          style={{ y: heroAura1Y }}
          className="absolute -top-24 -right-24 sm:-top-32 sm:-right-32 w-72 sm:w-96 h-72 sm:h-96 bg-brand-teal/15 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          style={{ y: heroAura2Y }}
          className="absolute top-48 -left-24 sm:-left-32 w-64 sm:w-80 h-64 sm:h-80 bg-brand-terracotta/15 rounded-full blur-3xl pointer-events-none"
        />

        {/* Parallax Rotating Geometric Watermark Stamp */}
        <motion.div
          style={{ y: heroAura1Y, rotate: floatingSealRotate }}
          className="absolute -top-10 right-1/4 w-80 h-80 rounded-full border border-brand-teal/10 pointer-events-none hidden lg:flex items-center justify-center text-[10px] font-mono text-brand-teal/20 tracking-widest uppercase select-none"
        >
          <div className="w-64 h-64 rounded-full border border-dashed border-brand-teal/15 flex items-center justify-center">
            <span>• SECP COMMERCIAL ARBITRATION COVENANT •</span>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 7 Columns: Pitch & Search with Parallax Lift */}
            <motion.div
              style={{ y: heroTextY }}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="lg:col-span-7 space-y-5 sm:space-y-6"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal-tint border border-brand-teal/25 text-brand-teal text-xs font-mono shadow-xs">
                <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                <span className="truncate">SECP Arbitrated • Meezan Escrow Facilitated</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-ink-primary tracking-tight leading-[1.12]"
              >
                Commercial Service Quotations. Verified &amp; Binding.
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-sm sm:text-lg text-ink-secondary leading-relaxed max-w-xl font-sans"
              >
                Submit your project brief, receive instant autonomous intake verification, and obtain itemized milestone slips with strict timeline and escrow covenants.
              </motion.p>

              {/* Interactive Search Bar (Fully Responsive) */}
              <motion.form
                variants={itemVariants}
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl border border-paper-border shadow-modal max-w-xl"
              >
                <div className="relative flex-1 flex items-center min-h-[44px]">
                  <Search className="w-5 h-5 text-ink-muted ml-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search studios, disciplines, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none text-ink-primary placeholder:text-ink-muted"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto shrink-0 px-6 font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover flex items-center justify-center gap-2 h-11"
                >
                  <span>Explore Studios</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </motion.form>

              {/* Trust Value Badges with Icons (Responsive Grid on Mobile) */}
              <motion.div
                variants={itemVariants}
                className="pt-2 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-5 text-[11px] sm:text-xs font-mono text-ink-secondary"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0" />
                  <span className="truncate">SECP Covenants</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-teal shrink-0" />
                  <span className="truncate">Gemini Gatekeeper</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-brand-teal shrink-0" />
                  <span className="truncate">Milestone Slips</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-brand-teal shrink-0" />
                  <span className="truncate">Meezan Escrow</span>
                </span>
              </motion.div>
            </motion.div>

            {/* Right 5 Columns: Parallax Hero Slip Visual Card */}
            <motion.div
              style={{ y: heroCardY }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-2xl overflow-hidden border border-paper-border shadow-modal bg-white group">
                <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-stone-900">
                  <motion.img
                    style={{ scale: heroImgScale }}
                    src={(imageKitAssets as Record<string, string>)['hero-covenant.jpg'] || '/images/hero-covenant.jpg'}
                    alt="QuotePilot Milestone Slip and Architecture Workspace"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent" />

                  {/* Floating Live Badge with Opposing Parallax */}
                  <motion.div
                    style={{ y: floatingSealY }}
                    className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-paper-border text-xs font-mono font-bold text-ink-primary shadow-md flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-semantic-success animate-ping" />
                    <span>SECP Tier-1 Certified</span>
                  </motion.div>

                  {/* Floating Parallax Depth Indicator */}
                  <motion.div
                    style={{ y: floatingSealY }}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-teal-300 border border-teal-500/30 flex items-center gap-1.5"
                  >
                    <BadgeCheck className="w-3 h-3 text-teal-400" />
                    <span>Escrow Arbitrated</span>
                  </motion.div>

                  {/* Bottom Image Overlay Card */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-semibold">
                      Standard Milestone Slip
                    </div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                      Arbitrated Commercial Covenants
                    </h3>
                  </div>
                </div>

                {/* Micro Stat Strip beneath image */}
                <div className="p-3.5 sm:p-4 bg-paper-surface flex items-center justify-between border-t border-paper-border text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-ink-secondary">
                    <Clock className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                    <span>&lt;4.5h Average Quote SLA</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-semantic-success font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Meezan Escrow</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* KPI Counters Strip with Parallax Slide */}
      <motion.section style={{ y: statsY }} className="bg-white border-b border-paper-border py-6 sm:py-8 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="space-y-1 p-2">
              <div className="flex items-center justify-center gap-2 text-brand-teal">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-xl sm:text-3xl font-serif font-bold text-ink-primary">240+</span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-ink-muted">SECP Vetted Studios</p>
            </div>
            <div className="space-y-1 p-2">
              <div className="flex items-center justify-center gap-2 text-brand-teal">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-xl sm:text-3xl font-serif font-bold text-ink-primary">PKR 180M+</span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-ink-muted">Covenant Volume</p>
            </div>
            <div className="space-y-1 p-2">
              <div className="flex items-center justify-center gap-2 text-brand-teal">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-xl sm:text-3xl font-serif font-bold text-ink-primary">4.2 Hours</span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-ink-muted">Turnaround SLA</p>
            </div>
            <div className="space-y-1 p-2">
              <div className="flex items-center justify-center gap-2 text-brand-teal">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-xl sm:text-3xl font-serif font-bold text-ink-primary">99.6%</span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-ink-muted">Dispute-Free Sign-Off</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Categories Grid with Staggered Multi-Column Parallax */}
      <section id="categories" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10 border-b border-paper-border pb-4">
          <div>
            <span className="text-xs font-mono text-brand-teal uppercase tracking-wider font-semibold">
              Commercial Disciplines
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-primary mt-1">
              Explore Professional Categories
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Every category is backed by SECP-registered providers and automated milestone covenants.
            </p>
          </div>
          <Link href="/companies" className="text-xs font-mono text-brand-teal hover:underline flex items-center gap-1 font-semibold self-start md:self-auto">
            <span>View All Provider Dockets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Active Cloud Loading / Server Wakeup Indicator Banner */}
        {loading && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-teal-50 border border-teal-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-teal-950">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-600/10 border border-teal-600/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold block text-sm text-teal-950">
                  {isWakingUp ? 'Waking up cloud server on Render...' : 'Connecting to QuotePilot Cloud Registry...'}
                </span>
                <span className="text-teal-800">
                  {isWakingUp
                    ? 'Render free tier spins down when idle. Cold-start spin-up takes ~15–20s on first request.'
                    : 'Fetching SECP-verified commercial disciplines, approved studios, and covenants.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-[11px] text-teal-800 bg-white/80 px-3 py-1.5 rounded-lg border border-teal-200/60 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 border-brand-teal animate-spin" />
              <span>{isWakingUp ? 'Starting Node Engine...' : 'Loading Registry...'}</span>
            </div>
          </div>
        )}

        {/* Server Cold-Start Error Recovery */}
        {loadError && !loading && (
          <div className="mb-6 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
            <h4 className="font-serif font-bold text-base text-amber-950">Server is spinning up</h4>
            <p className="text-xs font-mono text-amber-800 max-w-md mx-auto">
              The free-tier cloud server was asleep and is finishing its wake-up cycle. Click below to refresh the catalog.
            </p>
            <Button variant="primary" size="sm" onClick={loadData} className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover">
              Wake Server &amp; Reload Registry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-paper-border overflow-hidden h-full flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="h-40 sm:h-44 w-full bg-stone-100 flex items-center justify-center relative overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-stone-200 text-xs font-mono text-ink-muted shadow-2xs">
                      <Loader2 className="w-3.5 h-3.5 text-brand-teal animate-spin" />
                      <span>Discipline #{i}...</span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="h-5 bg-stone-200/80 rounded-md w-3/4 animate-pulse" />
                    <div className="h-3.5 bg-stone-100 rounded-md w-full animate-pulse" />
                    <div className="h-3.5 bg-stone-100 rounded-md w-2/3 animate-pulse" />
                  </div>
                </div>
                <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-paper-border flex justify-between items-center bg-stone-50/50">
                  <div className="h-3.5 bg-stone-200/70 rounded-md w-24 animate-pulse" />
                  <div className="h-3.5 bg-stone-200/70 rounded-md w-4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 rounded-2xl border border-paper-border space-y-3">
            <p className="text-xs font-mono text-ink-secondary">
              Unable to load commercial disciplines at this moment.
            </p>
            <Button variant="secondary" size="sm" onClick={loadData} className="font-mono text-xs">
              Retry Connection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat, idx) => {
            const Icon = CATEGORY_ICONS[cat.name] || Briefcase;
            const catImageUrl = (imageKitAssets as Record<string, string>)[cat.name] ||
              'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-web-dev.jpg';

            // Alternating parallax float
            const columnParallax = idx % 2 === 0 ? colOddY : colEvenY;

            return (
              <motion.div
                key={cat.id}
                style={{ y: columnParallax }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="h-full"
              >
                <Link
                  href={`/companies?category=${encodeURIComponent(cat.name)}`}
                  className="rounded-2xl bg-white border border-paper-border hover:border-brand-teal/50 hover:shadow-card transition-all group block h-full overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* ImageKit Visual Header Frame */}
                    <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-stone-100">
                      <img
                        src={catImageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* Floating Category Badge with Lucide Icon */}
                      <div className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-brand-teal shadow-sm group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      
                      {/* Sub-label badge */}
                      <div className="absolute bottom-2.5 left-3 text-[10px] font-mono uppercase tracking-wider text-teal-200 font-semibold drop-shadow-sm">
                        Verified Discipline
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5">
                      <h3 className="font-serif font-bold text-ink-primary text-base sm:text-lg group-hover:text-brand-teal transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-ink-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-paper-border flex items-center justify-between text-xs font-mono text-ink-muted group-hover:text-brand-teal">
                    <span>Verified Covenants</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
          </div>
        )}
      </section>

      {/* Featured Approved Providers: Distinct ImageKit Visual Per Company */}
      <section className="py-14 sm:py-20 bg-white border-y border-paper-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-mono text-brand-teal uppercase tracking-wider font-semibold">
                SECP Verified Studios
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-primary mt-1">
                Featured Approved Companies
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Audited commercial track record with full Meezan Escrow integration.
              </p>
            </div>
            <Link href="/companies">
              <Button variant="secondary" size="sm" className="font-mono text-xs w-full sm:w-auto">
                Explore Full Directory →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-paper-canvas border border-paper-border overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  <div className="h-44 sm:h-48 w-full bg-stone-200/80 flex items-center justify-center relative overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-stone-300 text-xs font-mono text-ink-muted shadow-2xs">
                      <Loader2 className="w-3.5 h-3.5 text-brand-teal animate-spin" />
                      <span>Studio #{i} Loading...</span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="h-6 bg-stone-200/80 rounded-md w-2/3 animate-pulse" />
                      <div className="h-4 bg-stone-100 rounded-md w-full animate-pulse" />
                      <div className="h-4 bg-stone-100 rounded-md w-4/5 animate-pulse" />
                    </div>
                    <div className="pt-3 border-t border-paper-border flex justify-between items-center bg-stone-50/50">
                      <div className="h-4 bg-stone-200/70 rounded-md w-28 animate-pulse" />
                      <div className="h-8 bg-stone-200/70 rounded-lg w-24 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCompanies.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-2xl border border-paper-border space-y-3">
              <p className="text-xs font-mono text-ink-secondary">
                No featured commercial studios available right now.
              </p>
              <Button variant="secondary" size="sm" onClick={loadData} className="font-mono text-xs">
                Retry Connection
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredCompanies.map((comp) => {
              // Completely distinct ImageKit contextual banner per company
              const sceneImage = getCompanySceneImage(comp);

              return (
                <motion.div
                  key={comp.id}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-paper-canvas border border-paper-border overflow-hidden hover:border-brand-teal/40 hover:shadow-card flex flex-col justify-between"
                >
                  {/* Studio Scene Banner with Unique Image */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-stone-900 group">
                    <img
                      src={sceneImage}
                      alt={comp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    
                    <div className="absolute top-3 right-3">
                      <Badge variant="approved">Audited &amp; Active</Badge>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-semibold truncate max-w-[200px]">
                        {comp.city} • {comp.categories[0]}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-lg shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{comp.ratingAverage ? comp.ratingAverage.toFixed(1) : '5.0'}</span>
                        <span className="text-white/60 font-normal">({comp.ratingCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-lg sm:text-xl text-ink-primary">
                        {comp.name}
                      </h3>
                      {comp.tagline && (
                        <p className="text-xs text-ink-secondary italic mt-1 font-sans line-clamp-2">
                          "{comp.tagline}"
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-paper-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {comp.minStartingPrice !== undefined && (
                        <div className="text-xs font-mono">
                          <span className="text-ink-muted block text-[10px] uppercase">Starting Floor:</span>
                          <span className="font-bold text-brand-teal text-sm">
                            PKR {comp.minStartingPrice.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <Link href={`/companies/${comp.slug}`} className="w-full sm:w-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full sm:w-auto font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover"
                        >
                          View Docket &amp; Request Quote →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works (Bilateral Escrow Workflow) */}
      <section id="how-it-works" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2">
          <span className="text-xs font-mono text-brand-teal uppercase tracking-wider font-semibold">
            Institutional Standard
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-primary">
            How QuotePilot Arbitrates Commercial Projects
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Bilateral agreement lifecycle backed by Meezan Bank escrow and SECP arbitration standards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-paper-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal-tint text-brand-teal flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-ink-primary">Intake Verification</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Customer briefs are verified autonomously against the service checklist before transmission.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-paper-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal-tint text-brand-teal flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-ink-primary">In-Inquiry Discussion</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Direct, encrypted bilateral messaging inside the docket to refine technical milestones and deliverables.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-paper-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal-tint text-brand-teal flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-ink-primary">Milestone Covenant</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Providers issue binding milestone quotation slips with explicit deliverables, dates, and amounts.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-paper-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal-tint text-brand-teal flex items-center justify-center font-mono font-bold text-sm">
              04
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-ink-primary">Meezan Escrow Lock</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Funds locked securely in escrow, disbursed only upon verified customer milestone sign-off.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-paper-surface border-t border-paper-border py-12 text-ink-secondary text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-teal text-white flex items-center justify-center font-serif font-bold text-sm">
                Q
              </div>
              <span className="font-serif font-bold text-lg text-ink-primary tracking-tight">
                QuotePilot
              </span>
            </div>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed font-sans">
              QuotePilot is Pakistan's premier institutional marketplace for binding commercial service quotations.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-ink-primary uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-1.5 text-ink-muted">
              <li><Link href="/companies" className="hover:text-brand-teal">Browse Studios</Link></li>
              <li><a href="#categories" className="hover:text-brand-teal">Disciplines</a></li>
              <li><a href="#how-it-works" className="hover:text-brand-teal">Escrow Protocol</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-ink-primary uppercase tracking-wider text-[11px]">Providers</h4>
            <ul className="space-y-1.5 text-ink-muted">
              <li><Link href="/register-company" className="hover:text-brand-teal">Studio Application</Link></li>
              <li><Link href="/login" className="hover:text-brand-teal">Provider Desk</Link></li>
              <li><Link href="/login" className="hover:text-brand-teal">SECP Audit Standards</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-ink-primary uppercase tracking-wider text-[11px]">Legal &amp; Compliance</h4>
            <ul className="space-y-1.5 text-ink-muted">
              <li><span>SECP Arbitration Rules</span></li>
              <li><span>Meezan Escrow Terms</span></li>
              <li><span>Privacy &amp; Data Security</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-paper-border flex flex-col sm:flex-row items-center justify-between gap-4 text-ink-muted text-[11px]">
          <div>© {new Date().getFullYear()} QuotePilot Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>SECP Tier-1 Sandbox</span>
            <span>•</span>
            <span>Meezan Bank Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
