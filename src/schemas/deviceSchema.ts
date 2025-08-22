// src/schemas/deviceSchema.ts
import { z } from "zod";

/** ---------- Regex / Utils ---------- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

const IPv4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPv6_RE =
  /^(([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){1,7}:|([0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){1,5}(:[0-9A-Fa-f]{1,4}){1,2}|([0-9A-Fa-f]{1,4}:){1,4}(:[0-9A-Fa-f]{1,4}){1,3}|([0-9A-Fa-f]{1,4}:){1,3}(:[0-9A-Fa-f]{1,4}){1,4}|([0-9A-Fa-f]{1,4}:){1,2}(:[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}(:[0-9A-Fa-f]{1,4}){1,6}|:(:[0-9A-Fa-f]{1,4}){1,7}|::)$/;
function isIP(v: string) { return IPv4_RE.test(v) || IPv6_RE.test(v); }

export function normalizeMac(mac: string) {
  return mac.replace(/[^A-Fa-f0-9]/g, "")
    .toUpperCase()
    .match(/.{1,2}/g)?.join(":") ?? mac.toUpperCase();
}
const MAC_COLON_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

// ด้านบนไฟล์ (ใกล้ IPv4_RE/IPv6_RE)
function isCIDR(v: string) {
  const parts = v.split("/");
  if (parts.length !== 2) return false;
  const [addr, prefixStr] = parts;
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix)) return false;
  if (IPv4_RE.test(addr)) return prefix >= 0 && prefix <= 32;
  if (IPv6_RE.test(addr)) return prefix >= 0 && prefix <= 128;
  return false;
}


const HAS_FILE = typeof File !== "undefined";
const SafeFile = z.any().refine(
  v => (HAS_FILE ? v instanceof File : true),
  { message: "Expected File object" }
);

const isUrlOrPath = (u: string) => /^https?:\/\//i.test(u) || u.startsWith("/");

/** ---------- Status mapping (EN/TH → TH canonical) ---------- */
const CANON = {
  ACTIVE: "กำลังใช้งาน",
  WARNING: "กำลังแก้ไข",
  REPAIR: "กำลังแก้ไข",
  RETIRED: "ไม่ได้ใช้งาน",
  UNKNOWN: "อยู่ในคลัง",
  STORAGE: "อยู่ในคลัง",
  INVENTORY: "อยู่ในคลัง",
} as const;

const STATUS_ALIASES: Record<string, string> = {
  ACTIVE: CANON.ACTIVE,
  WARNING: CANON.WARNING,
  REPAIR: CANON.REPAIR,
  RETIRED: CANON.RETIRED,
  UNKNOWN: CANON.UNKNOWN,
  STORAGE: CANON.STORAGE,
  INVENTORY: CANON.INVENTORY,
  // ไทย -> ไทย
  "กำลังใช้งาน": "กำลังใช้งาน",
  "ไม่ได้ใช้งาน": "ไม่ได้ใช้งาน",
  "กำลังแก้ไข": "กำลังแก้ไข",
  "อยู่ในคลัง": "อยู่ในคลัง",
};

export function toCanonicalStatus(input?: string | null) {
  if (!input) return CANON.ACTIVE;
  const key = input.toUpperCase?.() ? input.toUpperCase() : input;
  return STATUS_ALIASES[key] ?? CANON.ACTIVE;
}

/** ---------- Image schemas ---------- */
// รูปเดิมจาก DB
const existingImageSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().min(1).refine(isUrlOrPath, "invalid image URL"),
  originalName: z.string().min(1),
  isPrimary: z.boolean().default(false),
  isNew: z.literal(false).optional(),
  file: z.never().optional(), // รูปเดิมต้องไม่มีไฟล์
});

// รูปใหม่จากฟอร์ม
const newImageSchema = z.object({
  id: z.number().optional(),
  url: z.string().optional(), // ยังไม่ต้องมี URL
  originalName: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isNew: z.literal(true),
  file: SafeFile,
});

export const imageSchema = z.union([existingImageSchema, newImageSchema]);

