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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  IconCircleCheckFilled,
  IconAlertTriangle,
  IconTool,
  IconArchive,
  IconQuestionMark,
} from "@tabler/icons-react";

// 👉 ใช้ type เดียวกับฟอร์ม add/edit
import type { DeviceRow } from "@/components/formdevicedialogcontent";

/* ---------- small utils ---------- */
function daysBetween(from?: string | null) {
  if (!from) return null;
  const d = new Date(from);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
function daysUntil(to?: string | null) {
  if (!to) return null;
  const d = new Date(to);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
function ageLabel(days: number | null) {
  if (days === null) return "N/A";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
}

/* ---------- status badge ---------- */
function StatusBadge({ status }: { status?: string }) {
  const norm = status?.toUpperCase?.() || "UNKNOWN";
  const map: Record<
    string,
    { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }
  > = {
    ACTIVE: { label: "ACTIVE", icon: <IconCircleCheckFilled className="fill-green-500" />, variant: "default" },
    WARNING: { label: "WARNING", icon: <IconAlertTriangle className="text-amber-500" />, variant: "secondary" },
    REPAIR: { label: "REPAIR", icon: <IconTool />, variant: "outline" },
    RETIRED: { label: "RETIRED", icon: <IconArchive />, variant: "outline" },
    UNKNOWN: { label: "UNKNOWN", icon: <IconQuestionMark />, variant: "outline" },
  };
  const cfg = map[norm] ?? map.UNKNOWN;
  return (
    <Badge variant={cfg.variant} className="gap-1 px-1.5">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

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
  const warrantyDays = daysUntil(item.warrantyEnd);

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
          <StatusBadge status={item.status} />
        </KV>
        <KV label="รหัสครุภัณฑ์">{item.assetNumber || "-"}</KV>

        <KV label="Vendor">{item.vendor || "-"}</KV>
        <KV label="Model">{item.model || "-"}</KV>

        <KV label="IP Address">{item.ip || "-"}</KV>
        <KV label="MAC">{item.mac || "-"}</KV>

        <KV label="รหัสอาคาร">{item.buildingCode || "-"}</KV>
        <KV label="ชื่ออาคาร / ห้อง">
          {item.buildingName} / {item.roomName}
        </KV>

        <KV label="วันที่ซื้อ">{item.purchaseDate || "-"}</KV>
        <KV label="วันที่ติดตั้ง">{item.installDate || "-"}</KV>
        <KV label="สิ้นสุดประกัน">{item.warrantyEnd || "-"}</KV>

        <KV label="อายุอุปกรณ์">{ageLabel(ageDays)}</KV>
        <KV label="วันคงเหลือประกัน">{warrantyDays ?? "N/A"} วัน</KV>
      </div>

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
