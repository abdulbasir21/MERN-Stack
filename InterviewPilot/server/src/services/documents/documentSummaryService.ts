import type { DocumentType, CvSummary, JdSummary } from '@interviewpilot/shared';
import { CvSummarySchema, JdSummarySchema } from '@interviewpilot/shared';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';

export interface DocumentSummarizer {
  summarize(
    text: string,
    type: DocumentType
  ): Promise<{ summary: CvSummary | JdSummary; inputTokens: number; outputTokens: number }>;
}

/**
 * Gemini Prompt builder enforcing DOC-6:
 * "The summary may contain only facts present in the text. Do not invent projects, skills, or employment."
 */
export function buildSummaryPrompt(text: string, type: DocumentType): string {
  if (type === 'CV') {
    return `You are a resume analysis engine. Analyze the following candidate CV text and return a structured JSON object.
CRITICAL RULE (DOC-6): The summary may contain ONLY facts explicitly present in the provided text. You must NOT invent, assume, extrapolate, or embellish any project, company, skill, qualification, or experience not explicitly stated.

Return pure JSON matching this schema:
{
  "name": "Candidate Name or null",
  "education": ["degree, institution, year"],
  "skills": ["skill1", "skill2"],
  "technologies": ["tech1", "tech2"],
  "projects": [
    { "name": "Project Name", "description": "Brief factual summary from text", "technologies": ["tech1"] }
  ],
  "workExperience": [
    { "company": "Company Name", "role": "Job Title", "duration": "Duration or null", "responsibilities": ["duty1"] }
  ],
  "certifications": ["cert1"]
}

CV TEXT:
${text}`;
  }

  return `You are a job description analysis engine. Analyze the following Job Description (JD) text and return a structured JSON object.
CRITICAL RULE (DOC-6): The summary may contain ONLY facts explicitly present in the provided text. Do not invent skills, responsibilities, or expectations not mentioned.

Return pure JSON matching this schema:
{
  "title": "Job Title or null",
  "requiredSkills": ["skill1", "skill2"],
  "responsibilities": ["responsibility 1"],
  "technologies": ["tech1", "tech2"],
  "experienceRequirements": ["requirement 1"],
  "expectations": ["expectation 1"]
}

JOB DESCRIPTION TEXT:
${text}`;
}

export class DefaultGeminiSummarizer implements DocumentSummarizer {
  async summarize(
    text: string,
    type: DocumentType
  ): Promise<{ summary: CvSummary | JdSummary; inputTokens: number; outputTokens: number }> {
    // Dynamic import of @google/genai or fetch-based Gemini call
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_TEXT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = buildSummaryPrompt(text, type);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textOut = candidate?.content?.parts?.[0]?.text || '{}';
    const parsedJson = JSON.parse(textOut);

    const inputTokens = data.usageMetadata?.promptTokenCount ?? Math.ceil(prompt.length / 4);
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? Math.ceil(textOut.length / 4);

    if (type === 'CV') {
      const parsed = CvSummarySchema.parse(parsedJson);
      return { summary: parsed, inputTokens, outputTokens };
    } else {
      const parsed = JdSummarySchema.parse(parsedJson);
      return { summary: parsed, inputTokens, outputTokens };
    }
  }
}

export class MockDocumentSummarizer implements DocumentSummarizer {
  private customHandler?: (
    text: string,
    type: DocumentType
  ) => CvSummary | JdSummary;

  setHandler(fn: (text: string, type: DocumentType) => CvSummary | JdSummary) {
    this.customHandler = fn;
  }

  async summarize(
    text: string,
    type: DocumentType
  ): Promise<{ summary: CvSummary | JdSummary; inputTokens: number; outputTokens: number }> {
    if (this.customHandler) {
      const custom = this.customHandler(text, type);
      return { summary: custom, inputTokens: 200, outputTokens: 150 };
    }

    if (type === 'CV') {
      // Deterministically extract items mentioned in text
      const hasPostgres = /postgres/i.test(text);
      const hasReact = /react/i.test(text);
      const hasAntigravity = /antigravity/i.test(text);

      const technologies: string[] = [];
      if (hasPostgres) technologies.push('PostgreSQL');
      if (hasReact) technologies.push('React');

      const projects: Array<{ name: string; description: string; technologies: string[] }> = [];
      if (hasAntigravity) {
        projects.push({
          name: 'Antigravity Platform',
          description: 'Autonomous agentic coding platform',
          technologies: ['TypeScript', 'Node.js'],
        });
      }

      const summary: CvSummary = {
        name: 'Jane Doe',
        education: ['B.S. in Computer Science, Tech University'],
        skills: ['Distributed Systems', 'API Design'],
        technologies,
        projects,
        workExperience: [
          {
            company: 'Tech Corp',
            role: 'Software Engineer',
            duration: '2023 - Present',
            responsibilities: ['Developed microservices'],
          },
        ],
        certifications: [],
      };
      return { summary, inputTokens: 200, outputTokens: 150 };
    }

    const summary: JdSummary = {
      title: 'Senior Software Engineer',
      requiredSkills: ['System Design', 'TypeScript'],
      responsibilities: ['Architect scalable cloud services'],
      technologies: ['TypeScript', 'Node.js', 'PostgreSQL'],
      experienceRequirements: ['5+ years software engineering experience'],
      expectations: ['High code quality and test coverage'],
    };
    return { summary, inputTokens: 200, outputTokens: 150 };
  }
}

let activeSummarizer: DocumentSummarizer = new DefaultGeminiSummarizer();

export function getDocumentSummarizer(): DocumentSummarizer {
  return activeSummarizer;
}

export function setDocumentSummarizer(summarizer: DocumentSummarizer): void {
  activeSummarizer = summarizer;
}

export function resetDocumentSummarizer(): void {
  activeSummarizer = new DefaultGeminiSummarizer();
}

/**
 * Executes document summary via withAiUsage (QTA-1, DOC-5, DOC-6).
 * Consumes 1 document analysis from quota.
 */
export async function executeDocumentSummary(params: {
  userId: string;
  documentId: string;
  text: string;
  type: DocumentType;
}): Promise<CvSummary | JdSummary> {
  const summarizer = getDocumentSummarizer();

  return withAiUsage(
    {
      actorUserId: params.userId,
      operation: 'DOCUMENT_SUMMARY',
      model: env.GEMINI_TEXT_MODEL,
      consumeDocumentAnalysis: true,
      estimatedInputTokens: Math.ceil(params.text.length / 4) + 150,
      estimatedOutputTokens: 300,
    },
    async () => {
      const res = await summarizer.summarize(params.text, params.type);
      return {
        result: res.summary,
        inputTokens: res.inputTokens,
        outputTokens: res.outputTokens,
      };
    }
  );
}
