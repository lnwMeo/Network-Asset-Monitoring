// app/api/devicetypes/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
const BodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export async function PUT(
req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 params เป็น Promise
) {
  try {
    const { id } = await params;                  // 👈 ต้อง await ก่อนใช้
    const deviceTypeId = Number(id);
    if (!Number.isFinite(deviceTypeId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const deviceType = await prisma.deviceType.update({
      where: { id: deviceTypeId },
      data: { name: parsed.data.name },
    });

    return NextResponse.json(deviceType);
  } catch (error) {
    console.error("Error updating device type:", error);
    return NextResponse.json({ error: "Failed to update device type" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params;                 
    const deviceTypeId = Number(id);
    if (!Number.isFinite(deviceTypeId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // กันลบถ้ามีการใช้งานอยู่
    const inUse = await prisma.device.count({ where: { deviceTypeId } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: "DeviceType is in use", count: inUse },
        { status: 409 }
      );
    }

    await prisma.deviceType.delete({ where: { id: deviceTypeId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}