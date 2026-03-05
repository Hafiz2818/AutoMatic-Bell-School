import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
    }

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password, // For simplicity, store plain text (not recommended for production)
        name: name || email.split("@")[0],
        role: "user"
      }
    })

    // Create default app identity for the user
    await db.appIdentity.create({
      data: {
        schoolName: "Sekolah Saya",
        description: "Deskripsi sekolah Anda",
        address: "",
        userId: user.id
      }
    })

    // Create default access code for the user
    const defaultCode = `PETUGAS-${Date.now().toString(36).toUpperCase()}`
    await db.accessCode.create({
      data: {
        code: defaultCode,
        name: "Petugas Default",
        userId: user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Registrasi berhasil",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      defaultAccessCode: defaultCode
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ 
      error: "Registrasi gagal",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
