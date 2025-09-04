// src/schemas/deviceSchema.ts
import { z } from "zod";

// =============================================================================
// CONSTANTS & REGEX PATTERNS
// =============================================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^(([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){1,7}:|([0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){1,5}(:[0-9A-Fa-f]{1,4}){1,2}|([0-9A-Fa-f]{1,4}:){1,4}(:[0-9A-Fa-f]{1,4}){1,3}|([0-9A-Fa-f]{1,4}:){1,3}(:[0-9A-Fa-f]{1,4}){1,4}|([0-9A-Fa-f]{1,4}:){1,2}(:[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}(:[0-9A-Fa-f]{1,4}){1,6}|:(:[0-9A-Fa-f]{1,4}){1,7}|::)$/;

// Status mapping constants
const CANONICAL_STATUS = {
  ACTIVE: "กำลังใช้งาน",
  WARNING: "กำลังแก้ไข",
  REPAIR: "กำลังแก้ไข",
  RETIRED: "ไม่ได้ใช้งาน",
  UNKNOWN: "อยู่ในคลัง",
  STORAGE: "อยู่ในคลัง",
  INVENTORY: "อยู่ในคลัง",
} as const;

const STATUS_ALIASES: Record<string, string> = {
  // English aliases
  ACTIVE: CANONICAL_STATUS.ACTIVE,
  WARNING: CANONICAL_STATUS.WARNING,
  REPAIR: CANONICAL_STATUS.REPAIR,
  RETIRED: CANONICAL_STATUS.RETIRED,
  UNKNOWN: CANONICAL_STATUS.UNKNOWN,
  STORAGE: CANONICAL_STATUS.STORAGE,
  INVENTORY: CANONICAL_STATUS.INVENTORY,

  // Thai aliases (identity mapping)
  "กำลังใช้งาน": CANONICAL_STATUS.ACTIVE,
  "ไม่ได้ใช้งาน": CANONICAL_STATUS.RETIRED,
  "กำลังแก้ไข": CANONICAL_STATUS.WARNING,
  "อยู่ในคลัง": CANONICAL_STATUS.STORAGE,
};

const HAS_FILE_SUPPORT = typeof File !== "undefined";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a string is a valid IPv4 or IPv6 address
 */
function isValidIP(value: string): boolean {
  return IPV4_REGEX.test(value) || IPV6_REGEX.test(value);
}

/**
 * Check if a string is a valid CIDR notation
 */
function isValidCIDR(value: string): boolean {
  const parts = value.split("/");
  if (parts.length !== 2) return false;

  const [address, prefixString] = parts;
  const prefix = Number(prefixString);

  if (!Number.isInteger(prefix)) return false;

  if (IPV4_REGEX.test(address)) {
    return prefix >= 0 && prefix <= 32;
  }

  if (IPV6_REGEX.test(address)) {
    return prefix >= 0 && prefix <= 128;
  }

  return false;
}

/**
 * Normalize MAC address to standard format (AA:BB:CC:DD:EE:FF)
 */
export function normalizeMacAddress(mac: string): string {
  const cleaned = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  const segments = cleaned.match(/.{1,2}/g);

  return segments ? segments.join(":") : mac.toUpperCase();
}

/**
 * Convert input status to canonical Thai status
 */
export function toCanonicalStatus(input?: string | null): string {
  if (!input) return CANONICAL_STATUS.ACTIVE;

  const normalizedKey = input.toUpperCase?.() ? input.toUpperCase() : input;
  return STATUS_ALIASES[normalizedKey] ?? CANONICAL_STATUS.ACTIVE;
}

/**
 * Check if string is a URL or file path
 */
function isUrlOrPath(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Safe File schema that works in both browser and server environments
 */
const SafeFileSchema = z.any().refine(
  (value) => (HAS_FILE_SUPPORT ? value instanceof File : true),
  { message: "Expected File object" }
);

/**
 * Schema for existing images from database
 */
const ExistingImageSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().min(1).refine(isUrlOrPath, "Invalid image URL"),
  originalName: z.string().min(1),
  isPrimary: z.boolean().default(false),
  isNew: z.literal(false).optional(),
  file: z.never().optional(), // Existing images should not have files
});

/**
 * Schema for new images from forms
 */
