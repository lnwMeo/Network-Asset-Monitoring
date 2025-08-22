// src/app/api/devices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()

    // หา vendorId จากชื่อ vendor
    let vendorId = null
    if (body.vendor) {
      const vendor = await prisma.vendor.findFirst({
        where: { name: body.vendor }
      })
      vendorId = vendor?.id || null
    }

    // หา modelId จากชื่อ model
    let modelId = null
    if (body.model && vendorId) {
      const model = await prisma.model.findFirst({
        where: { 
          name: body.model,
          vendorId: vendorId
        }
      })
      modelId = model?.id || null
    }

    // หา buildingId จากชื่อ building
    let buildingId = null
    if (body.buildingCode) {
      const building = await prisma.building.findFirst({
        where: { code: body.buildingCode }
      })
      buildingId = building?.id || null
    }

    // เตรียมข้อมูลสำหรับ Prisma
    const data = {
      assetTag: body.assetTag,
      deviceId: body.deviceId || body.assetTag, // ใช้ assetTag เป็น deviceId ถ้าไม่มี deviceId
      name: body.name,
      status: body.status as any || 'ACTIVE', // cast เป็น enum
      ipAddress: body.ip || null,
      mac: body.mac || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      installDate: body.installDate ? new Date(body.installDate) : null,
      warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
      deviceTypeId: body.deviceTypeId,
      buildingId: buildingId,
      roomId: body.roomId || null,
      vendorId: vendorId,
      modelId: modelId
    }

    const updated = await prisma.device.update({
      where: { id },
      data,
      include: {
        deviceType: true,
        vendor: true,
        model: true,
        building: true,
        room: true
      }
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { error: 'Failed to update device' }, 
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        deviceType: true,
        vendor: true,
        model: true,
        building: true,
        room: true,
        images: true
      }
    })

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json(device)

  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    await prisma.device.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Device deleted successfully' })

  } catch (error) {
    console.error('Error deleting device:', error)
    return NextResponse.json(
      { error: 'Failed to delete device' }, 
      { status: 500 }
    )
  }
}