/** ---------- Device row schema (UI/Table/Form) ---------- */
export const schema = z
  .object({
    id: z.coerce.number().int(),
    assetTag: z.string().min(1, "assetTag is required"),
    name: z.string().min(1, "name is required"),

    // ชื่อประเภท (โชว์ใน UI) + id สำหรับส่งกลับ
    type: z.string().default(""),
    deviceTypeId: z.coerce.number().int().nullable().optional(),

    deviceId: z.string().default(""),

    // สถานะ: เดิม (string), ใหม่ (ไทย) + id
    status: z.string().nullable().optional(),
    statusId: z.coerce.number().int().nullable().optional(),
    statusName: z.string().nullable().optional(),

    vendor: z.string().nullable().optional(),
    model: z.string().nullable().optional(),

  ip: z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const s = String(v).trim();
    // แปลงค่าที่ถือว่า "ว่าง" ให้เป็น null
    if (!s || s === "-" || s.toUpperCase() === "N/A") return null;

    // ผ่านถ้าเป็น IPv4/IPv6 หรือ CIDR
    if (isIP(s) || isCIDR(s)) return s;

    // ไม่ใช่รูปแบบมาตรฐาน → แสดงค่าเดิม (ไม่โยน error)
    return s;
  }),

    mac: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const s = String(v).trim();
        if (!s) return null;

        // พยายาม normalize เป็น AA:BB:CC:DD:EE:FF
        const cleaned = s.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
        if (cleaned.length === 12) {
          return cleaned.match(/.{1,2}/g)!.join(":");
        }

        // ถ้า normalize ไม่ได้ ให้แสดงค่าดิบเดิม (อย่าแปลงเป็น null)
        return s;
      }),


    // Display
    buildingCode: z.string().default(""),
    buildingName: z.string().default(""),
    roomName: z.string().default(""),

    // ส่งกลับ API
    roomId: z.coerce.number().int().nullable().optional(),
    assetNumber: z.string().nullable().optional(),

    purchaseDate: z.string().nullable().optional()
      .refine(v => v == null || v === "" || DATE_RE.test(v), "Date must be YYYY-MM-DD"),
    installDate: z.string().nullable().optional()
      .refine(v => v == null || v === "" || DATE_RE.test(v), "Date must be YYYY-MM-DD"),
    warrantyEnd: z.string().nullable().optional()
      .refine(v => v == null || v === "" || DATE_RE.test(v), "Date must be YYYY-MM-DD"),

    images: z.array(imageSchema).default([]),
  })
  .transform((val) => {
    const statusName = toCanonicalStatus(val.statusName ?? val.status ?? undefined);
    return { ...val, statusName };
  })
  .superRefine((val, ctx) => {
    const primaries = val.images.filter(i => i.isPrimary);
    if (primaries.length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "มีรูปหลักได้เพียง 1 รูป", path: ["images"] });
    }
  });

export type DeviceRow = z.infer<typeof schema>;
export type DeviceImage = z.infer<typeof imageSchema>;

/** ---------- Helpers ---------- */
export function ensureOnePrimary(images: DeviceImage[]) {
  const primaries = images.filter(i => i.isPrimary);
  if (primaries.length === 0 && images.length > 0) {
    images[0].isPrimary = true;
  } else if (primaries.length > 1) {
    let seen = false;
    for (const img of images) {
      if (img.isPrimary) {
        if (!seen) seen = true;
        else img.isPrimary = false;
      }
    }
  }
  return images;
}

/** API -> UI row */
export function adaptDeviceFromApi(d: any): DeviceRow {
  const row: DeviceRow = {
    id: d.id,
    assetTag: d.assetTag,
    name: d.name,
    type: d.deviceType?.name ?? "",
    deviceTypeId: d.deviceTypeId ?? null,
    deviceId: d.deviceId ?? d.assetTag,

    status: typeof d.status === "string" ? d.status : d.status?.name ?? null,
    statusId: d.statusId ?? null,
    statusName: typeof d.status === "string" ? d.status : d.status?.name ?? null,

    vendor: d.vendor?.name ?? d.vendor ?? null,
    model: d.model?.name ?? d.model ?? null,

    ip: d.ipAddress ?? null,
    mac: d.mac ?? null,

    buildingCode: d.building?.code ?? d.buildingCode ?? "",
    buildingName: d.building?.name ?? "",
    roomName: d.room?.name ?? "",
    roomId: d.roomId ?? null,

    assetNumber: d.assetNumber ?? null,

    purchaseDate: d.purchaseDate ? String(d.purchaseDate).slice(0, 10) : null,
    installDate: d.installDate ? String(d.installDate).slice(0, 10) : null,
    warrantyEnd: d.warrantyEnd ? String(d.warrantyEnd).slice(0, 10) : null,

    images: (d.images ?? []).map((im: any) => ({
      id: im.id,
      url: im.url, // จะเป็น absolute หรือ path ก็ได้ (page.tsx จะ prefix ให้)
      originalName: im.originalName,
      isPrimary: !!im.isPrimary,
      isNew: false,
    })),
  };
  row.images = ensureOnePrimary(row.images);
  return row;
}

/** UI form -> Payload สำหรับ POST/PUT JSON (ไม่รวมไฟล์) */
export function buildDeviceJsonPayload(form: DeviceRow) {
  return {
    assetTag: form.assetTag,
    deviceId: form.deviceId || form.assetTag,
    name: form.name,
    deviceTypeId: form.deviceTypeId ?? undefined,
    buildingId: undefined, // map จาก code -> id ฝั่ง UI/selector ก่อนส่ง
    roomId: form.roomId ?? null,
    vendorId: undefined,
    modelId: undefined,
    ip: form.ip || null,
    mac: form.mac || null,
    status: form.statusName || toCanonicalStatus(form.status || undefined),
    purchaseDate: form.purchaseDate || null,
    installDate: form.installDate || null,
    warrantyEnd: form.warrantyEnd || null,
  };
}

/** รูปใหม่ -> FormData (สำหรับ endpoint upload) */
export function buildImagesFormData(deviceId: number, images: DeviceImage[]) {
  const fd = new FormData();
  fd.set("deviceId", String(deviceId));
  images.forEach((img, idx) => {

    if (img?.isNew && img?.file) {

      fd.append("files", img.file, img.file.name);
      fd.append(`isPrimary_${idx}`, String(!!img.isPrimary));
    }
  });
  return fd;
}
