import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const schedules = await db.schedule.findMany({
      orderBy: [
        { day: "asc" },
        { time: "asc" }
      ]
    })
    return NextResponse.json(schedules)
  } catch (error) {
    console.error("Get schedules error:", error)
    return NextResponse.json({ error: "Failed to get schedules" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, day, time, audioId, audioName } = body

    if (!name || !day || !time) {
      return NextResponse.json({ error: "Name, day, and time are required" }, { status: 400 })
    }

    const schedule = await db.schedule.create({
      data: {
        name,
        day,
        time,
        audioId,
        audioName,
        isActive: true
      }
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("Create schedule error:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, day, time, audioId, audioName, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const schedule = await db.schedule.update({
      where: { id },
      data: {
        name,
        day,
        time,
        audioId,
        audioName,
        isActive
      }
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("Update schedule error:", error)
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await db.schedule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete schedule error:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}
