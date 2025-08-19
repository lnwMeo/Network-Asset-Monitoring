"use client"

import * as React from "react"
import {
  DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export type DeviceRow = {
  id: number
  assetTag: string
  name: string
  type: string
  status?: string
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
  assetNumber?: string | null // รหัสครุภัณฑ์ (ถ้ายังไม่ได้เพิ่มก็ใส่เพิ่มได้)
}

type FormValues = Omit<DeviceRow, "id">

const TYPES = ["ROUTER", "SWITCH", "ACCESS_POINT", "FIREWALL", "SERVER", "PC", "LAPTOP", "PRINTER", "UPS"]

export default function FormDeviceDialogContent({
  mode = "create",
  initial,
  onSubmit,
}: {
  mode?: "create" | "edit"
  initial?: Partial<FormValues>
  onSubmit: (values: FormValues) => void
}) {
  const [form, setForm] = React.useState<FormValues>({
    assetTag: "",
    name: "",
    type: "",
    status: "ACTIVE",
    vendor: "",
    model: "",
    ip: "",
    mac: "",
    buildingCode: "",
    buildingName: "",
    roomName: "",
    purchaseDate: "",
    installDate: "",
    warrantyEnd: "",
    assetNumber: "", // รหัสครุภัณฑ์
    ...initial,
  })

  React.useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial }))
  }, [initial])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assetTag || !form.name || !form.type || !form.buildingName || !form.roomName) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบ")
      return
    }
    onSubmit(form)
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="assetTag">Asset Tag *</Label>
          <Input id="assetTag" value={form.assetTag} onChange={(e) => update("assetTag", e.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">ชื่ออุปกรณ์ *</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label>ประเภท *</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assetNumber">รหัสครุภัณฑ์</Label>
          <Input id="assetNumber" value={form.assetNumber ?? ""} onChange={(e) => update("assetNumber", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="vendor">Vendor</Label>
          {/* ปรับเป็นดร็อปดาวได้ หากมีรายการตัวเลือก */}
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="model">Model</Label>
          {/* ปรับเป็นดร็อปดาวได้ หากมีรายการตัวเลือก */}
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ip">IP Address</Label>
          <Input id="ip" value={form.ip ?? ""} onChange={(e) => update("ip", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mac">MAC</Label>
          <Input id="mac" value={form.mac ?? ""} onChange={(e) => update("mac", e.target.value)} />
        </div>

        {/* รหัสอาคาร / ชื่ออาคาร เป็น Select ถ้ามี options */}
        <div className="grid gap-2">
          <Label htmlFor="buildingCode">รหัสอาคาร</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="buildingName">ชื่ออาคาร *</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="roomName">ห้อง *</Label>
          <Input id="roomName" value={form.roomName} onChange={(e) => update("roomName", e.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="purchaseDate">วันที่ซื้อ</Label>
          <Input id="purchaseDate" type="date" value={form.purchaseDate ?? ""} onChange={(e) => update("purchaseDate", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="installDate">วันที่ติดตั้ง</Label>
          <Input id="installDate" type="date" value={form.installDate ?? ""} onChange={(e) => update("installDate", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="warrantyEnd">สิ้นสุดประกัน</Label>
          <Input id="warrantyEnd" type="date" value={form.warrantyEnd ?? ""} onChange={(e) => update("warrantyEnd", e.target.value)} />
        </div>

        <DialogFooter className="col-span-1 md:col-span-2 gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button type="submit">{mode === "edit" ? "บันทึกการเปลี่ยนแปลง" : "บันทึก"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
