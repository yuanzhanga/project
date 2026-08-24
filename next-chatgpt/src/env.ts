import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-flash-vision-exp'),
  MODEL_PROVIDER: z.enum(['openai', 'deepseek', 'mock']).default('mock'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_EMBED_MODEL: z.string().default('bge-m3'),
  RAG_TOP_K: z.string().default('5'),
  MAX_CONTEXT_TOKENS: z.string().default('8000'),
  SUMMARY_THRESHOLD: z.string().default('4000'),
})

export const env = envSchema.parse(process.env)
