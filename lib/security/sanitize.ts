// ==========================================
// INPUT SANITIZATION
// ==========================================
// Sanitize all user inputs to prevent XSS, injection attacks

import { z } from 'zod';

// ==========================================
// STRING SANITIZATION
// ==========================================

/**
 * Remove potentially dangerous HTML/script content
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;');
}

/**
 * Remove control characters and null bytes
 */
export function sanitizeControlChars(input: string): string {
  // Remove null bytes and control characters except newlines/tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize string for safe database storage
 */
export function sanitizeString(input: string): string {
  let sanitized = sanitizeControlChars(input);
  sanitized = sanitized.trim();
  return sanitized;
}

/**
 * Sanitize username (alphanumeric + underscore only)
 */
export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

/**
 * Sanitize email
 */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim();
}

// ==========================================
// SQL INJECTION PREVENTION (EXTRA LAYER)
// ==========================================

/**
 * Check for potential SQL injection patterns
 * Note: Prisma already prevents SQL injection, this is defense in depth
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(-{2}|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bAND\b.*=.*\bAND\b)/i,
    /'.*'.*=/,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// ==========================================
// XSS PREVENTION
// ==========================================

/**
 * Check for potential XSS patterns
 */
export function containsXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// ==========================================
// OBJECT SANITIZATION
// ==========================================

/**
 * Deep sanitize an object's string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) :
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ==========================================
// ZOD SANITIZATION TRANSFORMS
// ==========================================

/**
 * Zod string with sanitization
 */
export const sanitizedString = z.string().transform(sanitizeString);

/**
 * Zod email with sanitization
 */
export const sanitizedEmail = z.string().email().transform(sanitizeEmail);

/**
 * Zod username with sanitization
 */
export const sanitizedUsername = z
  .string()
  .min(3)
  .max(30)
  .transform(sanitizeUsername)
  .refine(val => val.length >= 3, 'Username must be at least 3 characters');

/**
 * Safe string that rejects SQL/XSS patterns
 */
export const safeString = z
  .string()
  .refine(val => !containsSqlInjection(val), 'Invalid characters detected')
  .refine(val => !containsXss(val), 'Invalid content detected')
  .transform(sanitizeString);

// ==========================================
// REQUEST BODY SANITIZATION
// ==========================================

/**
 * Sanitize request body before processing
 */
export async function sanitizeRequestBody<T extends Record<string, any>>(
  req: Request
): Promise<T> {
  const body = await req.json();
  return sanitizeObject(body) as T;
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Validate and sanitize with a Zod schema
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  // First sanitize if it's an object
  const sanitizedData = typeof data === 'object' && data !== null
    ? sanitizeObject(data as Record<string, any>)
    : data;

  const result = schema.safeParse(sanitizedData);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

// ==========================================
// FILE NAME SANITIZATION
// ==========================================

/**
 * Sanitize file names to prevent path traversal
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/\.\./g, '')           // Remove path traversal
    .replace(/[/\\]/g, '')          // Remove slashes
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars
    .slice(0, 255);                 // Limit length
}

// ==========================================
// URL SANITIZATION
// ==========================================

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input);

    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Block javascript: and data: URIs that might sneak through
    if (url.href.toLowerCase().includes('javascript:')) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  sanitizeHtml,
  sanitizeString,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeObject,
  sanitizeFileName,
  sanitizeUrl,
  containsSqlInjection,
  containsXss,
  validateAndSanitize,
  sanitizeRequestBody,
};
