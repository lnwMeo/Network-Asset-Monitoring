import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const id = Number(params.id)
  const { code, name } = await req.json()

  const updated = await prisma.building.update({
    where: { id },
    data: { code, name },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string }}) {
  const id = Number(params.id)
  await prisma.building.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
