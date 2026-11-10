import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ExtractionResult {
  ok: boolean;
  text?: string;
  reason?: 'NO_TEXT' | 'EXTRACTION_FAILED';
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    let rawText = '';

    if (mimeType === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        await parser.destroy();

        // Extract text from pages, ignoring page banners like "-- 1 of 1 --"
        const pageTexts = (textResult?.pages || [])
          .map((p: { text?: string }) => p.text || '')
          .join('\n');
        rawText = pageTexts.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();

        // If page texts were empty, also check textResult.text stripped of page markers
        if (!rawText && textResult?.text) {
          rawText = textResult.text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
        }
      } catch {
        // Fallback: simple text stream extraction if parser encounters minor structural issues
        const stringContent = buffer.toString('latin1');
        const textMatches = stringContent.match(/\(([^)]+)\)\s*Tj/g);
        if (textMatches && textMatches.length > 0) {
          rawText = textMatches
            .map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
            .join(' ');
        } else {
          return { ok: false, reason: 'NO_TEXT' };
        }
      }
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result?.value || '';
    } else {
      return { ok: false, reason: 'EXTRACTION_FAILED' };
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      // DOC-9: A PDF with no extractable text -> status FAILED, reason NO_TEXT
      return { ok: false, reason: 'NO_TEXT' };
    }

    return { ok: true, text: trimmed };
  } catch (err) {
    console.warn('[TEXT_EXTRACTION] Extraction error:', err);
    return { ok: false, reason: 'EXTRACTION_FAILED' };
  }
}
