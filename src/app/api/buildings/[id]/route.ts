import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { code, name } = await req.json()

  const updated = await prisma.building.update({
    where: { id },
    data: { code, name },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;                 // ✅ await แล้วดึง id ออกมา
    const buildingId = Number(id);
    if (!Number.isInteger(buildingId) || buildingId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // ✅ กันลบถ้ามีการใช้งานอยู่
    const [roomCount, deviceCount] = await Promise.all([
      prisma.room.count({ where: { buildingId } }),
      prisma.device.count({ where: { buildingId } }),
    ]);
    if (roomCount > 0 || deviceCount > 0) {
      return NextResponse.json(
        { error: "Building is in use", rooms: roomCount, devices: deviceCount },
        { status: 409 }
      );
    }

    await prisma.building.delete({ where: { id: buildingId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
   console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
