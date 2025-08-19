import { z } from "zod"; // <-- เพิ่มบรรทัดนี้

export const schema = z.object({
  id: z.number(),
  assetTag: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  vendor: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  mac: z.string().nullable().optional(),
  buildingCode: z.string(),
  buildingName: z.string(),
  roomName: z.string(),
  purchaseDate: z.string().nullable().optional(),
  installDate: z.string().nullable().optional(),
  warrantyEnd: z.string().nullable().optional(),
});

export type DeviceRow = z.infer<typeof schema>;