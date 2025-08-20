import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  const id = Number(params.imageId)

  try {
    // ดึงข้อมูลรูปจาก DB เพื่อนำ path ไปลบไฟล์จริง
    const img = await prisma.deviceImage.findUnique({ where: { id } })
    if (!img) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // ลบ record ใน Database
    await prisma.deviceImage.delete({ where: { id } })

    // ลบไฟล์ใน public folder ด้วย
    const filePath = join(process.cwd(), "public", img.url) // เช่น /public/uploads/devices/xxxxx.png
    await unlink(filePath)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}

// PATCH → set image นี้ให้เป็น primary
export async function PATCH(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  const id = Number(params.imageId)

  try {
    // หารูปว่าของ device ไหน
    const img = await prisma.deviceImage.findUnique({ where: { id } })
    if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const deviceId = img.deviceId

    // clear primary รูปอื่น
    await prisma.deviceImage.updateMany({
      where: { deviceId, NOT: { id } },
      data: { isPrimary: false },
    })

    // set primary ให้รูปนี้
    const updated = await prisma.deviceImage.update({
      where: { id },
      data: { isPrimary: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error setting primary image:", error)
    return NextResponse.json({ error: "Failed to set primary" }, { status: 500 })
  }
}
