// src/app/api/devices/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Prisma, DeviceStatus } from "@prisma/client"


const bodySchema = z.object({
  assetTag: z.string().min(1),
  deviceId: z.string().optional(),            // ถ้าไม่ส่ง จะ fallback เป็น assetTag
  name: z.string().min(1),
  statusId: z.number().int().positive().optional(),
  ip: z.string().nullable().optional(),
  mac: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  installDate: z.string().nullable().optional(),
  warrantyEnd: z.string().nullable().optional(),
  deviceTypeId: z.number(),
  buildingCode: z.string().min(1),
  roomId: z.number().nullable().optional(),
  vendor: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1) ให้ body เป็น type ชัดเจน ไม่ใช่ any
    const input = bodySchema.parse(await req.json())

    // 2) หา id ของความสัมพันธ์
    const vendorId =
      input.vendor
        ? (await prisma.vendor.findFirst({ where: { name: input.vendor } }))?.id ?? null
        : null

    const modelId =
      input.model && vendorId
        ? (await prisma.model.findFirst({ where: { name: input.model, vendorId } }))?.id ?? null
        : null

    const buildingId =
      (await prisma.building.findFirst({ where: { code: input.buildingCode } }))?.id ?? null

    if (!buildingId) {
      return NextResponse.json({ error: "Invalid buildingCode" }, { status: 400 })
    }

    // 3) กำหนดชนิดให้ data แบบชัดเจน (สองวิธี เลือกอย่างใดอย่างหนึ่ง)

    // วิธี A: ใส่ชนิดให้ตัวแปร
    const dataA: Prisma.DeviceUncheckedCreateInput = {
      assetTag: input.assetTag,
      deviceId: input.deviceId ?? input.assetTag,
      name: input.name,
      statusId: input.statusId ?? null,
      ipAddress: input.ip ?? null,
      mac: input.mac ?? null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      installDate: input.installDate ? new Date(input.installDate) : null,
      warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
      deviceTypeId: input.deviceTypeId,
      buildingId,
      roomId: input.roomId ?? null,
      vendorId,
      modelId,
    }

    // หรือ วิธี B: ใช้ `satisfies` (เด้ง error ถ้า shape ไม่ตรง แต่ไม่ cast ทิ้ง)
    const data = {
      assetTag: input.assetTag,
      deviceId: input.deviceId ?? input.assetTag,
      name: input.name,
      statusId: input.statusId ?? null,
      ipAddress: input.ip ?? null,
      mac: input.mac ?? null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      installDate: input.installDate ? new Date(input.installDate) : null,
      warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
      deviceTypeId: input.deviceTypeId,
      buildingId,
      roomId: input.roomId ?? null,
      vendorId,
      modelId,
    } satisfies Prisma.DeviceUncheckedCreateInput

    const created = await prisma.device.create({
      data, // ใช้ data (หรือ dataA ถ้าคุณเลือกวิธี A)
      include: {
        deviceType: true,
        vendor: true,
        model: true,
        building: true,
        room: true,
        status: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.flatten() }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
  }
}






export async function GET() {
  console.log('🔍 API GET /api/devices called')

  try {
    // ทดสอบการเชื่อมต่อ database ก่อน
    console.log('📡 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // ลองนับจำนวน device ก่อน
    const deviceCount = await prisma.device.count()
    console.log(`📊 Found ${deviceCount} devices in database`)

    // ถ้าไม่มีข้อมูล ให้ return empty array
    if (deviceCount === 0) {
      console.log('📭 No devices found, returning empty array')
      return NextResponse.json([])
    }

    // ดึงข้อมูลทีละขั้นตอน
    console.log('🔄 Fetching devices with relations...')
    const devices = await prisma.device.findMany({
      include: {
        deviceType: {
          select: {
            id: true,
            name: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        status: {
          select: {
            id: true,
            name: true
          }
        },
        model: {
          select: {
            id: true,
            name: true
          }
        },
        building: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            originalName: true,
            isPrimary: true
          }
        }
      },
      orderBy: { id: 'desc' }, // เปลี่ยนจาก createdAt เป็น id ก่อน
      take: 100 // จำกัดจำนวนก่อน เผื่อข้อมูลเยอะ
    })

    console.log(`✅ Successfully fetched ${devices.length} devices`)

    return NextResponse.json(devices)

  } catch (error) {
    console.error('❌ Error in GET /api/devices:', error)

    // แสดงรายละเอียด error มากขึ้น
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // ตรวจสอบ specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', (error).code)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch devices',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )

  } finally {
    // ปิดการเชื่อมต่อ
    await prisma.$disconnect()
    console.log('🔌 Database disconnected')
  }
}