import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const devicetypes = await prisma.deviceType.findMany({
        orderBy: { name: "asc" }
    })
    return NextResponse.json(devicetypes)
}


export async function POST(req: NextRequest) {
    const { name } = await req.json()
    const dt = await prisma.deviceType.create({
        data: {
            name
        }
    })
    return NextResponse.json(dt, { status: 201 })
}