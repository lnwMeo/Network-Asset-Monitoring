// src/app/devices/[id]/page.tsx
import { daysBetween, daysUntil, ageLabel, formatDaysUntil } from "@/utils/agedevice";

type DeviceResponse = {
  id: number;
  name: string;
  assetTag: string;
  deviceId?: string | null;
  deviceType?: { name: string } | null;
  vendor?: { name: string } | null;
  model?: { name: string } | null;
  purchaseDate?: string | null;
  installDate?: string | null;
  warrantyEnd?: string | null;
  ipAddress?: string | null;
  mac?: string | null;
  building?: { code: string; name: string } | null;
  room?: { id: number; name: string } | null;
  images?: { id: number; url: string; originalName: string; isPrimary: boolean }[] | null;
};

function formatDate(dateLike?: string | null) {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default async function DevicePage({ params }: { params: { id: string } }) {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, ""); // ว่างได้ → ใช้ path ภายในแอป
  const res = await fetch(`${base}/api/devices/${params.id}`, { cache: "no-store" });

  if (!res.ok) {
    return <div className="p-6">ไม่พบอุปกรณ์</div>;
  }

  const d: DeviceResponse = await res.json();

  // คำนวณหลังจากมีข้อมูลแล้ว
  const ageDays = daysBetween(d.purchaseDate ?? null);
  const leftDays = daysUntil(d.warrantyEnd ?? null);
  const warrantyLabel = formatDaysUntil(d.warrantyEnd ?? null, true); // หมดประกัน (X วัน) / N / N/A
  const expired = typeof leftDays === "number" && leftDays < 0;

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-bold">{d.name}</h1>

      <div>Asset Tag : {d.assetTag}</div>
      <div>รหัสครุภัณฑ์ : {d.deviceId || "-"}</div>
      <div>ประเภท : {d.deviceType?.name ?? "-"}</div>
      <div>ยี่ห้อ : {d.vendor?.name ?? "-"}</div>
      <div>รุ่น : {d.model?.name ?? "-"}</div>

      <div>วันที่ซื้อ : {formatDate(d.purchaseDate ?? null)}</div>
      <div>วันที่ติดตั้ง : {formatDate(d.installDate ?? null)}</div>
      <div>สิ้นสุดประกัน : {formatDate(d.warrantyEnd ?? null)}</div>

      <div>อายุอุปกรณ์ : {ageLabel(ageDays)}</div>
      <div className={expired ? "text-destructive" : ""}>
        วันคงเหลือประกัน : {warrantyLabel}
      </div>

      {/* เติมส่วนอื่น ๆ ตามต้องการ เช่น รูปภาพ/ที่ตั้ง */}
    </div>
  );
}
