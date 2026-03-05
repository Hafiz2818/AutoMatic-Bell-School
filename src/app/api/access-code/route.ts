import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json([])
    }

    const codes = await db.accessCode.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(codes)
  } catch (error) {
    console.error("Get access codes error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 })
    }

    // Check if code already exists for this user
    const existing = await db.accessCode.findFirst({
      where: { 
        code: code.toUpperCase(),
        userId: session.user.id 
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Kode akses sudah ada" }, { status: 400 })
    }

    const accessCode = await db.accessCode.create({
      data: {
        code: code.toUpperCase(),
        name,
        userId: session.user.id
      }
    })

    return NextResponse.json(accessCode)
  } catch (error) {
    console.error("Create access code error:", error)
    return NextResponse.json({ error: "Failed to create access code" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, code, name, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.accessCode.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Access code not found" }, { status: 404 })
    }

    const accessCode = await db.accessCode.update({
      where: { id },
      data: {
        code: code?.toUpperCase(),
        name,
        isActive
      }
    })

    return NextResponse.json(accessCode)
  } catch (error) {
    console.error("Update access code error:", error)
    return NextResponse.json({ error: "Failed to update access code" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.accessCode.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Access code not found" }, { status: 404 })
    }

    await db.accessCode.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete access code error:", error)
    return NextResponse.json({ error: "Failed to delete access code" }, { status: 500 })
  }
}

// Verify access code (public endpoint for petugas login)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const accessCode = await db.accessCode.findFirst({
      where: { 
        code: code.toUpperCase(),
        isActive: true 
      },
      include: {
        user: {
          include: {
            appIdentity: true
          }
        }
      }
    })

    if (!accessCode) {
      return NextResponse.json({ error: "Kode akses tidak valid atau tidak aktif" }, { status: 404 })
    }

    return NextResponse.json({ 
      valid: true,
      name: accessCode.name,
      userId: accessCode.userId,
      schoolName: accessCode.user.appIdentity?.schoolName || "Sekolah"
    })
  } catch (error) {
    console.error("Verify access code error:", error)
    return NextResponse.json({ error: "Failed to verify access code" }, { status: 500 })
  }
}
