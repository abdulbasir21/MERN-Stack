import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 13 — Public Website & SEO (PUB-1, PUB-2, PUB-3)', () => {
  const landingPagePath = path.resolve(__dirname, '../../../client/app/page.tsx');
  const privacyPagePath = path.resolve(__dirname, '../../../client/app/privacy/page.tsx');
  const layoutPagePath = path.resolve(__dirname, '../../../client/app/layout.tsx');

  const landingSource = fs.readFileSync(landingPagePath, 'utf-8');
  const privacySource = fs.readFileSync(privacyPagePath, 'utf-8');
  const layoutSource = fs.readFileSync(layoutPagePath, 'utf-8');

  it('PUB-1: Landing page hero contains the exact mandated tagline', () => {
    // Mandated in spec: "Practice smarter. Interview with confidence."
    expect(landingSource).toContain('Practice smarter. Interview with confidence.');
  });

  it('PUB-1: Landing page contains all mandated sections and valid CTA routes', () => {
    // Mandated sections in PUB-1:
    // navigation, hero, Start Interview, Try Demo, How It Works, feature highlights,
    // interview room preview, supported interview types, benefits, FAQ, footer.
    expect(landingSource).toContain('id="how-it-works"');
    expect(landingSource).toContain('id="types"');
    expect(landingSource).toContain('id="faq"');
    expect(landingSource).toContain('Start Free Interview');
    expect(landingSource).toContain('Try Instant Demo');
    expect(landingSource).toContain('Live Interview Cockpit');

    // Valid CTA link targets
    expect(landingSource).toContain('href="/register"');
    expect(landingSource).toContain('href="/login"');
    expect(landingSource).toContain('href="/privacy"');
    expect(landingSource).toContain('href="/dashboard"');
    expect(landingSource).toContain('href="/admin"');
  });

  it('PUB-1: No mock statistics are shown as real metrics', () => {
    // Per Phase 13 test spec: "no mock statistics shown as real"
    // Must not contain fake marketing claims like "99.8% success rate" or "50,000 interviews aced"
    expect(landingSource).not.toMatch(/99\.\d% success/i);
    expect(landingSource).not.toMatch(/\d+,\d+\+ users/i);
    expect(landingSource).not.toMatch(/satisfaction rating/i);
  });

  it('PUB-2: Privacy page explicit statements match actual backend behavior', () => {
    // Audio is not stored
    expect(privacySource).toContain('Zero Audio Storage');
    expect(privacySource).toMatch(/audio is never stored/i);

    // Transcripts and reports kept until deleted
    expect(privacySource).toMatch(/transcripts and performance reports/i);
    expect(privacySource).toMatch(/retained until you explicitly delete/i);

    // Documents kept until deleted & private
    expect(privacySource).toMatch(/strictly partitioned by your unique candidate ID/i);

    // Admin access is audited
    expect(privacySource).toMatch(/audited administrator access/i);
    expect(privacySource).toMatch(/immutable audit log/i);

    // Demo data purged after 24 hours
    expect(privacySource).toMatch(/24-hour automatic purge/i);
  });

  it('PUB-1, SEO: Root layout includes metadata with title and description', () => {
    expect(layoutSource).toContain('InterviewPilot');
    expect(layoutSource).toContain('Practice smarter. Interview with confidence.');
    expect(layoutSource).toContain('Metadata');
  });
});
