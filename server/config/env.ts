import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  appUrl: string;
  corsOrigin: string;
  geminiApiKey: string;
  hasGeminiKey: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimits: {
    general: number;
    auth: number;
    ai: number;
    execution: number;
  };
  executionLimits: {
    maxCodeSizeBytes: number;
    executionTimeoutMs: number;
    maxOutputLengthChars: number;
  };
  mcpServerUrl: string;
  transformerServiceUrl: string;
  databasePath: string;
  workspaceRetentionHours: number;
}

function parseNumber(val: string | undefined, defaultVal: number): number {
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey.trim() !== '' && geminiApiKey !== 'MY_GEMINI_API_KEY');

const jwtSecret = process.env.JWT_SECRET || 'devfix_fallback_jwt_secret_dev_only_32_chars';

// Fail early in production if JWT secret is default or empty
if (nodeEnv === 'production' && jwtSecret === 'devfix_fallback_jwt_secret_dev_only_32_chars') {
  console.warn('[SECURITY WARNING]: Using default JWT_SECRET in production. Set a strong secret via environment variable.');
}

if (!hasGeminiKey) {
  if (nodeEnv === 'production' && process.env.REQUIRE_GEMINI === 'true') {
    throw new Error('[CONFIG ERROR]: GEMINI_API_KEY is missing in production environment.');
  } else {
    console.info('[Config Notice]: GEMINI_API_KEY not configured. Multi-agent system will use model router fallback (local Transformer or static analysis).');
  }
}

export const config: AppConfig = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  geminiApiKey,
  hasGeminiKey,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  rateLimits: {
    general: parseNumber(process.env.RATE_LIMIT_GENERAL, 120),
    auth: parseNumber(process.env.RATE_LIMIT_AUTH, 15),
    ai: parseNumber(process.env.RATE_LIMIT_AI, 20),
    execution: parseNumber(process.env.RATE_LIMIT_EXECUTION, 30),
  },
  executionLimits: {
    maxCodeSizeBytes: parseNumber(process.env.MAX_CODE_SIZE_BYTES, 65536), // 64 KB
    executionTimeoutMs: parseNumber(process.env.EXECUTION_TIMEOUT_MS, 6000), // 6s
    maxOutputLengthChars: parseNumber(process.env.MAX_OUTPUT_LENGTH_CHARS, 10000),
  },
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000/api/mcp',
  transformerServiceUrl: process.env.TRANSFORMER_SERVICE_URL || 'http://localhost:3000/api/transformer',
  databasePath: process.env.DATABASE_PATH || './data/devfix.json',
  workspaceRetentionHours: parseNumber(process.env.WORKSPACE_RETENTION_HOURS, 24),
};

// Safe config summary for logs/telemetry (never prints secrets!)
export function getSafeConfigSummary() {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    hasGeminiKey: config.hasGeminiKey,
    hasJwtSecret: Boolean(config.jwtSecret),
    rateLimits: config.rateLimits,
    executionLimits: config.executionLimits,
    mcpServerUrl: config.mcpServerUrl,
    transformerServiceUrl: config.transformerServiceUrl,
  };
}
