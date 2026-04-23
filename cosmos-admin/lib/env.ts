import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),
})

const envData = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
}

const envParse = envSchema.safeParse(envData)

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', envParse.error.format())
  throw new Error('Invalid environment variables')
}

export const env = envParse.data
