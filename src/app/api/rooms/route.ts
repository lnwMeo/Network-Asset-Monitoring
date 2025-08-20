import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const buildingIdParam = req.nextUrl.searchParams.get("buildingId")

    if (!buildingIdParam) return NextResponse.json([])

    const buildingId = Number(buildingIdParam)
    if (isNaN(buildingId) || buildingId <= 0) {
        return NextResponse.json({ error: "Invalid buildingId" }, { status: 400 })
    }

    const rooms = await prisma.room.findMany({
        where: { buildingId },
        orderBy: { name: "asc" }
    })
    return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
    try {
        const { name, buildingId } = await req.json()

        if (!name || !buildingId) {
            return NextResponse.json(
                { error: "Name and buildingId are request" },
                { status: 400 }
            )
        }

        const ro = await prisma.room.create({
            data: { name, buildingId }
        })
        return NextResponse.json(ro, { status: 201 })
    } catch {
        return NextResponse.json(
            { error: "Failed to create room" },
            { status: 500 }
        )
    }
}