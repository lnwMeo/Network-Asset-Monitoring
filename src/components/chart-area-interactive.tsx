"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Rectangle,
  LabelList,
} from "recharts"

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
import { Label } from "@/components/ui/label"

// ===== ชนิดข้อมูลเดิม =====
export type DeviceRow = {
  id: number
  assetTag: string
  name: string
  type: string
  status: string
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

// ===== helpers =====
function daysBetween(from?: string | null) {
  if (!from) return null
  const d = new Date(from)
  if (isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
function normStatus(s?: string | null) {
  return (s ?? "").toString().trim().toUpperCase()
}
function isActive(dev: DeviceRow) {
  const s = normStatus(dev.status)
  return s === "ACTIVE" || s === "ใช้งาน" || s === "กำลังใช้งาน" || s === "IN_USE" || s === "INUSE"
}
function isStock(dev: DeviceRow) {
  const s = normStatus(dev.status)
  return (
    s === "STOCK" || s === "IN_STOCK" || s === "INVENTORY" || s === "WAREHOUSE" ||
    s === "STORE" || s === "SPARE" || s === "อยู่ในคลัง" || s === "คลัง" || s === "สำรอง"
  )
}
function isRepair(dev: DeviceRow) {
  const s = normStatus(dev.status)
  return (
    s === "REPAIR" || s === "UNDER_REPAIR" || s === "FIX" || s === "FIXING" ||
    s === "MAINTENANCE" || s === "SERVICE" || s === "กำลังแก้ไข" || s === "ซ่อม" || s === "กำลังซ่อม"
  )
}

// ===== จุดข้อมูลสำหรับกราฟ =====
type AgePoint = {
  bucket: string
  all: number
  active: number
  stock: number
  repair: number
}

// ===== config สีใน ChartContainer (แมปเป็น CSS vars) =====
const chartConfig = {
  all: { label: "ทั้งหมด", color: "var(--chart-1)" },
  active: { label: "ใช้งานอยู่", color: "var(--chart-2)" },
  stock: { label: "อยู่ในคลัง", color: "var(--chart-3)" },
  repair: { label: "กำลังแก้ไข", color: "var(--chart-4)" },
} satisfies ChartConfig

// ===== สร้าง series อายุเป็นบัคเก็ต =====
function buildAgeSeries(
  devices: DeviceRow[],
  maxMonths: number,
  stepMonths: number
): AgePoint[] {
  const buckets: AgePoint[] = []
  for (let start = 0; start < maxMonths; start += stepMonths) {
    const end = Math.min(start + stepMonths - 1, maxMonths - 1)
    buckets.push({ bucket: `${start}–${end}m`, all: 0, active: 0, stock: 0, repair: 0 })
  }
  buckets.push({ bucket: `≥${maxMonths}m`, all: 0, active: 0, stock: 0, repair: 0 })

  for (const d of devices) {
    const days = daysBetween(d.purchaseDate) ?? 0
    const months = Math.max(0, Math.floor(days / 30))
    const idx = months >= maxMonths ? buckets.length - 1 : Math.floor(months / stepMonths)

    buckets[idx].all += 1
    if (isActive(d)) buckets[idx].active += 1
    if (isStock(d)) buckets[idx].stock += 1
    if (isRepair(d)) buckets[idx].repair += 1
  }
  return buckets
}

// ===== กราฟ Bar แบบโต้ตอบ =====
export function ChartAreaInteractive({
  devices,
  title = "จำนวนและการกระจายอายุของอุปกรณ์",
}: {
  devices: DeviceRow[]
  title?: string
}) {
  const isMobile = useIsMobile()
  const [range, setRange] = React.useState<"5y" | "3y" | "1y">("5y")
  const typeOptions = React.useMemo(
    () =>
      Array.from(new Set(devices.map((d) => d.type).filter(Boolean))).sort(),
    [devices]
  )
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL")

  React.useEffect(() => {
    if (isMobile) setRange("3y")
  }, [isMobile])

  const { maxMonths, stepMonths, subtitle } = React.useMemo(() => {
    if (range === "1y") return { maxMonths: 12, stepMonths: 1, subtitle: "ย้อนหลัง 12 เดือน" }
    if (range === "3y") return { maxMonths: 36, stepMonths: 3, subtitle: "ย้อนหลัง 3 ปี" }
    return { maxMonths: 60, stepMonths: 6, subtitle: "ย้อนหลัง 5 ปี" }
  }, [range])

  const filtered = React.useMemo(
    () => (typeFilter === "ALL" ? devices : devices.filter((d) => d.type === typeFilter)),
    [devices, typeFilter]
  )

  const data = React.useMemo(
    () => buildAgeSeries(filtered, maxMonths, stepMonths),
    [filtered, maxMonths, stepMonths]
  )

  // ตัวเลขสรุป
  const totalCount = filtered.length
  const activeCount = filtered.filter(isActive).length
  const stockCount = filtered.filter(isStock).length
  const repairCount = filtered.filter(isRepair).length

  // active bar effect (ตาม index ที่โฮเวอร์)
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{subtitle}</span>
          <span className="@[540px]/card:hidden">{subtitle}</span>
        </CardDescription>
        <CardAction>
          <div className="flex gap-2">
            <div className="hidden items-center gap-2 @[767px]/card:flex">
              <Label htmlFor="type-filter" className="text-sm">ประเภท</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter" className="w-44" size="sm" aria-label="เลือกประเภท">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL" className="rounded-lg">ทุกประเภท</SelectItem>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t} className="rounded-lg">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* mobile range select */}
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
        {/* legend / summary */}
        {/* legend / summary (ใช้สีตรงกับกราฟ + fallback) */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {[
            { key: "all", label: "ทั้งหมด", count: totalCount },
            { key: "active", label: "ใช้งานอยู่", count: activeCount },
            { key: "stock", label: "อยู่ในคลัง", count: stockCount },
            { key: "repair", label: "กำลังแก้ไข", count: repairCount },
          ].map((it) => {
            // ใช้ var(--color-<key>) ถ้ามี (จะมีเมื่ออยู่ภายใน ChartContainer)
            // ถ้าอยู่นอก ChartContainer จะ fallback เป็น chartConfig[key].color (เช่น var(--chart-1))
            const fallback =
              chartConfig[it.key as keyof typeof chartConfig].color
            const dotColor = `var(--color-${it.key}, ${fallback})`

            return (
              <span key={it.key} className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                  style={{ background: dotColor }}
                />
                <span className="text-base text-foreground">
                  {it.label} {it.count} เครื่อง
                  {it.key === "all" && typeFilter !== "ALL" ? (
                    <span className="ml-1 opacity-80">({typeFilter})</span>
                  ) : null}
                </span>
              </span>
            )
          })}
        </div>


        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 28, left: 12 }}
            onMouseMove={(state: any) => setActiveIndex(state?.activeTooltipIndex)}
            onMouseLeave={() => setActiveIndex(undefined)}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
            <YAxis allowDecimals={false} />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => {
                    const v = typeof value === "number" ? value : Number(value)
                    if (name === "active") return `ที่ใช้งานอยู่ ${v} เครื่อง`
                    if (name === "stock") return `อยู่ในคลัง ${v} เครื่อง`
                    if (name === "repair") return `กำลังแก้ไข ${v} เครื่อง`
                    if (name === "all") return `ทั้งหมด ${v} เครื่อง`
                    return String(value)
                  }}
                />
              }
            />

            {/* แท่งคู่/หลายแท่งแบบ grouped */}
            <Bar
              dataKey="all"
              radius={6}
              strokeWidth={2}
              fill="var(--color-all)"
              activeIndex={activeIndex}
              activeBar={(props) => (
                <Rectangle {...props} fillOpacity={0.9} stroke="var(--color-all)" strokeDasharray={4} strokeDashoffset={4} />
              )}
            >
              <LabelList dataKey="all" position="top" />
            </Bar>

            <Bar
              dataKey="active"
              radius={6}
              strokeWidth={2}
              fill="var(--color-active)"
              activeIndex={activeIndex}
              activeBar={(props) => (
                <Rectangle {...props} fillOpacity={0.9} stroke="var(--color-active)" strokeDasharray={4} strokeDashoffset={4} />
              )}
            >
              <LabelList dataKey="active" position="top" />
            </Bar>

            <Bar
              dataKey="stock"
              radius={6}
              strokeWidth={2}
              fill="var(--color-stock)"
              activeIndex={activeIndex}
              activeBar={(props) => (
                <Rectangle {...props} fillOpacity={0.9} stroke="var(--color-stock)" strokeDasharray={4} strokeDashoffset={4} />
              )}
            >
              <LabelList dataKey="stock" position="top" />
            </Bar>

            <Bar
              dataKey="repair"
              radius={6}
              strokeWidth={2}
              fill="var(--color-repair)"
              activeIndex={activeIndex}
              activeBar={(props) => (
                <Rectangle {...props} fillOpacity={0.9} stroke="var(--color-repair)" strokeDasharray={4} strokeDashoffset={4} />
              )}
            >
              <LabelList dataKey="repair" position="top" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
