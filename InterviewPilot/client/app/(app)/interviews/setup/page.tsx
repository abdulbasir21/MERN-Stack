'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  InterviewMode,
  InterviewType,
  InterviewDifficulty,
  ExperienceLevel,
  DocumentResponseDto,
} from '@interviewpilot/shared';
import {
  createInterviewApi,
  fetchDocuments,
  fetchQuotaMe,
  ApiClientError,
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Briefcase,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface QuotaState {
  maxDurationMinutes: number;
  maxQuestionsPerInterview: number;
  interviewsRemaining: number;
}

export default function InterviewSetupPage() {
  const router = useRouter();

  // Configuration state
  const [mode, setMode] = useState<InterviewMode>('GENERAL');
  const [role, setRole] = useState('Senior Full-Stack Engineer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('INTERMEDIATE');
  const [type, setType] = useState<InterviewType>('TECHNICAL');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('MEDIUM');
  const [durationMinutes, setDurationMinutes] = useState<5 | 15 | 30 | 45>(15);
  const [questionCountInput, setQuestionCountInput] = useState<string>('');

  // Documents state
  const [cvDocs, setCvDocs] = useState<DocumentResponseDto[]>([]);
  const [jdDocs, setJdDocs] = useState<DocumentResponseDto[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [selectedJdId, setSelectedJdId] = useState<string>('');

  // Quota & UI state
  const [quota, setQuota] = useState<QuotaState>({
    maxDurationMinutes: 45,
    maxQuestionsPerInterview: 15,
    interviewsRemaining: 5,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [docsRes, quotaRes] = await Promise.all([
          fetchDocuments().catch(() => null),
          fetchQuotaMe().catch(() => null),
        ]);

        if (docsRes?.data) {
          const cvs = docsRes.data.documents.filter(
            (d) => d.type === 'CV' && d.status === 'READY'
          );
          const jds = docsRes.data.documents.filter(
            (d) => d.type === 'JD' && d.status === 'READY'
          );
          setCvDocs(cvs);
          setJdDocs(jds);
          if (cvs.length > 0) setSelectedCvId(cvs[0].id);
          if (jds.length > 0) setSelectedJdId(jds[0].id);
        }

        if (quotaRes?.data?.effectiveQuota) {
          const eq = quotaRes.data.effectiveQuota;
          const ut = quotaRes.data.usageToday;
          const remaining = Math.max(0, eq.interviewsPerDay - (ut?.interviewsCreated || 0));
          setQuota({
            maxDurationMinutes: eq.maxDurationMinutes,
            maxQuestionsPerInterview: eq.maxQuestionsPerInterview,
            interviewsRemaining: remaining,
          });

          // If demo user or limited duration, automatically set appropriate duration
          if (eq.maxDurationMinutes <= 5) {
            setDurationMinutes(5);
            setMode('GENERAL');
          } else if (durationMinutes > eq.maxDurationMinutes) {
            setDurationMinutes(eq.maxDurationMinutes as 5 | 15 | 30 | 45);
          }
        }
      } catch (err) {
        console.warn('Initial setup load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const calculatedQuestions = Math.min(
    quota.maxQuestionsPerInterview,
    durationMinutes <= 5 ? 3 : Math.max(3, Math.floor(durationMinutes / 3))
  );

  async function handleCreateInterview(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Document validation per mode
    if ((mode === 'CV_BASED' || mode === 'CV_JD') && !selectedCvId) {
      setErrorMsg('Please select a ready CV document or switch to General Practice mode.');
      return;
    }
    if ((mode === 'JD_BASED' || mode === 'CV_JD') && !selectedJdId) {
      setErrorMsg('Please select a ready Job Description document.');
      return;
    }

    let parsedQuestionCount: number | undefined = undefined;
    if (questionCountInput.trim()) {
      const parsed = parseInt(questionCountInput, 10);
      if (isNaN(parsed) || parsed < 1) {
        setErrorMsg('Custom question count must be at least 1.');
        return;
      }
      if (parsed > quota.maxQuestionsPerInterview) {
        setErrorMsg(
          `Selected question count (${parsed}) exceeds your plan limit of ${quota.maxQuestionsPerInterview}.`
        );
        return;
      }
      parsedQuestionCount = parsed;
    }

    try {
      setGenerating(true);
      const res = await createInterviewApi({
        mode,
        role: role.trim(),
        experienceLevel,
        type,
        difficulty,
        durationMinutes,
        questionCount: parsedQuestionCount,
        cvDocumentId: mode === 'CV_BASED' || mode === 'CV_JD' ? selectedCvId : undefined,
        jdDocumentId: mode === 'JD_BASED' || mode === 'CV_JD' ? selectedJdId : undefined,
      });

      if (res.data?.interview?.id) {
        // Redirection to the device check page
        router.push(`/interviews/${res.data.interview.id}/device-check`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INTERVIEW_ALREADY_ACTIVE') {
          setErrorMsg(
            'You already have an active interview in progress. Please complete or end it before starting a new one.'
          );
        } else if (err.code === 'USER_QUOTA_EXCEEDED') {
          setErrorMsg('Daily interview quota exceeded. Please try again tomorrow or upgrade.');
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Failed to initialize interview rehearsal plan. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading interview configurations...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configure Interview Rehearsal</h1>
        <p className="text-muted-foreground mt-1">
          Customize your realistic AI mock interview with tailored roles, duration, and documents.
        </p>
      </div>

      {quota.maxDurationMinutes <= 5 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              <strong>Demo Session:</strong> 5-minute preview simulation with up to 3 adaptive questions. General practice mode is active.
            </span>
          </div>
          <Link
            href="/register"
            className="text-amber-300 hover:text-white font-semibold underline underline-offset-4"
          >
            Create Permanent Account →
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleCreateInterview} className="space-y-6">
        {/* Step 1: Select Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              1. Select Interview Mode
            </CardTitle>
            <CardDescription>
              Choose how you want the AI to tailor questions and evaluation criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GENERAL */}
            <div
              onClick={() => setMode('GENERAL')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'GENERAL'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">General Practice</span>
                <Badge variant={mode === 'GENERAL' ? 'speaking' : 'default'}>No docs needed</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Standard technical or behavioral rehearsal based purely on the target role and seniority.
              </p>
            </div>

            {/* CV_BASED */}
            <div
              onClick={() => {
                if (quota.maxDurationMinutes > 5) setMode('CV_BASED');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                quota.maxDurationMinutes <= 5
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : mode === 'CV_BASED'
                  ? 'border-primary bg-primary/5 shadow-sm cursor-pointer'
                  : 'border-border hover:border-muted-foreground/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">Resume-Based</span>
                <Badge variant={mode === 'CV_BASED' ? 'speaking' : 'default'}>
                  {quota.maxDurationMinutes <= 5 ? 'Sign up required' : 'CV Required'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Questions probe your real projects, skills, and accomplishments from your uploaded resume.
              </p>
            </div>

            {/* JD_BASED */}
            <div
              onClick={() => {
                if (quota.maxDurationMinutes > 5) setMode('JD_BASED');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                quota.maxDurationMinutes <= 5
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : mode === 'JD_BASED'
                  ? 'border-primary bg-primary/5 shadow-sm cursor-pointer'
                  : 'border-border hover:border-muted-foreground/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">Job Description</span>
                <Badge variant={mode === 'JD_BASED' ? 'speaking' : 'default'}>
                  {quota.maxDurationMinutes <= 5 ? 'Sign up required' : 'JD Required'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Simulates the exact interview for a target job description or company listing.
              </p>
            </div>

            {/* CV_JD */}
            <div
              onClick={() => {
                if (quota.maxDurationMinutes > 5) setMode('CV_JD');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                quota.maxDurationMinutes <= 5
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : mode === 'CV_JD'
                  ? 'border-primary bg-primary/5 shadow-sm cursor-pointer'
                  : 'border-border hover:border-muted-foreground/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">Targeted Role Fit</span>
                <Badge variant={mode === 'CV_JD' ? 'speaking' : 'default'}>
                  {quota.maxDurationMinutes <= 5 ? 'Sign up required' : 'CV + JD Required'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                The most realistic rehearsal. Maps your past background directly to the target employer's needs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Document Selection (if applicable) */}
        {(mode === 'CV_BASED' || mode === 'CV_JD' || mode === 'JD_BASED') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                2. Select Context Documents
              </CardTitle>
              <CardDescription>
                Choose from your analyzed documents to ground the interview rehearsal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(mode === 'CV_BASED' || mode === 'CV_JD') && (
                <div>
                  <Label htmlFor="cvSelect">Resume / CV Document</Label>
                  {cvDocs.length === 0 ? (
                    <div className="text-sm text-amber-600 mt-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No ready CV found. Please upload a CV in Document Management first.
                    </div>
                  ) : (
                    <select
                      id="cvSelect"
                      value={selectedCvId}
                      onChange={(e) => setSelectedCvId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {cvDocs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.originalName || 'Uploaded CV'} (Ready)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {(mode === 'JD_BASED' || mode === 'CV_JD') && (
                <div>
                  <Label htmlFor="jdSelect">Job Description Document</Label>
                  {jdDocs.length === 0 ? (
                    <div className="text-sm text-amber-600 mt-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No ready JD found. Please upload or paste a JD in Document Management first.
                    </div>
                  ) : (
                    <select
                      id="jdSelect"
                      value={selectedJdId}
                      onChange={(e) => setSelectedJdId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {jdDocs.map((jd) => (
                        <option key={jd.id} value={jd.id}>
                          {jd.originalName || 'Target Job Description'} (Ready)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Role & Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {mode === 'GENERAL' ? '2' : '3'}. Target Role & Seniority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="roleInput">Target Job Title / Role</Label>
              <Input
                id="roleInput"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                required
                minLength={2}
                maxLength={100}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Seniority Level</Label>
                <div className="flex gap-2 mt-1">
                  {(['BEGINNER', 'INTERMEDIATE', 'EXPERIENCED'] as ExperienceLevel[]).map((lvl) => (
                    <Button
                      key={lvl}
                      type="button"
                      variant={experienceLevel === lvl ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setExperienceLevel(lvl)}
                      className="flex-1 capitalize text-xs"
                    >
                      {lvl.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Interview Category</Label>
                <div className="flex gap-2 mt-1">
                  {(['TECHNICAL', 'HR', 'BEHAVIORAL'] as InterviewType[]).map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={type === cat ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setType(cat)}
                      className="flex-1 capitalize text-xs"
                    >
                      {cat.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Starting Difficulty</Label>
                <div className="flex gap-2 mt-1">
                  {(['EASY', 'MEDIUM', 'HARD'] as InterviewDifficulty[]).map((diff) => (
                    <Button
                      key={diff}
                      type="button"
                      variant={difficulty === diff ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setDifficulty(diff)}
                      className="flex-1 capitalize text-xs"
                    >
                      {diff.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Duration & Questions (Quota-Aware) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {mode === 'GENERAL' ? '3' : '4'}. Duration & Question Limits
            </CardTitle>
            <CardDescription>
              Quota limits: max {quota.maxDurationMinutes} min duration, up to {quota.maxQuestionsPerInterview} questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Target Duration</Label>
              <div
                className={`grid gap-3 mt-1.5 ${
                  quota.maxDurationMinutes <= 5 ? 'grid-cols-1' : 'grid-cols-3'
                }`}
              >
                {(quota.maxDurationMinutes <= 5 ? [5] : [15, 30, 45]).map((mins) => {
                  const isExceeded = mins > quota.maxDurationMinutes;
                  return (
                    <button
                      key={mins}
                      type="button"
                      disabled={isExceeded}
                      onClick={() => setDurationMinutes(mins as 5 | 15 | 30 | 45)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isExceeded
                          ? 'opacity-40 cursor-not-allowed bg-muted border-border'
                          : durationMinutes === mins
                          ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="text-base font-semibold">
                        {mins} Minutes {mins === 5 ? '(Demo Rehearsal)' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {isExceeded
                          ? 'Exceeds quota'
                          : `~${mins === 5 ? 3 : Math.floor(mins / 3)} questions`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Label htmlFor="customQuestionCount">
                Question Count (Optional, default: {calculatedQuestions})
              </Label>
              <Input
                id="customQuestionCount"
                type="number"
                min={3}
                max={quota.maxQuestionsPerInterview}
                placeholder={`Default: ${calculatedQuestions} questions`}
                value={questionCountInput}
                onChange={(e) => setQuestionCountInput(e.target.value)}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to automatically ask questions at approximately 3 minutes per question.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            {quota.interviewsRemaining > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {quota.interviewsRemaining} rehearsal sessions remaining today
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                Daily interview quota limit reached
              </span>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={generating || quota.interviewsRemaining <= 0}
            className="min-w-[200px]"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Rehearsal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
