import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const buildings = await prisma.building.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            code: true,
            name: true
        }
    })
    return NextResponse.json(buildings)
}


export async function POST(req: NextRequest) {
    const { code, name } = await req.json()
    const b = await prisma.building.create({
        data: { code, name }
    })
    return NextResponse.json(b, { status: 201 })
}