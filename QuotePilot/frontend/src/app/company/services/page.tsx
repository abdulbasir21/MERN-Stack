'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Sparkles, Trash2, X, Plus } from 'lucide-react';
import { CompanyWorkspaceHeader } from '@/components/company/CompanyWorkspaceHeader';

interface ChecklistItem {
  item: string;
  helpText?: string;
  required: boolean;
  order: number;
}

interface Service {
  _id: string;
  id?: string;
  companyId: string;
  title: string;
  category: string;
  description?: string;
  startingPrice?: number;
  pricingUnit?: 'fixed' | 'hourly' | 'starting_at';
  deliveryTimeEstimate?: string;
  requirementsChecklist: ChecklistItem[];
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export default function CompanyServicesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isLoggingOut } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState<string>('');
  const [pricingUnit, setPricingUnit] = useState<'fixed' | 'hourly' | 'starting_at'>('starting_at');
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    if (isLoggingOut || (typeof window !== 'undefined' && (window as any).__isLoggingOut)) {
      return;
    }
    if (!authLoading && (!user || user.role !== 'company_admin')) {
      router.push('/login');
    }
  }, [user, authLoading, isLoggingOut, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [srvRes, catRes] = await Promise.all([
        api.get<{ services: Service[] }>('/company/services'),
        api.get<{ categories: Category[] }>('/categories')
      ]);
      setServices(srvRes.data.services);
      setCategories(catRes.data.categories);
      if (catRes.data.categories.length > 0 && !category) {
        setCategory(catRes.data.categories[0].name);
      }
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setError(e.error?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'company_admin') {
      loadData();
    }
  }, [user]);

  const openCreateModal = () => {
    setEditId(null);
    setTitle('');
    setCategory(categories[0]?.name || 'Web Development');
    setDescription('');
    setStartingPrice('');
    setPricingUnit('starting_at');
    setDeliveryTimeEstimate('7 to 14 Working Days');
    setChecklist([
      { item: 'What the project is and its primary goal', required: true, order: 0 },
      { item: 'Budget range or expected investment', required: true, order: 1 },
      { item: 'Timeline, preferred deadline, or start date', required: true, order: 2 }
    ]);
    setIsEditing(true);
  };

  const openEditModal = (srv: Service) => {
    setEditId(srv._id || srv.id || null);
    setTitle(srv.title);
    setCategory(srv.category);
    setDescription(srv.description || '');
    setStartingPrice(srv.startingPrice !== undefined ? srv.startingPrice.toString() : '');
    setPricingUnit(srv.pricingUnit || 'starting_at');
    setDeliveryTimeEstimate(srv.deliveryTimeEstimate || '');
    setChecklist(srv.requirementsChecklist || []);
    setIsEditing(true);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    if (checklist.length >= 15) {
      alert('Maximum of 15 checklist items allowed.');
      return;
    }
    setChecklist([
      ...checklist,
      {
        item: newChecklistText.trim(),
        required: true,
        order: checklist.length
      }
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleToggleChecklistRequired = (index: number) => {
    setChecklist(
      checklist.map((item, i) => (i === index ? { ...item, required: !item.required } : item))
    );
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category) {
      alert('Please fill in title and category.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        startingPrice: startingPrice ? parseFloat(startingPrice) : undefined,
        pricingUnit,
        deliveryTimeEstimate: deliveryTimeEstimate.trim() || undefined,
        requirementsChecklist: checklist
      };

      if (editId) {
        await api.patch(`/company/services/${editId}`, payload);
        setSuccessMsg('Service updated successfully.');
      } else {
        await api.post('/company/services', payload);
        setSuccessMsg('Service created and published.');
      }

      setIsEditing(false);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setError(e.error?.message || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (srv: Service) => {
    try {
      const srvId = srv._id || srv.id;
      await api.patch(`/company/services/${srvId}`, { isActive: !srv.isActive });
      setServices(
        services.map((s) => ((s._id || s.id) === srvId ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      alert(e.error?.message || 'Failed to update service status');
    }
  };

  const handleDeleteService = async (srv: Service) => {
    const srvId = srv._id || srv.id;
    if (!confirm(`Are you sure you want to delete "${srv.title}"?`)) return;

    try {
      await api.delete(`/company/services/${srvId}`);
      setServices(services.filter((s) => (s._id || s.id) !== srvId));
      setSuccessMsg('Service deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      alert(e.error?.message || 'Failed to delete service. Deactivate instead if inquiries exist.');
    }
  };

  const activeCount = services.filter((s) => s.isActive).length;
  const pausedCount = services.length - activeCount;
  const totalRules = services.reduce((acc, s) => acc + (s.requirementsChecklist?.length || 0), 0);

  if (authLoading || (loading && services.length === 0)) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center p-6">
        <div className="text-stone-500 font-serif animate-pulse text-lg">Loading services catalog...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 text-stone-900 pb-16">
      {/* Studio Workspace Unified Header */}
      <CompanyWorkspaceHeader activeTab="services" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header Zone */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-paper-200">
          <div>
            <nav className="text-xs font-mono text-stone-500 mb-1">
              <span>Provider Desk</span> &gt; <span className="text-teal-900 font-medium">Services &amp; Requirements</span>
            </nav>
            <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
              Services &amp; Intake Rules Catalog
            </h1>
            <p className="text-sm text-stone-600 max-w-3xl mt-1">
              Configure services, starting floor pricing, and intake requirements checklists verified by the QuotePilot assistant before RFQs reach your desk.
            </p>
          </div>

          <Button variant="primary" onClick={openCreateModal}>
            + Add New Service
          </Button>
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

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-xs font-mono text-stone-500 block mb-1">Total Services</span>
            <div className="text-2xl font-serif font-bold text-stone-900">{services.length}</div>
            <span className="text-xs text-stone-500">in company catalog</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-mono text-teal-700 block mb-1 font-semibold">Active Intake</span>
            <div className="text-2xl font-serif font-bold text-teal-800">{activeCount}</div>
            <span className="text-xs text-teal-700">accepting RFQ inquiries</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-mono text-stone-500 block mb-1">Paused Intake</span>
            <div className="text-2xl font-serif font-bold text-stone-500">{pausedCount}</div>
            <span className="text-xs text-stone-500">paused / draft</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-mono text-stone-500 block mb-1">Intake Rules Active</span>
            <div className="text-2xl font-serif font-bold text-stone-900">{totalRules}</div>
            <span className="text-xs text-stone-500">checklist checkpoints</span>
          </Card>
        </div>

        {/* Services List */}
        {services.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-paper-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 shadow-xs mb-3">
              <Sparkles className="w-7 h-7 text-teal-800" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-800">No Services Published Yet</h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-4">
              Add your first service with requirements checklist to start receiving structured quote requests from prospective clients.
            </p>
            <Button variant="primary" onClick={openCreateModal}>
              Create First Service
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((srv) => (
              <div
                key={srv._id || srv.id}
                className="p-5 rounded-xl bg-white border border-paper-200 hover:border-paper-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-stone-900">{srv.title}</h3>
                    <Badge variant={srv.isActive ? 'success' : 'neutral'}>
                      {srv.isActive ? 'Active Intake' : 'Paused'}
                    </Badge>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-paper-100 text-stone-600 border border-paper-200">
                      {srv.category}
                    </span>
                  </div>

                  {srv.description && (
                    <p className="text-sm text-stone-600 line-clamp-2 max-w-2xl">{srv.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                    {srv.startingPrice !== undefined && (
                      <span className="font-medium text-teal-900 font-mono">
                        Floor: PKR {srv.startingPrice.toLocaleString()} ({srv.pricingUnit || 'starting_at'})
                      </span>
                    )}
                    {srv.deliveryTimeEstimate && (
                      <span>Turnaround: {srv.deliveryTimeEstimate}</span>
                    )}
                    <span className="font-mono bg-paper-100 px-1.5 py-0.5 rounded text-stone-700">
                      {srv.requirementsChecklist?.length || 0} checklist gates
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(srv)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      srv.isActive
                        ? 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        : 'border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100'
                    }`}
                  >
                    {srv.isActive ? 'Pause' : 'Activate'}
                  </button>

                  <Button variant="secondary" onClick={() => openEditModal(srv)}>
                    Edit &amp; Rules
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDeleteService(srv)}
                    className="p-2 text-stone-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Service Editor & Intake Requirements Builder Modal (Stitch Screen 01) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-paper-50 w-full max-w-4xl rounded-2xl border border-paper-200 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-white border-b border-paper-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-teal-800 font-semibold">
                  Intake Requirements &amp; Service Studio
                </span>
                <h2 className="text-2xl font-serif font-bold text-stone-900">
                  {editId ? 'Edit Service & AI Intake Gates' : 'New Service Specification'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 rounded-full bg-paper-100 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: General Info */}
                <div className="space-y-4">
                  <h3 className="font-serif font-bold text-base text-stone-900 border-b pb-2 border-paper-200">
                    1. Service Specifications
                  </h3>

                  <Input
                    label="Service Title *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Retail Box Packaging & 3D Dye-lines"
                    required
                  />

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Service Category *
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full p-3 text-sm bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                      placeholder="Explain what is included and client deliverables..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={2000}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Baseline Starting Price (PKR)"
                      type="number"
                      min={0}
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      placeholder="e.g. 40000"
                    />

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Pricing Structure
                      </label>
                      <select
                        className="w-full h-10 px-3 text-sm bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                        value={pricingUnit}
                        onChange={(e) =>
                          setPricingUnit(e.target.value as 'fixed' | 'hourly' | 'starting_at')
                        }
                      >
                        <option value="starting_at">Starting At</option>
                        <option value="fixed">Fixed Scope</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Turnaround SLA"
                    value={deliveryTimeEstimate}
                    onChange={(e) => setDeliveryTimeEstimate(e.target.value)}
                    placeholder="e.g. 10 to 14 Working Days"
                  />
                </div>

                {/* Right Column: AI Intake Requirements Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-paper-200">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      2. Intake Verification Checklist ({checklist.length}/15)
                    </h3>
                    <span className="text-[11px] font-mono bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                      Audited by AI
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    The assistant audits incoming client briefs against these checklist gates before they reach your commercial desk.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-paper-200 flex items-start justify-between gap-2 shadow-xs"
                      >
                        <div className="flex-1 text-xs">
                          <div className="font-medium text-stone-900 flex items-center gap-1.5">
                            <span className="font-mono text-stone-400">{idx + 1}.</span>
                            <span>{item.item}</span>
                          </div>
                          {item.helpText && (
                            <p className="text-stone-500 text-[11px] mt-0.5 pl-4">{item.helpText}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklistRequired(idx)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              item.required
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-paper-100 text-stone-600 border-paper-200'
                            }`}
                          >
                            {item.required ? 'Mandatory' : 'Optional'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(idx)}
                            className="text-stone-400 hover:text-red-700 text-sm px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors"
                            title="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {checklist.length < 15 && (
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        className="flex-1 h-9 px-3 text-xs bg-white border border-paper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                        placeholder="Add required gate (e.g. Dimensions in mm)..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChecklistItem();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddChecklistItem}
                      >
                        + Add Rule
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-paper-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={saving}>
                  {editId ? 'Update Service' : 'Publish & Activate Intake'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
