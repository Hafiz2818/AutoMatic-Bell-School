import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Ensure audio directory exists
const audioDir = path.join(process.cwd(), "public", "audio")
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true })
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get("userId")
    
    // Use query userId (for petugas access) or session userId (for admin)
    const targetUserId = queryUserId || session?.user?.id
    
    if (!targetUserId) {
      return NextResponse.json([])
    }

    const audios = await db.audio.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(audios)
  } catch (error) {
    console.error("Get audios error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null
    const name = formData.get("name") as string

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 })
    }

    // Ensure directory exists
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true })
    }

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const cleanName = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `audio-${session.user.id}-${Date.now()}-${cleanName}`
    const filePath = path.join(audioDir, fileName)
    
    await writeFile(filePath, buffer)

    const audio = await db.audio.create({
      data: {
        name: name || audioFile.name.replace(/\.[^/.]+$/, ""),
        originalName: audioFile.name,
        mimeType: audioFile.type || "audio/mpeg",
        size: audioFile.size,
        filePath: `/audio/${fileName}`,
        userId: session.user.id
      }
    })

    return NextResponse.json(audio)
  } catch (error) {
    console.error("Upload audio error:", error)
    return NextResponse.json({ 
      error: "Failed to upload audio",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
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

    // Get audio info first and verify ownership
    const audio = await db.audio.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!audio) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 })
    }

    // Delete file
    try {
      const filePath = path.join(process.cwd(), "public", audio.filePath)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch {
      // Ignore if file doesn't exist
    }

    // Delete from database
    await db.audio.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete audio error:", error)
    return NextResponse.json({ error: "Failed to delete audio" }, { status: 500 })
  }
}
