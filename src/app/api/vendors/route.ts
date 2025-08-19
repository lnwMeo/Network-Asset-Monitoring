import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(vendors)
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  const v = await prisma.vendor.create({
    data: { name },
  })
  return NextResponse.json(v, { status: 201 })
}
