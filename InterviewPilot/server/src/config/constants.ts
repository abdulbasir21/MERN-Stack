export const BCRYPT_COST = 12;
export const AUTH_COOKIE_NAME = 'ip_session';
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

// QTA-13 Rate limits
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const GLOBAL_RATE_LIMIT_MAX = 100;
export const GLOBAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const AI_RATE_LIMIT_MAX = 20;
export const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

// SEC-5 / DOC-2 Upload limits
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PASTED_JD_CHARS = 15000;
export const MAX_DOCUMENTS_PER_TYPE = 5;

// RAG constants (RAG-1, RAG-3, RAG-4)
export const RAG_CHUNK_SIZE = 1200;
export const RAG_CHUNK_OVERLAP = 150;
export const RAG_TOP_K = 4;
export const RAG_MAX_TOTAL_CHARS = 3000;
export const EMBEDDING_DIMENSIONS = 768;
