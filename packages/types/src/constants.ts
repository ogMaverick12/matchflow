// Gemini model names
export const MODEL_FAST = 'gemini-flash-latest' as const;
export const MODEL_HIGH_CAP = 'gemini-pro-latest' as const;

// Timeouts (ms)
export const CONCIERGE_TIMEOUT_MS = 25_000;
export const DISPATCH_TIMEOUT_MS = 15_000;
export const SIMPLIFY_TIMEOUT_MS = 10_000;
export const SUMMARIZE_TIMEOUT_MS = 15_000;

// Density thresholds
export const DENSITY_LOW = 0.33;
export const DENSITY_HIGH = 0.66;

// Egress scoring
export const EGRESS_ZONE_PENALTY = 0.6;

// Batch
export const MAX_BATCH_SIZE = 20;
export const BATCH_WINDOW_MS = 3000;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 30;

// Language defaults
export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt', 'ar'] as const;
