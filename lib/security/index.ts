// ==========================================
// SECURITY MODULE - MAIN EXPORTS
// ==========================================

// Rate Limiting & IP Extraction
export {
  checkRateLimit,
  withRateLimit,
  getIdentifier,
  getClientIp,
  getTierForRoute,
  addRateLimitHeaders,
  type RateLimitTier,
  type RateLimitResult,
} from './rate-limit';

// Input Sanitization
export {
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
  sanitizedString,
  sanitizedEmail,
  sanitizedUsername,
  safeString,
} from './sanitize';

// CAPTCHA
export {
  verifyCaptcha,
  requireCaptcha,
  type CaptchaVerifyResult,
} from './captcha';

// Secrets Manager
export {
  getSecret,
  getRequiredSecret,
  clearSecretsCache,
  validateSecrets,
  validateProductionSecrets,
  SecretKey,
} from './secrets';

// Encryption
export {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  hashBackupCode,
  verifyBackupCode,
  encryptFields,
  decryptFields,
  isEncrypted,
} from './encryption';
