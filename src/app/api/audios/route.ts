import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import path from "path"
import { existsSync, mkdirSync } from "fs"

// Ensure audio directory exists
const audioDir = path.join(process.cwd(), "public", "audio")
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true })
}

export async function GET() {
  try {
    const audios = await db.audio.findMany({
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(audios)
  } catch (error) {
    console.error("Get audios error:", error)
    return NextResponse.json({ error: "Failed to get audios" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null
    const name = formData.get("name") as string

    console.log("Upload request received:", {
      hasFile: !!audioFile,
      fileName: audioFile?.name,
      fileSize: audioFile?.size,
      fileType: audioFile?.type,
      name
    })

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 })
    }

    // Ensure directory exists
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true })
    }

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Clean filename - remove special characters
    const cleanName = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `audio-${Date.now()}-${cleanName}`
    const filePath = path.join(audioDir, fileName)
    
    console.log("Writing file to:", filePath)
    await writeFile(filePath, buffer)
    console.log("File written successfully")

    const audio = await db.audio.create({
      data: {
        name: name || audioFile.name.replace(/\.[^/.]+$/, ""),
        originalName: audioFile.name,
        mimeType: audioFile.type || "audio/mpeg",
        size: audioFile.size,
        filePath: `/audio/${fileName}`
      }
    })

    console.log("Audio record created:", audio.id)

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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Get audio info first
    const audio = await db.audio.findUnique({
      where: { id }
    })

    if (!audio) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 })
    }

    // Delete file
    try {
      const filePath = path.join(process.cwd(), "public", audio.filePath)
      await unlink(filePath)
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
