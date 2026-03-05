import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Check if admin user exists
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@sekolah.com" }
    })

    if (!existingAdmin) {
      // Create admin user
      const admin = await db.user.create({
        data: {
          email: "admin@sekolah.com",
          password: "admin123",
          name: "Administrator",
          role: "admin"
        }
      })

      // Create default app identity for admin
      await db.appIdentity.create({
        data: {
          schoolName: "Sekolah Negeri 1",
          description: "Sekolah dengan sistem bel otomatis modern",
          address: "Jl. Pendidikan No. 1",
          userId: admin.id
        }
      })

      // Create default access code for admin
      const defaultCode = "ADMIN2024"
      await db.accessCode.create({
        data: {
          code: defaultCode,
          name: "Admin Default",
          userId: admin.id
        }
      })

      return NextResponse.json({ 
        message: "Seed completed - Admin created",
        admin: { email: "admin@sekolah.com", password: "admin123" },
        defaultAccessCode: defaultCode
      })
    }

    // Get existing admin's access code
    const accessCode = await db.accessCode.findFirst({
      where: { userId: existingAdmin.id }
    })

    return NextResponse.json({ 
      message: "Admin already exists",
      admin: { email: "admin@sekolah.com", password: "admin123" },
      defaultAccessCode: accessCode?.code || "ADMIN2024"
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ 
      error: "Seed failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
