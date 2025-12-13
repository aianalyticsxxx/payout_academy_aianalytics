// ==========================================
// SECRETS MANAGER INTEGRATION
// ==========================================
// Supports: Vercel (default), AWS Secrets Manager, Infisical
// Use environment variable SECRETS_PROVIDER to select

type SecretsProvider = 'vercel' | 'aws' | 'infisical';

const SECRETS_PROVIDER = (process.env.SECRETS_PROVIDER || 'vercel') as SecretsProvider;

// ==========================================
// SECRET KEYS ENUM
// ==========================================

export enum SecretKey {
  // Database
  DATABASE_URL = 'DATABASE_URL',
  DIRECT_URL = 'DIRECT_URL',

  // Auth
  NEXTAUTH_SECRET = 'NEXTAUTH_SECRET',
  GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET',

  // AI Providers
  ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY',
  OPENAI_API_KEY = 'OPENAI_API_KEY',
  GOOGLE_AI_API_KEY = 'GOOGLE_AI_API_KEY',
  XAI_API_KEY = 'XAI_API_KEY',
  GROQ_API_KEY = 'GROQ_API_KEY',
  PERPLEXITY_API_KEY = 'PERPLEXITY_API_KEY',

  // Payments
  STRIPE_SECRET_KEY = 'STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SECRET = 'STRIPE_WEBHOOK_SECRET',
  CONFIRMO_API_KEY = 'CONFIRMO_API_KEY',

  // External APIs
  ODDS_API_KEY = 'ODDS_API_KEY',

  // Redis
  UPSTASH_REDIS_REST_URL = 'UPSTASH_REDIS_REST_URL',
  UPSTASH_REDIS_REST_TOKEN = 'UPSTASH_REDIS_REST_TOKEN',

  // Security
  CRON_SECRET = 'CRON_SECRET',
  TURNSTILE_SECRET_KEY = 'TURNSTILE_SECRET_KEY',
}

// ==========================================
// SECRETS CACHE
// ==========================================

const secretsCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ==========================================
// VERCEL SECRETS (ENV VARS)
// ==========================================

async function getVercelSecret(key: string): Promise<string | undefined> {
  return process.env[key];
}

// ==========================================
// AWS SECRETS MANAGER
// ==========================================

let awsClient: any = null;

async function getAwsSecretsClient() {
  if (!awsClient) {
    try {
      // Dynamic import - AWS SDK is optional dependency
      const awsModule = await import('@aws-sdk/client-secrets-manager' as string);
      const { SecretsManagerClient } = awsModule;
      awsClient = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    } catch {
      console.warn('[Secrets] AWS SDK not installed, falling back to env vars');
      return null;
    }
  }
  return awsClient;
}

async function getAwsSecret(key: string): Promise<string | undefined> {
  const client = await getAwsSecretsClient();
  if (!client) return process.env[key];

  try {
    // Dynamic import - AWS SDK is optional dependency
    const awsModule = await import('@aws-sdk/client-secrets-manager' as string);
    const { GetSecretValueCommand } = awsModule;
    const secretName = process.env.AWS_SECRET_NAME || 'zalogche/production';

    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      return secrets[key];
    }
  } catch (error) {
    console.error(`[Secrets] AWS fetch failed for ${key}:`, error);
  }

  // Fallback to env var
  return process.env[key];
}

// ==========================================
// INFISICAL SECRETS MANAGER
// ==========================================

async function getInfisicalSecret(key: string): Promise<string | undefined> {
  const token = process.env.INFISICAL_TOKEN;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  const environment = process.env.INFISICAL_ENV || 'production';

  if (!token || !projectId) {
    return process.env[key];
  }

  try {
    const response = await fetch(
      `https://app.infisical.com/api/v3/secrets/${key}?workspaceId=${projectId}&environment=${environment}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Infisical API error: ${response.status}`);
    }

    const data = await response.json();
    return data.secret?.secretValue;
  } catch (error) {
    console.error(`[Secrets] Infisical fetch failed for ${key}:`, error);
    return process.env[key];
  }
}

// ==========================================
// MAIN SECRET GETTER
// ==========================================

/**
 * Get a secret value with caching
 * @param key - The secret key to retrieve
 * @param skipCache - Force fetch from provider
 * @returns The secret value or undefined
 */
export async function getSecret(
  key: SecretKey | string,
  skipCache = false
): Promise<string | undefined> {
  // Check cache first
  if (!skipCache) {
    const cached = secretsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let value: string | undefined;

  switch (SECRETS_PROVIDER) {
    case 'aws':
      value = await getAwsSecret(key);
      break;
    case 'infisical':
      value = await getInfisicalSecret(key);
      break;
    case 'vercel':
    default:
      value = await getVercelSecret(key);
  }

  // Cache the result
  if (value) {
    secretsCache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return value;
}

/**
 * Get a required secret (throws if missing)
 */
export async function getRequiredSecret(key: SecretKey | string): Promise<string> {
  const value = await getSecret(key);
  if (!value) {
    throw new Error(`Required secret ${key} is not configured`);
  }
  return value;
}

/**
 * Clear the secrets cache
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
}

/**
 * Validate all required secrets are present
 */
export async function validateSecrets(
  required: SecretKey[]
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  for (const key of required) {
    const value = await getSecret(key);
    if (!value) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ==========================================
// STARTUP VALIDATION
// ==========================================

const REQUIRED_PRODUCTION_SECRETS: SecretKey[] = [
  SecretKey.DATABASE_URL,
  SecretKey.NEXTAUTH_SECRET,
  SecretKey.STRIPE_SECRET_KEY,
  SecretKey.STRIPE_WEBHOOK_SECRET,
];

/**
 * Validate secrets on startup (call in instrumentation.ts)
 */
export async function validateProductionSecrets(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const { valid, missing } = await validateSecrets(REQUIRED_PRODUCTION_SECRETS);

  if (!valid) {
    console.error('[FATAL] Missing required secrets:', missing.join(', '));
    // Don't crash in serverless, just log
    // process.exit(1);
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  getSecret,
  getRequiredSecret,
  clearSecretsCache,
  validateSecrets,
  validateProductionSecrets,
  SecretKey,
};
