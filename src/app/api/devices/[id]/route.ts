// src/app/api/devices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import path from "node:path";
import { promises as fs } from "node:fs";

type Ctx = { params: Promise<{ id: string }> };

// function toUtcDate(s?: string | null) {
//   if (!s) return null;
//   const d = new Date(s);
//   return isNaN(d.getTime()) ? null : d;
// }

async function safeUnlinkPublicFile(url?: string | null) {
  if (!url) return;
  const filename = url.split("/").pop();
  if (!filename) return;
  const abs = path.join(process.cwd(), "public", "uploads", "devices", filename);
  try { await fs.unlink(abs); } catch { /* ignore */ }
}

function inferMimeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "bmp": return "image/bmp";
    case "svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
}

async function statPublicUploadSize(filename: string): Promise<number> {
  const abs = path.join(process.cwd(), "public", "uploads", "devices", filename);
  try {
    const st = await fs.stat(abs);
    return st.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

const badRequest = (m = "Bad request") => NextResponse.json({ error: m }, { status: 400 });
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
// const conflict  = (m = "Conflict") => NextResponse.json({ error: m }, { status: 409 });
const serverErr = (m = "Server error") => NextResponse.json({ error: m }, { status: 500 });

/** ✅ ใช้ PATCH สำหรับแก้บางฟิลด์ (partial update) */
// helper: "" -> null, trim
const normalize = (v: any) => {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

// helper: string(date) -> Date|null
const toDate = (v: any) => (v ? new Date(String(v)) : null)

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const deviceId = Number(id);
  if (!Number.isFinite(deviceId)) return badRequest("Invalid id");

  const exists = await prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
  if (!exists) return notFound();

  try {
    const body = await req.json();

    // -------- map body -> data (สำคัญมาก) --------
    const data: Prisma.DeviceUncheckedUpdateInput = {};

    if ("assetTag" in body) data.assetTag = String(body.assetTag ?? "");
    if ("deviceId" in body) data.deviceId = body.deviceId ? String(body.deviceId) : String(body.assetTag ?? "");
    if ("name" in body) data.name = String(body.name ?? "");

    // statusId หรือ status (name)
    if ("statusId" in body) {
      data.statusId = body.statusId ?? null;
    } else if ("status" in body && body.status != null) {
      const st = await prisma.deviceStatus.findFirst({ where: { name: String(body.status) }, select: { id: true } });
      data.statusId = st?.id ?? null;
    }

    if ("ip" in body) data.ipAddress = body.ip ? String(body.ip).trim() : null;
    if ("mac" in body) data.mac = body.mac ? String(body.mac).trim() : null;

    // parse date (string -> Date|null)
    const toDate = (v: any) => v ? new Date(String(v)) : null;
    if ("purchaseDate" in body) data.purchaseDate = toDate(body.purchaseDate);
    if ("installDate" in body) data.installDate = toDate(body.installDate);
    if ("warrantyEnd" in body) data.warrantyEnd = toDate(body.warrantyEnd);

    if ("deviceTypeId" in body) data.deviceTypeId = body.deviceTypeId ?? null;

    if ("roomId" in body) {
      data.roomId = body.roomId === null || body.roomId === "" ? null : Number(body.roomId);
    }

    // buildingCode -> buildingId
    if ("buildingCode" in body) {
      if (body.buildingCode) {
        const b = await prisma.building.findFirst({ where: { code: String(body.buildingCode) }, select: { id: true } });
        if (!b) return badRequest("Invalid buildingCode");
        data.buildingId = b.id;
      } else {
        data.buildingId = null;
      }
    }

    // vendor/model จากชื่อ
    if ("vendor" in body) {
      if (body.vendor) {
        const v = await prisma.vendor.findFirst({ where: { name: String(body.vendor) }, select: { id: true } });
        data.vendorId = v?.id ?? null;
      } else data.vendorId = null;
    }
    if ("model" in body) {
      if (body.model) {
        const where: any = { name: String(body.model) };
        if (data.vendorId) where.vendorId = data.vendorId;
        const m = await prisma.model.findFirst({ where, select: { id: true } });
        data.modelId = m?.id ?? null;
      } else data.modelId = null;
    }

    // ───────── จัดการรูปภาพ ─────────
    const deletedImageIds: number[] = Array.isArray(body.deletedImageIds)
      ? body.deletedImageIds.map((n: any) => Number(n)).filter(Number.isFinite)
      : [];
    const deletedImageUrls: string[] = Array.isArray(body.deletedImageUrls)
      ? body.deletedImageUrls.map((s: any) => String(s)).filter(Boolean)
      : [];

    const hasImagesPayload = Array.isArray(body.images) && body.images.length > 0;
    let oldImages: { id: number; url: string | null }[] = [];
    let partialToDelete: { id: number; url: string | null }[] = [];

    if (hasImagesPayload) {
      oldImages = await prisma.deviceImage.findMany({
        where: { deviceId },
        select: { id: true, url: true },
      });
    } else if (deletedImageIds.length || deletedImageUrls.length) {
      partialToDelete = await prisma.deviceImage.findMany({
        where: {
          deviceId,
          OR: [
            deletedImageIds.length ? { id: { in: deletedImageIds } } : undefined,
            deletedImageUrls.length ? { url: { in: deletedImageUrls } } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true, url: true },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (hasImagesPayload) {
        if (oldImages.length) await tx.deviceImage.deleteMany({ where: { deviceId } });

        type Incoming = {
          url: string;
          filename?: string;
          originalName?: string;
          isPrimary?: boolean;
          mimeType?: string;
          size?: number;
        };
        const rawIncoming: Incoming[] = (body.images as any[]).filter((img) => img && img.url);

        const incoming: Prisma.DeviceImageUncheckedCreateInput[] = [];
        for (const img of rawIncoming) {
          const filename = img.filename ?? String(img.url).split("/").pop() ?? "";
          if (!filename) continue;

          const mimeType = img.mimeType || inferMimeFromExt(filename);
          const size = typeof img.size === "number" ? img.size : await statPublicUploadSize(filename);

          incoming.push({
            url: String(img.url),
            originalName: String(img.originalName ?? filename),
            filename,
            isPrimary: !!img.isPrimary,
            deviceId,
            mimeType,
            size,
          });
        }

        if (incoming.length) {
          if (!incoming.some(i => i.isPrimary)) incoming[0].isPrimary = true;
          else {
            let first = true;
            for (const i of incoming) {
              if (i.isPrimary) { if (first) first = false; else i.isPrimary = false; }
            }
          }
          await tx.deviceImage.createMany({ data: incoming });
        }
      }

      if (!hasImagesPayload && partialToDelete.length) {
        await tx.deviceImage.deleteMany({
          where: { id: { in: partialToDelete.map(x => x.id) }, deviceId },
        });

        const stillPrimary = await tx.deviceImage.findFirst({
          where: { deviceId, isPrimary: true },
          select: { id: true },
        });
        if (!stillPrimary) {
          const first = await tx.deviceImage.findFirst({
            where: { deviceId },
            orderBy: { id: "asc" },
            select: { id: true },
          });
          if (first) await tx.deviceImage.update({ where: { id: first.id }, data: { isPrimary: true } });
        }
      }

      // ✅ อัปเดต device "จริงๆ" ตรงนี้ (data ถูกเติมแล้ว)
      return tx.device.update({
        where: { id: deviceId },
        data,
        include: {
          deviceType: true,
          vendor: true,
          model: true,
          building: true,
          room: true,
          status: true,
          images: true,
        },
      });
    });

    const unlinkList = hasImagesPayload ? oldImages : partialToDelete;
    if (unlinkList.length) {
      await Promise.all(unlinkList.map((im) => im.url ? safeUnlinkPublicFile(im.url) : Promise.resolve()));
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /devices/:id error:", error);
    // ใส่ Prisma error map เหมือนเดิม…
    return serverErr("Failed to update device");
  }
}




/** (ถ้าอยากให้ PUT ยังใช้ได้) forward มาที่ PATCH */
export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const deviceId = Number(id);
  if (!Number.isFinite(deviceId)) return badRequest("Invalid id");

  try {
    const images = await prisma.deviceImage.findMany({
      where: { deviceId },
      select: { id: true, url: true },
    });

    await prisma.$transaction(async (tx) => {
      if (images.length) {
        await tx.deviceImage.deleteMany({ where: { deviceId } });
      }
      await tx.device.delete({ where: { id: deviceId } });
    });

    if (images.length) {
      await Promise.all(images.map((im) => safeUnlinkPublicFile(im.url)));
    }

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("DELETE /devices/:id error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return notFound();
      if (error.code === "P2003") return badRequest("Cannot delete: referenced by other records");
    }
    return serverErr("Failed to delete device");
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