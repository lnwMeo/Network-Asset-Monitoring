export const revalidate = 60; // ISR: อัปเดตทุก 60 วินาที (ปรับตามต้องการ)

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

import { schema, type DeviceRow } from "@/schemas/deviceSchema";

import NavHome from "@/components/nav-home";

type DeviceApiResponse = {
  id: number;
  assetTag: string;
  name: string;
  deviceType?: { name: string } | null;
  deviceId?: string | null;
  status?: string | { name: string } | null;
  vendor?: { name: string } | null;
  model?: { name: string } | null;
  ipAddress?: string | null;
  mac?: string | null;
  building?: { code: string; name: string } | null;
  room?: { id: number; name: string } | null;
  purchaseDate?: string | null;
  installDate?: string | null;
  warrantyEnd?: string | null;
  images?: { id: number; url: string; originalName: string; isPrimary: boolean }[] | null;
};

export default async function HomePage() {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const res = await fetch(`${base}/api/devices`, { next: { revalidate } }).catch(() => null);

  let devices: DeviceRow[] = [];
  if (res && res.ok) {
    const raw = (await res.json()) as DeviceApiResponse[];
    devices = raw
      .map((d) =>
        schema.safeParse({
          id: d.id,
          assetTag: d.assetTag,
          name: d.name,
          type: d.deviceType?.name ?? "",
          deviceId: d.deviceId ?? "",
          status: typeof d.status === "string" ? d.status : d.status?.name ?? null,
          statusName: typeof d.status === "string" ? d.status : d.status?.name ?? null,
          vendor: d.vendor?.name ?? null,
          model: d.model?.name ?? null,
          ip: d.ipAddress ?? null,
          mac: d.mac ?? null,
          buildingCode: d.building?.code ?? "",
          buildingName: d.building?.name ?? "",
          roomName: d.room?.name ?? "",
          purchaseDate: d.purchaseDate ? d.purchaseDate.slice(0, 10) : null,
          installDate: d.installDate ? d.installDate.slice(0, 10) : null,
          warrantyEnd: d.warrantyEnd ? d.warrantyEnd.slice(0, 10) : null,
          images: [],
        })
      )
      .filter((r) => r.success)
      .map((r) => (r as any).data as DeviceRow);
  }

  return (
    <>
      <NavHome />
      <div className="@container/main  flex flex-col gap-4 py-4 md:gap-6 md:py-6 mt-14">
        <SectionCards devices={devices} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive devices={devices} />
        </div>
        
      </div>
    </>
  );
}
