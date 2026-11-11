import { CHUNK_CONSTANTS } from '../config/constants.js';

/**
 * Detect section label from text snippet
 */
export function detectSectionLabel(text, activeMajorSection = null) {
  if (!text || typeof text !== 'string') return activeMajorSection;

  // Match 1: Major SECTION header: e.g. SECTION 08 51 13 - ALUMINUM WINDOWS
  const sectionMatch =
    /(?:^|\n)\s*(?:SECTION|Section)\s+([-0-9A-Za-z.\s]+?)(?:\s*[-–—:]\s*([^\n\r]+?))?(?:\n|$)/.exec(
      text
    );
  if (sectionMatch) {
    const num = sectionMatch[1].replace(/\s+/g, ' ').trim();
    const title = sectionMatch[2] ? ` - ${sectionMatch[2].trim()}` : '';
    return `Section ${num}${title}`;
  }

  // Match 2: Standalone CSI MasterFormat number: e.g. 08 51 13 Aluminum Windows
  const csiMatch =
    /(?:^|\n)\s*(\d{2}\s+\d{2}\s+\d{2}(?:\.\d+)?)\s*(?:[-–—:]\s*)?([^\n\r]+?)?(?:\n|$)/.exec(text);
  if (csiMatch) {
    const csiNum = csiMatch[1].replace(/\s+/g, ' ').trim();
    const title = csiMatch[2] ? ` - ${csiMatch[2].trim()}` : '';
    return `Section ${csiNum}${title}`;
  }

  // Match 3: Subsections (PART, ARTICLE, CLAUSE)
  const subMatch =
    /(?:^|\n)\s*(?:PART|Part|ARTICLE|Article|CLAUSE|Clause)\s+([-0-9A-Za-z.\s]+?)(?:\s*[-–—:]\s*([^\n\r]+?))?(?:\n|$)/.exec(
      text
    );
  if (subMatch) {
    const num = subMatch[1].replace(/\s+/g, ' ').trim();
    const title = subMatch[2] ? ` - ${subMatch[2].trim()}` : '';
    const subLabel = `Part ${num}${title}`;
    if (activeMajorSection) {
      return `${activeMajorSection} (${subLabel})`;
    }
    return `Section ${num}${title}`;
  }

  return activeMajorSection;
}

/**
 * Split a large text block into chunks with sliding overlap
 */
function splitWithOverlap(text, targetSize, overlapSize, baseMeta = {}) {
  const chunks = [];
  const clean = text.trim();
  if (!clean) return chunks;

  if (clean.length <= targetSize) {
    return [{ ...baseMeta, text: clean }];
  }

  // Split into paragraphs
  const paragraphs = clean.split(/\n\s*\n/);
  let currentBuffer = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If single paragraph is oversized, split by sentences
    if (trimmed.length > targetSize) {
      if (currentBuffer.trim()) {
        chunks.push({ ...baseMeta, text: currentBuffer.trim() });
        // Preserve overlap from the end of currentBuffer
        currentBuffer = currentBuffer.slice(-overlapSize);
      }

      const sentences = trimmed.match(/[^.!?]+[.!?]+|\S+/g) || [trimmed];
      for (const sentence of sentences) {
        if (currentBuffer.length + sentence.length > targetSize && currentBuffer.trim()) {
          chunks.push({ ...baseMeta, text: currentBuffer.trim() });
          currentBuffer = currentBuffer.slice(-overlapSize);
        }
        currentBuffer += (currentBuffer ? ' ' : '') + sentence.trim();
      }
      continue;
    }

    if (currentBuffer.length + trimmed.length > targetSize && currentBuffer.trim()) {
      chunks.push({ ...baseMeta, text: currentBuffer.trim() });
      currentBuffer = currentBuffer.slice(-overlapSize);
    }

    currentBuffer += (currentBuffer ? '\n\n' : '') + trimmed;
  }

  if (currentBuffer.trim()) {
    chunks.push({ ...baseMeta, text: currentBuffer.trim() });
  }

  return chunks;
}

/**
 * BR-C1 & BR-C2: Section/clause-aware chunker with page tracking
 * @param {Object} params
 * @param {string} params.text - Full extracted document text
 * @param {Array<{num: number, text: string}>} [params.pages] - Page-wise extracted text
 * @param {number} [params.targetSize] - Target characters per chunk
 * @param {number} [params.overlapSize] - Overlap characters between chunks
 * @returns {Array<{chunkIndex: number, text: string, pageNumber: number|null, sectionLabel: string|null}>}
 */
export function chunkDocument({
  text,
  pages = [],
  targetSize = CHUNK_CONSTANTS.TARGET_CHARS,
  overlapSize = CHUNK_CONSTANTS.OVERLAP_CHARS
}) {
  if (!text || !text.trim()) {
    return [];
  }

  let activeSectionLabel = null;
  const rawChunks = [];

  if (pages && pages.length > 0) {
    // Process page-by-page to accurately preserve pageNumber (BR-C1)
    for (const page of pages) {
      const pageText = (page.text || '').trim();
      if (!pageText) continue;

      const pageSection = detectSectionLabel(pageText, activeSectionLabel);
      if (pageSection) {
        activeSectionLabel = pageSection;
      }

      const pageSplits = splitWithOverlap(pageText, targetSize, overlapSize, {
        pageNumber: page.num || null,
        sectionLabel: activeSectionLabel
      });

      rawChunks.push(...pageSplits);
    }
  } else {
    // Split plain text by detecting sections
    const detected = detectSectionLabel(text);
    if (detected) {
      activeSectionLabel = detected;
    }
    const splits = splitWithOverlap(text, targetSize, overlapSize, {
      pageNumber: null,
      sectionLabel: activeSectionLabel
    });
    rawChunks.push(...splits);
  }

  // Format final chunk list with zero-indexed chunkIndex
  return rawChunks.map((chunk, index) => ({
    chunkIndex: index,
    text: chunk.text,
    pageNumber: chunk.pageNumber ?? null,
    sectionLabel: chunk.sectionLabel ?? detectSectionLabel(chunk.text) ?? null
  }));
}
