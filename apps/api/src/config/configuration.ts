export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'auto',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
});

