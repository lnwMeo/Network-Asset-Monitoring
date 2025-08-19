import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/models?vendorId=
export async function GET(req: NextRequest) {
  const vendorIdParam = req.nextUrl.searchParams.get("vendorId")
  
  // ✅ เช็คว่ามี vendorId และเป็นตัวเลขที่ถูกต้อง
  if (!vendorIdParam) return NextResponse.json([])
  
  const vendorId = Number(vendorIdParam)
  if (isNaN(vendorId) || vendorId <= 0) {
    return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 })
  }

  const models = await prisma.model.findMany({
    where: { vendorId },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(models)
}

// POST /api/models
export async function POST(req: NextRequest) {
  try {
    const { name, vendorId } = await req.json()
    
    // ✅ เพิ่ม validation
    if (!name || !vendorId) {
      return NextResponse.json(
        { error: "Name and vendorId are required" }, 
        { status: 400 }
      )
    }

    const m = await prisma.model.create({
      data: { name, vendorId },
    })
    return NextResponse.json(m, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create model" }, 
      { status: 500 },
      
    )
  }
}