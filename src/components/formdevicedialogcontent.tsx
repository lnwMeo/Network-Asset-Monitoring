"use client"

import * as React from "react"
import { useState } from "react"
import {
  DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import VendorDialog from "./formvendordialog"
import ModelDialog from "./formmodeldialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { MoreHorizontal } from "lucide-react"

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
  assetNumber?: string | null // รหัสครุภัณฑ์
}
type FormValues = Omit<DeviceRow, "id">

interface Model {
  id: number
  name: string
}

interface Vendor {
  id: number
  name: string
}

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
    assetNumber: "",
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

  // =============== Vendor ===========
  const [vendors, setVendors] = React.useState<Vendor[]>([])
  const [addVendorOpen, setAddVendorOpen] = useState(false)
  const [editVendorOpen, setEditVendorOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  React.useEffect(() => {
    fetch("/api/vendors")
      .then(r => r.json())
      .then(setVendors)
      .catch(err => console.error("Error fetching vendors:", err))
  }, [])

  // =============== Model =============
  const [models, setModels] = React.useState<Model[]>([])
  const [addModelOpen, setAddModelOpen] = React.useState(false)
  const [editModelOpen, setEditModelOpen] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<Model | null>(null)

  // ✅ แก้ไข useEffect สำหรับ model loading
  React.useEffect(() => {
    if (!form.vendor) {
      setModels([])
      update("model", "") // ล้าง model เมื่อไม่มี vendor
      return
    }
    
    const selectedVendor = vendors.find(v => v.name === form.vendor)
    if (selectedVendor) {
      fetch(`/api/models?vendorId=${selectedVendor.id}`)
        .then(r => r.json())
        .then((res) => {
          setModels(res)
          // ✅ ไม่ reset model หากมี model อยู่แล้วและ model นั้นอยู่ใน list ใหม่
          if (form.model && !res.some((m: Model) => m.name === form.model)) {
            update("model", "")
          }
        })
        .catch(err => console.error("Error fetching models:", err))
    }
  }, [form.vendor, vendors]) // ✅ ลบ form.model ออกจาก dependencies

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        {/* =============== Vendor Section =============== */}
        <div className="grid gap-2">
          <Label htmlFor="vendor">Vendor</Label>
          <div className="flex gap-2">
            <Select
              value={form.vendor ?? ""}
              onValueChange={(v) => {
                if (v === "__add__") {
                  setAddVendorOpen(true)
                } else {
                  update("vendor", v)
                }
              }}
            >
              <SelectTrigger className="flex-1"><SelectValue placeholder="เลือก Vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                ))}
                <SelectItem value="__add__" className="text-blue-500">+ เพิ่ม Vendor ใหม่...</SelectItem>
              </SelectContent>
            </Select>
            {form.vendor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      const selectedVendor = vendors.find(v => v.name === form.vendor)
                      if (selectedVendor) {
                        setEditingVendor(selectedVendor)
                        setEditVendorOpen(true)
                      }
                    }}
                  >
                    แก้ไข
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-500"
                    onSelect={async () => {
                      const selectedVendor = vendors.find(v => v.name === form.vendor)
                      if (selectedVendor && confirm("ลบ vendor นี้?")) {
                        try {
                          await fetch(`/api/vendors/${selectedVendor.id}`, { method: "DELETE" })
                          setVendors(prev => prev.filter(it => it.id !== selectedVendor.id))
                          update("vendor", "")
                        } catch (err) {
                          console.error("Error deleting vendor:", err)
                          alert("เกิดข้อผิดพลาดในการลบ vendor")
                        }
                      }
                    }}
                  >
                    ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* =============== Model Section =============== */}
        <div className="grid gap-2">
          <Label htmlFor="model">Model</Label>
          <div className="flex gap-2">
            <Select
              value={form.model ?? ""}
              onValueChange={(v) => {
                if (v === "__add__") {
                  if (!form.vendor) {
                    alert("กรุณาเลือก Vendor ก่อน")
                    return
                  }
                  setAddModelOpen(true)
                } else {
                  update("model", v)
                }
              }}
              disabled={!form.vendor}
            >
              <SelectTrigger>
                <SelectValue placeholder={!form.vendor ? "เลือก Vendor ก่อน" : "เลือก Model"} />
              </SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
                {form.vendor && (
                  <SelectItem value="__add__" className="text-blue-500">+ เพิ่ม Model ใหม่...</SelectItem>
                )}
              </SelectContent>
            </Select>
            {form.model && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      const selectedModel = models.find(m => m.name === form.model)
                      if (selectedModel) {
                        setEditingModel(selectedModel)
                        setEditModelOpen(true)
                      }
                    }}
                  >
                    แก้ไข
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-500"
                    onSelect={async () => {
                      const selectedModel = models.find(m => m.name === form.model)
                      if (selectedModel && confirm("ลบ model นี้?")) {
                        try {
                          await fetch(`/api/models/${selectedModel.id}`, { method: "DELETE" })
                          setModels(p => p.filter(i => i.id !== selectedModel.id))
                          update("model", "")
                        } catch (err) {
                          console.error("Error deleting model:", err)
                          alert("เกิดข้อผิดพลาดในการลบ model")
                        }
                      }
                    }}
                  >
                    ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ip">IP Address</Label>
          <Input id="ip" value={form.ip ?? ""} onChange={(e) => update("ip", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mac">MAC</Label>
          <Input id="mac" value={form.mac ?? ""} onChange={(e) => update("mac", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="buildingCode">รหัสอาคาร *</Label>
          <Input id="buildingCode" value={form.buildingCode} onChange={(e) => update("buildingCode", e.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="buildingName">ชื่ออาคาร *</Label>
          <Input id="buildingName" value={form.buildingName} onChange={(e) => update("buildingName", e.target.value)} required />
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

      {/* Vendor Dialogs */}
      <VendorDialog
        open={addVendorOpen}
        setOpen={setAddVendorOpen}
        title="เพิ่ม Vendor ใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const res = await fetch("/api/vendors", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to create vendor")
            const v = await res.json()
            setVendors(prev => [...prev, v])
            update("vendor", v.name)
          } catch (err) {
            console.error("Error creating vendor:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง vendor")
          }
        }}
      />

      {editingVendor && (
        <VendorDialog
          open={editVendorOpen}
          setOpen={(open) => {
            setEditVendorOpen(open)
            if (!open) setEditingVendor(null)
          }}
          title="แก้ไข Vendor"
          initialName={editingVendor.name}
          onSave={async (name) => {
            try {
              const res = await fetch(`/api/vendors/${editingVendor.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              if (!res.ok) throw new Error("Failed to update vendor")
              setVendors(prev => prev.map((it) => it.id === editingVendor.id ? { ...it, name } : it))
              update("vendor", name)
            } catch (err) {
              console.error("Error updating vendor:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไข vendor")
            }
          }}
        />
      )}

      {/* Model Dialogs */}
      <ModelDialog
        open={addModelOpen}
        setOpen={setAddModelOpen}
        title="เพิ่ม Model ใหม่"
        onSave={async (name) => {
          try {
            const selectedVendor = vendors.find(v => v.name === form.vendor)
            if (!selectedVendor) {
              alert("ไม่พบ vendor ที่เลือก")
              return
            }

            const res = await fetch("/api/models", {
              method: "POST",
              body: JSON.stringify({
                name,
                vendorId: selectedVendor.id
              }),
              headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to create model")
            const m = await res.json()

            setModels(prev => {
              if (prev.some(item => item.id === m.id || item.name === m.name)) return prev
              return [...prev, m]
            })
            update("model", m.name)
          } catch (err) {
            console.error("Error creating model:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง model")
          }
        }}
      />

      {editingModel && (
        <ModelDialog
          open={editModelOpen}
          setOpen={(open) => {
            setEditModelOpen(open)
            if (!open) setEditingModel(null)
          }}
          initialName={editingModel.name}
          title="แก้ไข Model"
          onSave={async (name) => {
            try {
              const res = await fetch(`/api/models/${editingModel.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              if (!res.ok) throw new Error("Failed to update model")
              setModels(p => p.map((it) => (it.id === editingModel.id ? { ...it, name } : it)))
              update("model", name)
            } catch (err) {
              console.error("Error updating model:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไข model")
            }
          }}
        />
      )}
    </DialogContent>
  )
}