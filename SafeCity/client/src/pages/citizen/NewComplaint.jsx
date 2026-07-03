import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Button from '../../components/Button';

const categories = [
  { value: 'theft', label: 'Theft', icon: 'lock_person', desc: 'Robbery, burglary, shoplifting' },
  { value: 'harassment', label: 'Harassment', icon: 'warning', desc: 'Verbal, physical, or online' },
  { value: 'missing_person', label: 'Missing Person', icon: 'person_search', desc: 'Report a missing individual' },
  { value: 'fraud', label: 'Fraud', icon: 'payments', desc: 'Scams, identity theft, financial fraud' },
  { value: 'other', label: 'Other', icon: 'more_horiz', desc: 'Any other civic safety concern' },
];

export default function NewComplaint() {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(data) {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    try {
      await api.post('/complaints', { ...data, category: selectedCategory, isAnonymous });
      toast.success('Complaint filed successfully');
      navigate('/dashboard/citizen');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to file complaint');
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-gutter justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/citizen')}
              className="text-on-surface-variant hover:text-on-tertiary-container transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-headline-md text-headline-md text-primary">File a Complaint</h2>
          </div>
        </header>

        <main className="flex-1 p-gutter">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-space-xl">

              {/* Category */}
              <div>
                <h3 className="font-headline-md text-headline-md text-primary mb-1">What type of incident?</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Select the category that best fits your complaint.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm">
                  {categories.map(({ value, label, icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedCategory(value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                        ${selectedCategory === value
                          ? 'border-on-tertiary-container bg-tertiary-container/10 text-on-tertiary-container'
                          : 'border-border-subtle bg-surface-container-lowest text-on-surface-variant hover:border-on-tertiary-container hover:text-on-tertiary-container'
                        }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
                      <span className="font-label-md text-label-md">{label}</span>
                      <span className="font-label-sm text-label-sm opacity-70 hidden sm:block">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-space-lg space-y-space-md">
                <h3 className="font-headline-md text-headline-md text-primary">Incident details</h3>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Title</label>
                  <input
                    type="text"
                    {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'Title too short' } })}
                    className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                    placeholder="Brief description of the incident"
                  />
                  {errors.title && <p className="text-error font-label-sm text-label-sm mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Description</label>
                  <textarea
                    rows={5}
                    {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'Please provide more detail (at least 20 characters)' } })}
                    className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm resize-none"
                    placeholder="Describe the incident in detail — what happened, when, who was involved…"
                  />
                  {errors.description && <p className="text-error font-label-sm text-label-sm mt-1">{errors.description.message}</p>}
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Area / Location</label>
                  <input
                    type="text"
                    {...register('area', { required: 'Area is required' })}
                    className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                    placeholder="Neighbourhood, street, or landmark"
                  />
                  {errors.area && <p className="text-error font-label-sm text-label-sm mt-1">{errors.area.message}</p>}
                </div>
              </div>

              {/* Anonymous toggle */}
              <div className="bg-surface-container-low border border-border-subtle rounded-xl p-space-lg">
                <label className="flex items-center gap-space-md cursor-pointer">
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:bg-on-tertiary-container transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">File Anonymously</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      Your identity will not be visible to officers or the public. You can still track this complaint.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-space-md">
                <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/citizen')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit complaint'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
