'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  OnboardingInputSchema,
  type ExperienceLevel,
  type InterviewCategory,
  type UserStatusType,
} from '@interviewpilot/shared';
import { AlertCircle, Sparkles } from 'lucide-react';
import { completeOnboarding, skipOnboarding, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORIES: InterviewCategory[] = ['TECHNICAL', 'HR', 'BEHAVIORAL'];

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [statusType, setStatusType] = useState<UserStatusType | ''>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [targetRole, setTargetRole] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<InterviewCategory[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: InterviewCategory) => {
    setPreferredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const payload = {
      fullName,
      statusType: statusType || null,
      experienceLevel: experienceLevel || null,
      targetRole: targetRole || null,
      careerGoals: careerGoals || null,
      preferredCategories,
    };

    const parsed = OnboardingInputSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding(parsed.data);
      router.push('/dashboard');
    } catch (err) {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to save onboarding details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setFormError(null);
    setLoading(true);
    try {
      await skipOnboarding();
      router.push('/dashboard');
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : 'Unable to skip onboarding.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-secondary">
            <Sparkles className="h-3.5 w-3.5" />
            Candidate Profile Setup
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            Personalize your interview rehearsal
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleSkip()}
          disabled={loading}
        >
          Skip for now
        </Button>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>About You</CardTitle>
        </CardHeader>
        <CardContent>
          {formError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-md border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleComplete} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-fullname">Full Name (Required)</Label>
              <Input
                id="onboarding-fullname"
                placeholder="Alex Rivera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-rose-400">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-status">Current Status (Optional)</Label>
                <select
                  id="onboarding-status"
                  value={statusType}
                  onChange={(e) => setStatusType(e.target.value as UserStatusType | '')}
                  disabled={loading}
                  className="flex h-10 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:border-primary focus-visible:outline-none"
                >
                  <option value="">Select status...</option>
                  <option value="STUDENT">Student</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onboarding-exp">Experience Level (Optional)</Label>
                <select
                  id="onboarding-exp"
                  value={experienceLevel}
                  onChange={(e) =>
                    setExperienceLevel(e.target.value as ExperienceLevel | '')
                  }
                  disabled={loading}
                  className="flex h-10 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:border-primary focus-visible:outline-none"
                >
                  <option value="">Select experience...</option>
                  <option value="BEGINNER">Beginner (0–2 years)</option>
                  <option value="INTERMEDIATE">Intermediate (2–5 years)</option>
                  <option value="EXPERIENCED">Experienced (5+ years)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onboarding-role">Target Role (Optional)</Label>
              <Input
                id="onboarding-role"
                placeholder="Senior Full-Stack Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onboarding-goals">Career Goals (Optional)</Label>
              <textarea
                id="onboarding-goals"
                rows={3}
                placeholder="What would you like to focus on in your upcoming interviews?"
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                disabled={loading}
                className="flex w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Interview Categories (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const selected = preferredCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-md border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        selected
                          ? 'border-primary bg-primary/20 text-text-primary'
                          : 'border-border-strong bg-surface-raised text-text-secondary'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSkip()}
                disabled={loading}
              >
                Skip
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
