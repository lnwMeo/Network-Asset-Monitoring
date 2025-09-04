import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const deviceId = Number(id);
    if (isNaN(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadedImages = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) continue // max=5MB ป้องกัน

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const ext = file.name.split('.').pop()
      const filename = `${uuidv4()}.${ext}`
      const uploadDir = join(process.cwd(), 'public/uploads/devices')

      await mkdir(uploadDir, { recursive: true })

      const filePath = join(uploadDir, filename)
      await writeFile(filePath, buffer)

      const existingImagesCount = await prisma.deviceImage.count({
        where: { deviceId }
      })

      const saved = await prisma.deviceImage.create({
        data: {
          deviceId,
          filename,
          originalName: file.name,
          url: `/uploads/devices/${filename}`,
          mimeType: file.type,
          size: buffer.length,
          isPrimary: existingImagesCount === 0
        }
      })

      uploadedImages.push(saved)
    }

    return NextResponse.json(uploadedImages)
  } catch (error) {
    console.error('Error uploading images:', error)
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const deviceId = Number(id);
    if (isNaN(deviceId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const images = await prisma.deviceImage.findMany({
      where: { deviceId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}



