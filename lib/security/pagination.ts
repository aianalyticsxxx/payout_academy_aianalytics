// ==========================================
// SAFE PAGINATION UTILITIES
// ==========================================
// Prevents DoS via unbounded pagination

// ==========================================
// CONSTANTS
// ==========================================

export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  MAX_OFFSET: 10000, // Prevent deep pagination
} as const;

// ==========================================
// SAFE PAGINATION PARSER
// ==========================================

export interface PaginationParams {
  limit: number;
  offset: number;
  page?: number;
}

export interface SafePaginationOptions {
  maxLimit?: number;
  maxOffset?: number;
  defaultLimit?: number;
}

/**
 * Safely parse pagination parameters with bounds checking
 * @param searchParams - URL search parameters
 * @param options - Optional custom limits
 * @returns Bounded pagination parameters
 */
export function safePagination(
  searchParams: URLSearchParams,
  options: SafePaginationOptions = {}
): PaginationParams {
  const {
    maxLimit = PAGINATION_DEFAULTS.MAX_LIMIT,
    maxOffset = PAGINATION_DEFAULTS.MAX_OFFSET,
    defaultLimit = PAGINATION_DEFAULTS.DEFAULT_LIMIT,
  } = options;

  // Parse and validate limit
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  limit = Math.min(limit, maxLimit);

  // Parse and validate offset
  let offset = parseInt(searchParams.get('offset') || '0', 10);
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }
  offset = Math.min(offset, maxOffset);

  // Calculate page number (1-indexed)
  const page = Math.floor(offset / limit) + 1;

  return { limit, offset, page };
}

/**
 * Parse page-based pagination (converts to offset)
 * @param searchParams - URL search parameters
 * @param options - Optional custom limits
 * @returns Bounded pagination parameters
 */
export function safePagePagination(
  searchParams: URLSearchParams,
  options: SafePaginationOptions = {}
): PaginationParams {
  const {
    maxLimit = PAGINATION_DEFAULTS.MAX_LIMIT,
    maxOffset = PAGINATION_DEFAULTS.MAX_OFFSET,
    defaultLimit = PAGINATION_DEFAULTS.DEFAULT_LIMIT,
  } = options;

  // Parse limit (per page)
  let limit = parseInt(searchParams.get('perPage') || searchParams.get('limit') || String(defaultLimit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  limit = Math.min(limit, maxLimit);

  // Parse page number (1-indexed)
  let page = parseInt(searchParams.get('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Calculate offset
  let offset = (page - 1) * limit;
  offset = Math.min(offset, maxOffset);

  return { limit, offset, page };
}

/**
 * Generate pagination metadata for response
 */
export function paginationMeta(
  total: number,
  params: PaginationParams
): {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / params.limit);

  return {
    total,
    page: params.page || 1,
    perPage: params.limit,
    totalPages,
    hasMore: (params.offset + params.limit) < total,
  };
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  safePagination,
  safePagePagination,
  paginationMeta,
  PAGINATION_DEFAULTS,
};
