// Access Code API - v2
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Check if accessCode model exists (handle case where Prisma client not regenerated)
    if (!('accessCode' in db)) {
      return NextResponse.json([])
    }
    
    const codes = await db.accessCode.findMany({
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
    const body = await request.json()
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 })
    }

    if (!('accessCode' in db)) {
      return NextResponse.json({ error: "Database model not ready. Please restart the server." }, { status: 500 })
    }

    const accessCode = await db.accessCode.create({
      data: {
        code: code.toUpperCase(),
        name
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
    const body = await request.json()
    const { id, code, name, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    if (!('accessCode' in db)) {
      return NextResponse.json({ error: "Database model not ready" }, { status: 500 })
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    if (!('accessCode' in db)) {
      return NextResponse.json({ error: "Database model not ready" }, { status: 500 })
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
