import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import path from "path"

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads")
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

export async function GET() {
  try {
    const identity = await db.appIdentity.findFirst()
    return NextResponse.json(identity || { 
      schoolName: "Sekolah", 
      description: "",
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
    const formData = await request.formData()
    const schoolName = formData.get("schoolName") as string || "Sekolah"
    const description = formData.get("description") as string || ""
    const address = formData.get("address") as string || ""
    const logoFile = formData.get("logo") as File | null

    console.log("Identity POST request:", {
      schoolName,
      description,
      address,
      hasLogoFile: !!logoFile,
      logoFileSize: logoFile?.size,
      logoFileType: logoFile?.type
    })

    let logoUrl: string | undefined = undefined

    // Handle logo upload
    if (logoFile && logoFile.size > 0) {
      // Ensure uploads directory exists
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true })
      }

      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Get file extension
      const ext = logoFile.name.split(".").pop() || "png"
      const fileName = `logo-${Date.now()}.${ext}`
      const filePath = path.join(uploadsDir, fileName)
      
      console.log("Writing logo to:", filePath)
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/${fileName}`
      console.log("Logo URL:", logoUrl)
    }

    // Check if identity exists
    const existing = await db.appIdentity.findFirst()

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
          logoUrl
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
  // Same as POST for this use case
  return POST(request)
}
