// app/api/devicetypes/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await req.json();
    const id = parseInt(params.id);

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const deviceType = await prisma.deviceType.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json(deviceType);
  } catch (error) {
    console.error("Error updating device type:", error);
    return NextResponse.json(
      { error: "Failed to update device type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    // ตรวจสอบว่ามีการใช้ device type นี้อยู่หรือไม่
    const deviceCount = await prisma.device.count({
      where: { deviceTypeId: id }
    });

    if (deviceCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete device type that is in use" },
        { status: 400 }
      );
    }

    await prisma.deviceType.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Device type deleted successfully" });
  } catch (error) {
    console.error("Error deleting device type:", error);
    return NextResponse.json(
      { error: "Failed to delete device type" },
      { status: 500 }
    );
  }
}