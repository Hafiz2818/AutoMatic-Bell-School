// src/lib/db.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaAdapter: any | undefined
}

// ✅ Buat path absolut untuk SQLite
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/custom.db'
const absoluteDbPath = path.resolve(process.cwd(), dbPath)

// ✅ Buat adapter
const adapter =
  globalForPrisma.prismaAdapter ??
  new PrismaLibSql({
    url: `file:${absoluteDbPath}`,
  })

// ✅ Buat PrismaClient dengan adapter
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query'],
  })

// ✅ Global caching untuk development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.prismaAdapter = adapter
}