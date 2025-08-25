"use client";

import * as React from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { daysBetween, daysUntil, ageLabel, formatDaysUntil } from "@/utils/agedevice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";


// 👉 ใช้ type เดียวกับฟอร์ม add/edit
import type { DeviceRow } from "@/schemas/deviceSchema"
function formatDate(dateLike?: string | null) {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "-";
  // ถ้าอยากโชว์เวลาเพิ่ม ใส่ hour/minute เข้าไปได้
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* ---------- small utils ---------- */
// function daysBetween(from?: string | null) {
//   if (!from) return null;
//   const d = new Date(from);
//   if (isNaN(d.getTime())) return null;
//   const diff = Date.now() - d.getTime();
//   return Math.floor(diff / (1000 * 60 * 60 * 24));
// }
// function daysUntil(to?: string | null) {
//   if (!to) return null;
//   const d = new Date(to);
//   if (isNaN(d.getTime())) return null;
//   const diff = d.getTime() - Date.now();
//   return Math.ceil(diff / (1000 * 60 * 60 * 24));
// }
// function ageLabel(days: number | null) {
//   if (days === null) return "N/A";
//   const y = Math.floor(days / 365);
//   const m = Math.floor((days % 365) / 30);
//   return y > 0 ? `${y}y ${m}m` : `${m}m`;
// }



/* ---------- key/value row ---------- */
function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm break-words">{children || "-"}</div>
    </div>
  );
}

/* ---------- main component ---------- */
export default function DataDeviceDialogContent({
  item,
  onEdit,
}: {
  item: DeviceRow;
  /** กดปุ่ม “แก้ไข” แล้วให้พ่อเปิด dialog ฟอร์มเดิมในโหมดแก้ไข */
  onEdit?: (item: DeviceRow) => void;
}) {
  const ageDays = daysBetween(item.purchaseDate);
  // const warrantyDays = daysUntil(item.warrantyEnd);


  const leftDays = daysUntil(item.warrantyEnd);                 // ตัวเลข (อาจลบ/บวก หรือ null)
  const warrantyLabel = formatDaysUntil(item.warrantyEnd, true); // "หมดประกัน (5 วัน)" / "N/A" / "12"
  const expired = typeof leftDays === "number" && leftDays < 0;  // ใช้แต่งสี

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader className="gap-1">
        <DialogTitle>{item.name}</DialogTitle>
        <DialogDescription>
          {item.assetTag} • {item.type} • {item.vendor || "-"} {item.model || ""}
        </DialogDescription>
      </DialogHeader>

      {/* ข้อมูลหลัก */}
      <div className="grid grid-cols-1 gap-4 px-1 md:grid-cols-2">
        <KV label="สถานะ">
          {item.status}
        </KV>
        <KV label="ชื่อ">{item.name || "-"}</KV>
        <KV label="รหัสครุภัณฑ์">{item.deviceId || "-"}</KV>

        <KV label="ยี่ห้อ">{item.vendor || "-"}</KV>
        <KV label="รุ่น">{item.model || "-"}</KV>

        <KV label="IP Address">{item.ip || "-"}</KV>
        <KV label="MAC">{item.mac || "-"}</KV>

        <KV label="รหัสอาคาร">{item.buildingCode || "-"}</KV>
        <KV label="ชื่ออาคาร / ห้อง">
          {item.buildingName} / {item.roomName}
        </KV>

        <KV label="วันที่ซื้อ">{formatDate(item.purchaseDate || "-")}</KV>
        <KV label="วันที่ติดตั้ง">{formatDate(item.installDate || "-")}</KV>
        <KV label="สิ้นสุดประกัน">{formatDate(item.warrantyEnd || "-")}</KV>

        <KV label="อายุอุปกรณ์">{ageLabel(ageDays)}</KV>
        <KV label="วันคงเหลือประกัน"> <div className={expired ? "text-destructive" : ""}>
          {warrantyLabel}
        </div></KV>


      </div>
      {item.images?.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">รูปภาพ</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {item.images.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={img.url}
                  alt={img.originalName}
                  className="w-full h-auto rounded border"
                />
                {img.isPrimary && (
                  <span className="absolute top-1 left-1 text-xs bg-yellow-500 text-white px-1 rounded">
                    หลัก
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Separator className="my-2" />

      <DialogFooter className="gap-2">
        {onEdit && (
          <Button type="button" onClick={() => onEdit(item)}>
            แก้ไข
          </Button>
        )}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            ปิด
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
