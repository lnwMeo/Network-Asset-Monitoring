import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// === สคีมาตาม data.json ของเรา ===
export type DeviceRow = {
  id: number
  assetTag: string
  name: string
  type: string
  status: "ACTIVE" | "WARNING" | "REPAIR" | "RETIRED" | "UNKNOWN" | string
  vendor?: string | null
  model?: string | null
  ip?: string | null
  mac?: string | null
  buildingCode: string
  buildingName: string
  roomName: string
  purchaseDate?: string | null
  installDate?: string | null
  warrantyEnd?: string | null
}

function daysBetween(from?: string | null) {
  if (!from) return null
  const d = new Date(from)
  if (isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function daysUntil(to?: string | null) {
  if (!to) return null
  const d = new Date(to)
  if (isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function SectionCards({ devices }: { devices: DeviceRow[] }) {
  const total = devices.length

  // ติดตั้งใน 30 วันที่ผ่านมา (ใช้ installDate)
  const installedLast30 = devices.filter((d) => {
    const dd = daysBetween(d.installDate)
    return dd !== null && dd <= 30
  }).length

  // ACTIVE
  const activeCount = devices.filter((d) => d.status === "กำลังใช้งาน").length
  const activeRatio = total ? Math.round((activeCount / total) * 100) : 0
  const activeUp = activeRatio >= 70 // เกณฑ์ตัวอย่าง: ≥70% ถือว่าดี

  // Needs Attention = WARNING + REPAIR
  const attentionCount = devices.filter(
    (d) => d.status === "WARNING" || d.status === "กำลังแก้ไข"
  ).length
  const attentionRatio = total ? Math.round((attentionCount / total) * 100) : 0
  const attentionGood = attentionRatio <= 10 // ≤10% ถือว่าดี

  // Warranty expiring ≤ 90 วัน
  const expiring90 = devices.filter((d) => {
    const left = daysUntil(d.warrantyEnd)
    return typeof left === "number" && left >= 0 && left <= 90;
  }).length
  const expiringUp = expiring90 <= Math.max(1, Math.floor(total * 0.05)) // ถ้าน้อยกว่า ~5% ถือว่าดี
  // ช่วยตรวจว่าถือเป็น "อยู่ในคลัง" ไหม (รองรับไทย/อังกฤษที่พบบ่อย)
  const isInventory = (d: DeviceRow) => {
    const s = (d.status ?? "").toString().trim().toUpperCase();
    return (
      s === "อยู่ในคลัง" || // ไทยมาตรฐานของคุณ
      s === "INVENTORY" ||
      s === "IN_STOCK" ||
      s === "STOCK" ||
      s === "WAREHOUSE"
    );
  };

  const inventoryCount = devices.filter(isInventory).length;
  const inventoryLow = inventoryCount < 50; // เกณฑ์ตามที่ต้องการ


  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      {/* Total Devices */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>อุปกรณ์ทั้งหมด</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {total.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{installedLast30}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {installedLast30} ติดตั้งใน 30 วันที่ผ่านมา{" "}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            อ้างอิงจาก <code>installDate</code>
          </div>
        </CardFooter>
      </Card>

      {/* อุปกรณ์ที่ใช้งานอยู่ */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>อุปกรณ์ที่ใช้งานอยู่</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {activeUp ? <IconTrendingUp /> : <IconTrendingDown />}
              {activeRatio}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {activeUp ? "สถานะดี" : "ต้องตรวจสอบ"}{" "}
            {activeUp ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            อัตราใช้งาน ≥ 70% ถือว่ามีสุขภาพดี
          </div>
        </CardFooter>
      </Card>

      {/* ต้องตรวจสอบ (Warning + Repair) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>ต้องตรวจสอบ</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {attentionCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {attentionGood ? <IconTrendingUp /> : <IconTrendingDown />}
              {attentionRatio}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {attentionGood ? "เหตุขัดข้องต่ำ" : "เหตุขัดข้องสูง"}{" "}
            {attentionGood ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            อัตรารวมของอุปกรณ์ที่เป็น WARNING + REPAIR
          </div>
        </CardFooter>
      </Card>
      {/* อยู่ในคลัง*/}
      {/* อยู่ในคลัง */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>อยู่ในคลัง</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {inventoryCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {inventoryLow ? <IconTrendingDown /> : <IconTrendingUp />}
              {inventoryLow ? "เหลือน้อย" : "ปกติ"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {inventoryLow ? "อุปกรณ์ในคลังเหลือน้อย" : "คลังปกติ"}{" "}
            {inventoryLow ? (
              <IconTrendingDown className="size-4" />
            ) : (
              <IconTrendingUp className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            เกณฑ์: น้อยกว่า 50 ชิ้นจะแจ้งเตือน
          </div>
        </CardFooter>
      </Card>


      {/* ใกล้หมดประกัน */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>หมดประกันใน ≤ 90 วัน</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {expiring90.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {expiringUp ? <IconTrendingUp /> : <IconTrendingDown />}
              {expiringUp ? "ปกติ" : "ตรวจสอบ"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {expiring90} อุปกรณ์ใกล้หมดประกัน
          </div>
          <div className="text-muted-foreground">
            คำนวณจาก <code>warrantyEnd</code>
          </div>
        </CardFooter>
      </Card>


    </div>
  )
}
