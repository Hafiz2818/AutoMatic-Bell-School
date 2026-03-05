// Seed API - v2
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
      await db.user.create({
        data: {
          email: "admin@sekolah.com",
          password: "admin123",
          name: "Administrator",
          role: "admin"
        }
      })
    }

    // Create default app identity
    const existingIdentity = await db.appIdentity.findFirst()
    if (!existingIdentity) {
      await db.appIdentity.create({
        data: {
          schoolName: "Sekolah Negeri 1",
          address: "Jl. Pendidikan No. 1"
        }
      })
    }

    // Create default access code for petugas (handle case where model doesn't exist yet)
    let petugasCode = "PETUGAS2024"
    
    if ('accessCode' in db) {
      try {
        const existingCode = await db.accessCode.findFirst()
        if (!existingCode) {
          await db.accessCode.create({
            data: {
              code: "PETUGAS2024",
              name: "Petugas Jadwal Default"
            }
          })
        } else {
          petugasCode = existingCode.code
        }
      } catch (e) {
        console.log("Could not create access code:", e)
      }
    }

    return NextResponse.json({ 
      message: "Seed completed successfully",
      admin: { email: "admin@sekolah.com", password: "admin123" },
      petugasCode
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Seed failed" }, { status: 500 })
  }
}
