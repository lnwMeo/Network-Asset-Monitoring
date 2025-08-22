// src/app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { schema, type DeviceRow } from "@/schemas/deviceSchema";

type DeviceApiResponse = {
  id: number;
  assetTag: string;
  name: string;
  deviceType?: { name: string } | null;
  deviceId?: string | null;
  status?: string | { name: string } | null; // รับได้ทั้ง string/relation
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

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const res = await fetch(`${base}/api/devices`, {
    cache: "no-store",
    headers: { cookie: cookies().toString() }, // ส่งคุกกี้ให้ API
  });

  if (!res.ok) {
    // กันหน้าแตกถ้า API ล่ม
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards devices={[]} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive devices={[]} />
        </div>
        <DataTable data={[]} />
      </div>
    );
  }

  const raw = (await res.json()) as DeviceApiResponse[];

  const toAbsoluteUrl = (u: string | undefined | null) =>
    !u ? "" : u.startsWith("http") ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`;

  const devices: DeviceRow[] = raw.map((d) =>
    schema.parse({
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

      images: (d.images ?? []).map((img) => ({
        id: img.id,
        url: toAbsoluteUrl(img.url), // prefix base ถ้าเป็น path
        originalName: img.originalName,
        isPrimary: !!img.isPrimary,
        isNew: false,
      })),
    })
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards devices={devices} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive devices={devices} />
      </div>
      <DataTable data={devices} />
    </div>
  );
}
