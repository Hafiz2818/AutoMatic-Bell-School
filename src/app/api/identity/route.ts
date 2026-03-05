import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads")
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        schoolName: "Aplikasi Bel Sekolah", 
        description: "Silakan login untuk mengelola data sekolah Anda",
        address: "",
        logoUrl: ""
      })
    }

    // Use findFirst instead of findUnique for better compatibility
    const identity = await db.appIdentity.findFirst({
      where: { userId: session.user.id }
    })

    return NextResponse.json(identity || { 
      schoolName: "Sekolah Saya", 
      description: "Deskripsi sekolah Anda",
      address: "",
      logoUrl: ""
    })
  } catch (error) {
    console.error("Get identity error:", error)
    return NextResponse.json({ 
      schoolName: "Sekolah", 
      description: "",
      address: "",
      logoUrl: ""
    })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const schoolName = formData.get("schoolName") as string || "Sekolah"
    const description = formData.get("description") as string || ""
    const address = formData.get("address") as string || ""
    const logoFile = formData.get("logo") as File | null

    console.log("Identity POST request:", {
      userId: session.user.id,
      schoolName,
      description,
      address,
      hasLogoFile: !!logoFile,
      logoFileSize: logoFile?.size
    })

    let logoUrl: string | undefined = undefined

    // Handle logo upload
    if (logoFile && logoFile.size > 0) {
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true })
      }

      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const ext = logoFile.name.split(".").pop() || "png"
      const fileName = `logo-${session.user.id}-${Date.now()}.${ext}`
      const filePath = path.join(uploadsDir, fileName)
      
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/${fileName}`
      console.log("Logo saved:", logoUrl)
    }

    // Use findFirst instead of findUnique for compatibility
    const existing = await db.appIdentity.findFirst({
      where: { userId: session.user.id }
    })

    if (existing) {
      // Delete old logo if new one uploaded
      if (logoUrl && existing.logoUrl) {
        try {
          const oldPath = path.join(process.cwd(), "public", existing.logoUrl)
          if (existsSync(oldPath)) {
            await unlink(oldPath)
          }
        } catch (e) {
          console.log("Could not delete old logo:", e)
        }
      }

      // Update using id instead of userId
      const updated = await db.appIdentity.update({
        where: { id: existing.id },
        data: {
          schoolName,
          description,
          address,
          ...(logoUrl && { logoUrl })
        }
      })
      console.log("Identity updated:", updated)
      return NextResponse.json(updated)
    } else {
      const created = await db.appIdentity.create({
        data: {
          schoolName,
          description,
          address,
          logoUrl,
          userId: session.user.id
        }
      })
      console.log("Identity created:", created)
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error("Update identity error:", error)
    return NextResponse.json({ 
      error: "Failed to update identity",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  return POST(request)
}
