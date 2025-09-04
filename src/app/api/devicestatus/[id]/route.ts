import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server";

import { z } from "zod"
const BodySchema = z.object({
    name: z.string().trim().min(1, "StatusName is required")
})

export async function PUT(
    req: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const statusId = Number(id);

        if (!Number.isFinite(statusId)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 })
        }

        const body = await req.json();
        const parsed = BodySchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", issues: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const deviceStatus = await prisma.deviceStatus.update({
            where: { id: statusId },
            data: { name: parsed.data.name }
        })

        return NextResponse.json(deviceStatus)
    } catch (error) {
        console.error("Error update StatusName",error)
        return NextResponse.json({error:"Failed to update StatusName"})

    }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params;                 
    const statusId = Number(id);
    if (!Number.isFinite(statusId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // กันลบถ้ามีการใช้งานอยู่
    const inUse = await prisma.device.count({ where: { statusId } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: "DeviceStatus is in use", count: inUse },
        { status: 409 }
      );
    }

    await prisma.deviceStatus.delete({ where: { id: statusId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}