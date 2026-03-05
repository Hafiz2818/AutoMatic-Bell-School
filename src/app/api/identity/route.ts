import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    const identity = await db.appIdentity.findFirst()
    return NextResponse.json(identity || { schoolName: "Sekolah", address: "" })
  } catch (error) {
    console.error("Get identity error:", error)
    return NextResponse.json({ error: "Failed to get identity" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const schoolName = formData.get("schoolName") as string
    const address = formData.get("address") as string
    const logoFile = formData.get("logo") as File | null

    let logoUrl: string | undefined = undefined

    // Handle logo upload
    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `logo-${Date.now()}.${logoFile.name.split(".").pop()}`
      const filePath = path.join(process.cwd(), "public", "uploads", fileName)
      
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/${fileName}`
    }

    // Check if identity exists
    const existing = await db.appIdentity.findFirst()

    if (existing) {
      // Delete old logo if new one uploaded
      if (logoUrl && existing.logoUrl) {
        try {
          const oldPath = path.join(process.cwd(), "public", existing.logoUrl)
          await unlink(oldPath)
        } catch {
          // Ignore if file doesn't exist
        }
      }

      const updated = await db.appIdentity.update({
        where: { id: existing.id },
        data: {
          schoolName,
          address,
          ...(logoUrl && { logoUrl })
        }
      })
      return NextResponse.json(updated)
    } else {
      const created = await db.appIdentity.create({
        data: {
          schoolName,
          address,
          logoUrl
        }
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error("Update identity error:", error)
    return NextResponse.json({ error: "Failed to update identity" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const schoolName = formData.get("schoolName") as string
    const address = formData.get("address") as string
    const logoFile = formData.get("logo") as File | null

    let logoUrl: string | undefined = undefined

    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `logo-${Date.now()}.${logoFile.name.split(".").pop()}`
      const filePath = path.join(process.cwd(), "public", "uploads", fileName)
      
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/${fileName}`
    }

    const existing = await db.appIdentity.findFirst()

    if (existing) {
      if (logoUrl && existing.logoUrl) {
        try {
          const oldPath = path.join(process.cwd(), "public", existing.logoUrl)
          await unlink(oldPath)
        } catch {
          // Ignore
        }
      }

      const updated = await db.appIdentity.update({
        where: { id: existing.id },
        data: {
          schoolName,
          address,
          ...(logoUrl && { logoUrl })
        }
      })
      return NextResponse.json(updated)
    }

    const created = await db.appIdentity.create({
      data: {
        schoolName,
        address,
        logoUrl
      }
    })
    return NextResponse.json(created)
  } catch (error) {
    console.error("Put identity error:", error)
    return NextResponse.json({ error: "Failed to update identity" }, { status: 500 })
  }
}
