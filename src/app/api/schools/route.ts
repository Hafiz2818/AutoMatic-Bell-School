import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Public endpoint to get all registered schools
export async function GET() {
  try {
    const schools = await db.appIdentity.findMany({
      select: {
        id: true,
        schoolName: true,
        description: true,
        address: true,
        logoUrl: true,
        user: {
          select: {
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    // Transform data for public display
    const publicSchools = schools.map(school => ({
      id: school.id,
      schoolName: school.schoolName,
      description: school.description,
      address: school.address,
      logoUrl: school.logoUrl,
      adminName: school.user.name,
      registeredAt: school.user.createdAt
    }))

    return NextResponse.json(publicSchools)
  } catch (error) {
    console.error("Get schools error:", error)
    return NextResponse.json([])
  }
}
