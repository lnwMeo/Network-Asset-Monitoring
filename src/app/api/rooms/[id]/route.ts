import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
    const { params } = context
    const { id: idParam } = await params
    const id = Number(idParam)

    const { name } = await request.json()
    const updated = await prisma.model.update({
        where: { id },
        data: { name }
    })
    return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {

    const { params } = context
    const { id: idParam } = await params
    const id = Number(idParam)

    await prisma.room.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}