const NewImageSchema = z.object({
  id: z.number().optional(),
  url: z.string().optional(), // URL not required yet
  originalName: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isNew: z.literal(true),
  file: SafeFileSchema,
});

/**
 * Union schema for both existing and new images
 */
export const imageSchema = z.union([ExistingImageSchema, NewImageSchema]);

/**
 * Main device schema for UI/Table/Form
 */
export const schema = z
  .object({
    // Required fields
    id: z.coerce.number().int(),
    assetTag: z.string().min(1, "Asset tag is required"),
    name: z.string().min(1, "Device name is required"),

    // Device type information
    type: z.string().default(""),
    deviceTypeId: z.coerce.number().int().nullable().optional(),
    deviceId: z.string().default(""),

    // Status information
    status: z.string().nullable().optional(),
    statusId: z.coerce.number().int().optional(),
    statusName: z.string().optional(),

    // Device specifications
    vendor: z.string().nullable().optional(),
    model: z.string().nullable().optional(),

    // Network configuration with validation and transformation
    ip: z
      .string()
      .nullable()
      .optional()
      .transform((value) => {
        if (value == null) return null;

        const trimmed = String(value).trim();

        // Convert empty-like values to null
        if (!trimmed || trimmed === "-" || trimmed.toUpperCase() === "N/A") {
          return null;
        }

        // Return as-is if valid IP or CIDR, otherwise preserve original
        if (isValidIP(trimmed) || isValidCIDR(trimmed)) {
          return trimmed;
        }

        return trimmed; // Preserve non-standard formats without throwing error
      }),

    mac: z
      .string()
      .nullable()
      .optional()
      .transform((value) => {
        if (value == null) return null;

        const trimmed = String(value).trim();
        if (!trimmed) return null;

        // Try to normalize to standard format
        const cleaned = trimmed.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
        if (cleaned.length === 12) {
          return cleaned.match(/.{1,2}/g)!.join(":");
        }

        // Return original value if normalization fails
        return trimmed;
      }),

    // Location information (display)
    buildingCode: z.string().default(""),
    buildingName: z.string().default(""),
    roomName: z.string().default(""),

    // Location information (for API)
    roomId: z.coerce.number().int().nullable().optional(),
    assetNumber: z.string().nullable().optional(),

    // Date fields with validation
    purchaseDate: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => value == null || value === "" || DATE_REGEX.test(value),
        "Date must be in YYYY-MM-DD format"
      ),

    installDate: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => value == null || value === "" || DATE_REGEX.test(value),
        "Date must be in YYYY-MM-DD format"
      ),

    warrantyEnd: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => value == null || value === "" || DATE_REGEX.test(value),
        "Date must be in YYYY-MM-DD format"
      ),

    // Images array
    images: z.array(imageSchema).default([]),
  })
  .transform((data) => {
    // Normalize status to canonical Thai format
    const statusName = toCanonicalStatus(data.statusName ?? data.status ?? undefined);
    return { ...data, statusName };
  })
  .superRefine((data, context) => {
    // Validate that there's only one primary image
    const primaryImages = data.images.filter(image => image.isPrimary);
    if (primaryImages.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "มีรูปหลักได้เพียง 1 รูปเท่านั้น",
        path: ["images"]
      });
    }
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DeviceRow = z.infer<typeof schema>;
export type DeviceImage = z.infer<typeof imageSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ensure exactly one primary image in the array
 */
