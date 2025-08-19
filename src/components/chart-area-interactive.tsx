"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// โครงสร้างข้อมูลของอุปกรณ์ (DeviceRow)
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

// ฟังก์ชันคำนวณจำนวนวันระหว่างวันที่ระบุและปัจจุบัน
function daysBetween(from?: string | null) {
  if (!from) return null
  const d = new Date(from)
  if (isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// โครงสร้างข้อมูลจุด (Point) สำหรับกราฟ
type AgePoint = {
  bucket: string // ป้ายช่วง เช่น "0–5m"
  all: number    // จำนวนอุปกรณ์ทั้งหมด
  active: number // จำนวนอุปกรณ์ที่ใช้งานอยู่
}

// การตั้งค่ากราฟ (ChartConfig)
const chartConfig = {
  all: { label: "อุปกรณ์ทั้งหมด", color: "var(--primary)" },
  active: { label: "ใช้งานอยู่", color: "var(--primary)" },
} satisfies ChartConfig

// ฟังก์ชันสร้างข้อมูล series สำหรับกราฟอายุอุปกรณ์
function buildAgeSeries(
  devices: DeviceRow[],
  maxMonths: number,
  stepMonths: number
): AgePoint[] {
  // เตรียม bucket สำหรับเก็บช่วงอายุ
  const buckets: AgePoint[] = []
  for (let start = 0; start < maxMonths; start += stepMonths) {
    const end = Math.min(start + stepMonths - 1, maxMonths - 1)
    buckets.push({
      bucket: `${start}–${end}m`,
      all: 0,
      active: 0,
    })
  }
  // เพิ่ม bucket สำหรับ "มากกว่าหรือเท่ากับ maxMonths"
  buckets.push({ bucket: `≥${maxMonths}m`, all: 0, active: 0 })

  // นับจำนวนอุปกรณ์ลง bucket
  for (const d of devices) {
    const days = daysBetween(d.purchaseDate) ?? 0
    const months = Math.max(0, Math.floor(days / 30))
    const idx =
      months >= maxMonths ? buckets.length - 1 : Math.floor(months / stepMonths)

    buckets[idx].all += 1
    if (d.status === "ACTIVE") buckets[idx].active += 1
  }
  return buckets
}

// คอมโพเนนต์กราฟพื้นที่ (Area Chart) แบบโต้ตอบได้
export function ChartAreaInteractive({
  devices,
  title = "การกระจายอายุของอุปกรณ์",
}: {
  devices: DeviceRow[]
  title?: string
}) {
  const isMobile = useIsMobile()
  // ค่าเริ่มต้นของช่วงเวลา (5 ปี = 60 เดือน / 3 ปี = 36 เดือน / 1 ปี = 12 เดือน)
  const [range, setRange] = React.useState<"5y" | "3y" | "1y">("5y")

  // ถ้าเป็นมือถือให้ใช้ช่วง 3 ปี
  React.useEffect(() => {
    if (isMobile) setRange("3y")
  }, [isMobile])

  // กำหนดค่าการแสดงผลกราฟตามช่วงที่เลือก
  const { maxMonths, stepMonths, subtitle } = React.useMemo(() => {
    if (range === "1y") return { maxMonths: 12, stepMonths: 1, subtitle: "ย้อนหลัง 12 เดือน" }
    if (range === "3y") return { maxMonths: 36, stepMonths: 3, subtitle: "ย้อนหลัง 3 ปี" }
    return { maxMonths: 60, stepMonths: 6, subtitle: "ย้อนหลัง 5 ปี" }
  }, [range])

  // เตรียมข้อมูลสำหรับกราฟ
  const data = React.useMemo(
    () => buildAgeSeries(devices, maxMonths, stepMonths),
    [devices, maxMonths, stepMonths]
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{subtitle}</span>
          <span className="@[540px]/card:hidden">{subtitle}</span>
        </CardDescription>
        <CardAction>
          {/* ปุ่มเลือกช่วงเวลาแบบ Toggle */}
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as typeof range)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="5y">5 ปี</ToggleGroupItem>
            <ToggleGroupItem value="3y">3 ปี</ToggleGroupItem>
            <ToggleGroupItem value="1y">1 ปี</ToggleGroupItem>
          </ToggleGroup>

          {/* ตัวเลือกช่วงเวลาแบบ Select (ใช้ในมือถือ) */}
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="เลือกช่วงเวลา"
            >
              <SelectValue placeholder="5 ปี" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="5y" className="rounded-lg">5 ปี</SelectItem>
              <SelectItem value="3y" className="rounded-lg">3 ปี</SelectItem>
              <SelectItem value="1y" className="rounded-lg">1 ปี</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {/* แสดงกราฟ */}
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            {/* กำหนด gradient สีสำหรับพื้นที่กราฟ */}
            <defs>
              <linearGradient id="fillAll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-all)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-all)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-active)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-active)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => {
                    const v = typeof value === "number" ? value : Number(value);
                    if (name === "active") return `${v} เครื่องที่ใช้งานอยู่`;
                    if (name === "all") return `${v} เครื่องทั้งหมด`;
                    return String(value);
                  }}
                />
              }
            />
            <Area
              dataKey="active"
              type="natural"
              fill="url(#fillActive)"
              stroke="var(--color-active)"
              stackId="a"
            />
            <Area
              dataKey="all"
              type="natural"
              fill="url(#fillAll)"
              stroke="var(--color-all)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
