import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  MODEL_PROVIDER: z.enum(['openai', 'deepseek', 'mock']).default('mock'),
  MAX_CONTEXT_TOKENS: z.string().default('8000'),
  SUMMARY_THRESHOLD: z.string().default('4000'),
})

export const env = envSchema.parse(process.env)
