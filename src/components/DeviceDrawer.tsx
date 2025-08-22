"use client";

import { DeviceRow} from "@/schemas/deviceSchema";           // type
import { useIsMobile } from "@/hooks/use-mobile";             // hook
import { daysBetween, daysUntil, ageLabel,formatDaysUntil } from "@/utils/agedevice";  // utils

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";



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
// Drawer (ดูรายละเอียดเร็ว)
export function DeviceDrawer({ item }: { item: DeviceRow }) {

  const isMobile = useIsMobile();
  const ageDays = daysBetween(item.purchaseDate);

  const leftDays = daysUntil(item.warrantyEnd);                 // ตัวเลข (อาจลบ/บวก หรือ null)
  const warrantyLabel = formatDaysUntil(item.warrantyEnd, true); // "หมดประกัน (5 วัน)" / "N/A" / "12"
  const expired = typeof leftDays === "number" && leftDays < 0;  // ใช้แต่งสี




  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>
            {item.assetTag} • {item.type} • {item.vendor || "-"} {item.model || ""}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {item.images?.length ? (
              item.images.map((img) => (
                <div key={img.id} className="relative w-24 h-24">
                  <img
                    src={img.url}
                    alt={img.originalName}
                    className="w-full h-full object-cover rounded"
                  />
                  {img.isPrimary && (
                    <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">
                      Primary
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No images uploaded.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">สถานะ</span>
              <div>
                {item.status}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">ชื่อ</span>
              <div>{item.name || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">รหัสครุภัณฑ์</span>
              <div>{item.deviceId || "-"}</div>   {/* ✅ เพิ่ม */}
            </div>
            <div>
              <span className="text-muted-foreground">ยี่ห้อ</span>
              <div>{item.vendor || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">รุ่น</span>
              <div>{item.model || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">IP Address</span>
              <div>{item.ip || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">MAC</span>
              <div>{item.mac || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">รหัสอาคาร</span>
              <div>
                {item.buildingCode}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">ชื่ออาคาร / ห้อง</span>
              <div>
                {item.buildingName} / {item.roomName}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">วันที่ซื้อ</span>
              <div>{formatDate(item.purchaseDate || "-")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">วันที่ติดตั้ง</span>
              <div>{formatDate(item.installDate || "-")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">สิ้นสุดประกัน</span>
              <div>{formatDate(item.warrantyEnd || "-")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">อายุอุปกรณ์</span>
              <div>{ageLabel(ageDays)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">วันคงเหลือประกัน</span>
              <div className={expired ? "text-destructive" : ""}>
                {warrantyLabel}
              </div>
            </div>
          </div>
          <Separator />

        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">ปิด</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
