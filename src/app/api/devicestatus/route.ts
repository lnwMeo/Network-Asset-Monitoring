import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const devicestatuss = await prisma.deviceStatus.findMany({
            orderBy: { name: "asc" }
        });
        return NextResponse.json(devicestatuss);
    } catch (error) {
        console.error("Error fetching device statuses:", error);
        return NextResponse.json(
            { error: "Failed to fetch device statuses" },
            { status: 500 }
        );
    }
}


export async function POST(req: NextRequest) {
    const { name } = await req.json()
    const dt = await prisma.deviceStatus.create({
        data: {
            name
        }
    })
    return NextResponse.json(dt, { status: 201 })
}