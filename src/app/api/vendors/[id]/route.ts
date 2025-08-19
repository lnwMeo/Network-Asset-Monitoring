import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: idParam } = await params // ✅ await params ก่อนใช้งาน
  const id = Number(idParam)
  const { name } = await req.json()

  const v = await prisma.vendor.update({
    where: { id },
    data: { name },
  })
  return NextResponse.json(v)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: idParam } = await params // ✅ await params ก่อนใช้งาน
  const id = Number(idParam)
  await prisma.vendor.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}