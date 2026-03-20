import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3002,http://localhost:3003'),
  BCRYPT_SALT_ROUNDS: z.string().default('12'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = {
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parseInt(parsed.data.PORT, 10),
  MONGODB_URI: parsed.data.MONGODB_URI,
  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: parsed.data.JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY: parsed.data.JWT_REFRESH_EXPIRY,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN,
  BCRYPT_SALT_ROUNDS: parseInt(parsed.data.BCRYPT_SALT_ROUNDS, 10),
  LOG_LEVEL: parsed.data.LOG_LEVEL,
  IS_PRODUCTION: parsed.data.NODE_ENV === 'production',
  RAZORPAY_KEY_ID: parsed.data.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: parsed.data.RAZORPAY_KEY_SECRET,
} as const;

export default env;