export function ensureOnePrimaryImage(images: DeviceImage[]): DeviceImage[] {
  const primaryImages = images.filter(image => image.isPrimary);

  if (primaryImages.length === 0 && images.length > 0) {
    // No primary image found, make first image primary
    images[0].isPrimary = true;
  } else if (primaryImages.length > 1) {
    // Multiple primary images found, keep only the first one
    let foundFirst = false;
    for (const image of images) {
      if (image.isPrimary) {
        if (!foundFirst) {
          foundFirst = true;
        } else {
          image.isPrimary = false;
        }
      }
    }
  }

  return images;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * API Image data structure
 */
interface ApiImageData {
  id: number;
  url: string;
  originalName: string;
  isPrimary?: boolean;
}

/**
 * API Device data structure (flexible typing to handle various API responses)
 */
interface ApiDeviceData {
  id: number;
  assetTag: string;
  name: string;
  deviceType?: { name?: string } | null;
  deviceTypeId?: number | null;
  deviceId?: string | null;
  status?: string | { name?: string };
  statusId?: number;
  vendor?: string | { name?: string } | null;
  model?: string | { name?: string } | null;
  ipAddress?: string | null;
  mac?: string | null;
  building?: { code?: string; name?: string } | null;
  buildingCode?: string | null;
  room?: { name?: string } | null;
  roomId?: number | null;
  assetNumber?: string | null;
  purchaseDate?: string | null;
  installDate?: string | null;
  warrantyEnd?: string | null;
  images?: ApiImageData[] | null;
}

/**
 * Adapt device data from API response to UI row format
 */
export function adaptDeviceFromApi(apiData: ApiDeviceData): DeviceRow {
  const row: DeviceRow = {
    id: apiData.id,
    assetTag: apiData.assetTag,
    name: apiData.name,

    // Device type
    type: apiData.deviceType?.name ?? "",
    deviceTypeId: apiData.deviceTypeId ?? null,
    deviceId: apiData.deviceId ?? apiData.assetTag,

    // Status - ensure we handle null values properly
    status: (typeof apiData.status === "string"
      ? apiData.status
      : apiData.status?.name) ?? null,
    statusId: apiData.statusId ?? null,
    statusName: ((typeof apiData.status === "string")
      ? apiData.status
      : apiData.status?.name) as string,

    // Specifications
    vendor: typeof apiData.vendor === "string"
      ? apiData.vendor
      : apiData.vendor?.name ?? null,
    model: typeof apiData.model === "string"
      ? apiData.model
      : apiData.model?.name ?? null,

    // Network
    ip: apiData.ipAddress ?? null,
    mac: apiData.mac ?? null,

    // Location
    buildingCode: apiData.building?.code ?? apiData.buildingCode ?? "",
    buildingName: apiData.building?.name ?? "",
    roomName: apiData.room?.name ?? "",
    roomId: apiData.roomId ?? null,

    assetNumber: apiData.assetNumber ?? null,

    // Dates (convert to YYYY-MM-DD format)
    purchaseDate: apiData.purchaseDate ? String(apiData.purchaseDate).slice(0, 10) : null,
    installDate: apiData.installDate ? String(apiData.installDate).slice(0, 10) : null,
    warrantyEnd: apiData.warrantyEnd ? String(apiData.warrantyEnd).slice(0, 10) : null,

    // Images
    images: (apiData.images ?? []).map((imageData: ApiImageData) => ({
      id: imageData.id,
      url: imageData.url,
      originalName: imageData.originalName,
      isPrimary: !!imageData.isPrimary,
      isNew: false,
    })),
  };

  // Ensure exactly one primary image
  row.images = ensureOnePrimaryImage(row.images);

  return row;
}

/**
 * Build JSON payload for POST/PUT requests (excluding files)
 */
export function buildDeviceJsonPayload(formData: DeviceRow) {
  return {
    assetTag: formData.assetTag,
    deviceId: formData.deviceId || formData.assetTag,
    name: formData.name,
    deviceTypeId: formData.deviceTypeId ?? undefined,
    buildingId: undefined, // Should be mapped from code to ID on UI side
    roomId: formData.roomId ?? null,
    vendorId: undefined,
    modelId: undefined,
    ip: formData.ip || null,
    mac: formData.mac || null,
    statusId: formData.statusId ?? 0, // หรือ throw error ถ้าไม่ควร fallback
    status: formData.statusName || toCanonicalStatus(formData.status || undefined),
    purchaseDate: formData.purchaseDate || null,
    installDate: formData.installDate || null,
    warrantyEnd: formData.warrantyEnd || null,
  };
}

/**
 * Build FormData for image upload requests
 */
export function buildImagesFormData(deviceId: number, images: DeviceImage[]): FormData {
  const formData = new FormData();
  formData.set("deviceId", String(deviceId));

  images.forEach((image, index) => {
    if (image?.isNew && image?.file) {
      formData.append("files", image.file, image.file.name);
      formData.append(`isPrimary_${index}`, String(!!image.isPrimary));
    }
  });

  return formData;
}