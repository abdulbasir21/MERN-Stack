import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

let extractionMock = null;

export function setTextExtractionMock(mock) {
  extractionMock = mock;
}

export function getTextExtractionMock() {
  return extractionMock;
}

export function clearTextExtractionMock() {
  extractionMock = null;
}

/**
 * Extract plain text from PDF binary buffer (BR-D1, BR-D4, BR-D9)
 */
export async function extractTextFromPdf(buffer) {
  if (extractionMock?.extractPdf) {
    return extractionMock.extractPdf(buffer);
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();

    // BR-D9: Scanned PDFs with no extractable text get failed with reason no_extractable_text
    if (!text) {
      const err = new Error('No extractable text found in document (scanned or image-only PDF)');
      err.code = 'no_extractable_text';
      throw err;
    }

    return {
      text,
      pageCount: result.total || 1,
      pages: result.pages || []
    };
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
}

/**
 * Extract plain text from DOCX binary buffer via mammoth (BR-D1, BR-D4, BR-D9)
 */
export async function extractTextFromDocx(buffer) {
  if (extractionMock?.extractDocx) {
    return extractionMock.extractDocx(buffer);
  }

  const { value: rawText } = await mammoth.extractRawText({ buffer });
  const text = (rawText || '').trim();

  if (!text) {
    const err = new Error('No extractable text found in DOCX document');
    err.code = 'no_extractable_text';
    throw err;
  }

  return {
    text,
    pageCount: 1,
    pages: [{ num: 1, text }]
  };
}

/**
 * Universal extractor delegating based on file extension
 */
export async function extractDocumentText({ buffer, filename }) {
  if (extractionMock?.extract) {
    return extractionMock.extract({ buffer, filename });
  }

  const ext = filename.toLowerCase().endsWith('.docx') ? '.docx' : '.pdf';

  if (ext === '.docx') {
    return extractTextFromDocx(buffer);
  }

  return extractTextFromPdf(buffer);
}
