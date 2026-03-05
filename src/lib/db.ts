// Database client - Force refresh version
import { PrismaClient } from '@prisma/client'

// Use a fresh PrismaClient instance to pick up new models
// @ts-ignore
delete globalThis.prisma

export const db = new PrismaClient({
  log: ['query'],
})

// Store for development hot reload
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  globalThis.prisma = db
}
