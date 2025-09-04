"use client"

import * as React from "react"
import {
  DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
// import VendorDialog from "./formvendordialog"
// import ModelDialog from "./formmodeldialog"
// import DeviceTypeDialog from "./formdevicetypedialog"
import BuildingDialog from "./frombuildingdialog"
// import RoomDialog from "./formroomdialog"
// import StatusDeviceDialog from "./formstatusdevicedialog"

import WidgetDialog from "./formdialogwidget"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Upload, X, Star, ImageIcon } from "lucide-react"
import type { DeviceRow, DeviceImage } from "@/schemas/deviceSchema"

// ---------- helper: fetch JSON + error ชัดเจน + รองรับ abort ----------
async function fetchJSON<T>(input: RequestInfo, init?: RequestInit & { signal?: AbortSignal }) {
  const res = await fetch(input, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || res.statusText)
  }
  return res.json() as Promise<T>
}

type FormValues = Omit<DeviceRow, "id">

interface Model { id: number, name: string }
interface Vendor { id: number, name: string }
interface DeviceType { id: number, name: string }
interface Room { id: number, name: string, buildingId: number }
interface DeviceStatus { id: number, name: string }
interface Building { id: number, code: string, name: string }

export default function FormDeviceDialogContent({
  mode = "create",
  initial,
  onSubmit,
}: {
  mode?: "create" | "edit"
  initial?: Partial<FormValues> & { id?: number }
  onSubmit: (values: FormValues, images: DeviceImage[]) => void
}) {
  const [form, setForm] = React.useState<FormValues>({
    assetTag: "",
    name: "",
    type: "",
    deviceId: "",
    statusId: null,
    statusName: "",
    vendor: "",
    model: "",
    ip: "",
    mac: "",
    buildingCode: "",
    buildingName: "",
    roomName: "",
    roomId: null,
    purchaseDate: "",
    installDate: "",
    warrantyEnd: "",
    assetNumber: "",
    deviceTypeId: null,
    images: [], // ไม่ได้ใช้ส่งตรงจากฟอร์ม แต่ให้มี type ครบ
    ...initial,
  })

  // =========================================
  // IMAGE SECTION (memory-safe)
  // =========================================
  const [images, setImages] = React.useState<DeviceImage[]>([])
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const blobUrlsRef = React.useRef<string[]>([])
  const [deletedImageIds, setDeletedImageIds] = React.useState<number[]>([]);

  // รับ initial อื่นๆ มาทับ state
  React.useEffect(() => {
    if (initial) setForm(prev => ({ ...prev, ...initial }))
  }, [initial])

  // โหลดรูปเดิมเมื่อเข้าโหมดแก้ไข
  React.useEffect(() => {
    const editId = initial?.id
    if (mode === "edit" && editId) {
      fetchJSON<any[]>(`/api/devices/${editId}/images`)
        .then(rows => {
          setImages(
            rows.map(row => ({
              id: row.id,
              url: row.url,
              originalName: row.originalName,
              isPrimary: !!row.isPrimary,
              isNew: false,
            }))
          )
        })
        .catch(console.error)
    }
  }, [mode, initial?.id])

  const handleFileSelect = React.useCallback((files: FileList | null) => {
    if (!files) return
    const next: DeviceImage[] = []
    Array.from(files).forEach((file, idx) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        blobUrlsRef.current.push(url)
        next.push({
          file,
          url,
          originalName: file.name,
          isPrimary: images.length === 0 && idx === 0,
          isNew: true,
        })
      }
    })
    setImages(prev => [...prev, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [images.length])

  const removeImage = React.useCallback((idx: number) => {
    setImages(prev => {
      const target = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (target?.isPrimary && next.length > 0) next[0].isPrimary = true;

      // ถ้าเป็นรูปเดิมจากเซิร์ฟเวอร์ (isNew === false) ให้จด id ไว้ลบใน DB
      if (!target?.isNew && typeof target?.id === "number") {
        setDeletedImageIds((ids) => ids.includes(target.id) ? ids : [...ids, target.id]);
      }

      if (target?.url?.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return next;
    });
  }, [])

  const setPrimaryImage = React.useCallback((i: number) => {
    setImages(p => p.map((it, idx) => ({ ...it, isPrimary: idx === i })))
  }, [])

  // cleanup blob urls ทั้งหมดตอน unmount
  React.useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(u => { try { URL.revokeObjectURL(u) } catch { } })
      blobUrlsRef.current = []
    }
  }, [])

  // =========================================
  // MASTER DATA
  // =========================================
  const [devicestatuss, setDevicestatuss] = React.useState<DeviceStatus[]>([])
  const [addDeviceStatusOpen, setAddDeviceStatusOpen] = React.useState(false)
  const [editDeviceStatusOpen, setEditDeviceStatusOpen] = React.useState(false)
  const [editingDeviceStatus, setEditingDeviceStatus] = React.useState<DeviceStatus | null>(null)

  React.useEffect(() => {
    fetchJSON<DeviceStatus[]>("/api/devicestatus").then(setDevicestatuss).catch(console.error)
  }, [])

  const [vendors, setVendors] = React.useState<Vendor[]>([])
  const [addVendorOpen, setAddVendorOpen] = React.useState(false)
  const [editVendorOpen, setEditVendorOpen] = React.useState(false)
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null)

  React.useEffect(() => {
    fetchJSON<Vendor[]>("/api/vendors").then(setVendors).catch(console.error)
  }, [])

  const [models, setModels] = React.useState<Model[]>([])
  const [addModelOpen, setAddModelOpen] = React.useState(false)
  const [editModelOpen, setEditModelOpen] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<Model | null>(null)

  const [devicetypes, setDevicetypes] = React.useState<DeviceType[]>([])
  const [addDevicetypeOpen, setAddDevicetypeOpen] = React.useState(false)
  const [editDevicetypeOpen, setEditDevicetypeOpen] = React.useState(false)
  const [editingDevicetype, setEditingDevicetype] = React.useState<DeviceType | null>(null)

  React.useEffect(() => {
    fetchJSON<DeviceType[]>("/api/devicetypes").then(setDevicetypes).catch(console.error)
  }, [])

  const [buildings, setBuildings] = React.useState<Building[]>([])
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [addBuildingOpen, setAddBuildingOpen] = React.useState(false)
  const [editBuildingOpen, setEditBuildingOpen] = React.useState(false)
  const [editingBuilding, setEditingBuilding] = React.useState<Building | null>(null)
  const [addRoomOpen, setAddRoomOpen] = React.useState(false)
  const [editRoomOpen, setEditRoomOpen] = React.useState(false)
  const [editingRoom, setEditingRoom] = React.useState<Room | null>(null)

  React.useEffect(() => {
    fetchJSON<Building[]>("/api/buildings").then(setBuildings).catch(console.error)
  }, [])

  // =========================================
  // ลด .find() ด้วย useMemo + derive ค่า id ที่เลือก
  // =========================================
  const vendorNameToId = React.useMemo(() => {
    const m = new Map<string, number>()
    vendors.forEach(v => m.set(v.name, v.id))
    return m
  }, [vendors])

  const buildingCodeToObj = React.useMemo(() => {
    const m = new Map<string, Building>()
    buildings.forEach(b => m.set(b.code, b))
    return m
  }, [buildings])

  const selectedVendorId = React.useMemo(
    () => (form.vendor ? vendorNameToId.get(form.vendor) ?? null : null),
    [form.vendor, vendorNameToId]
  )

  const selectedBuildingId = React.useMemo(
    () => (form.buildingCode ? buildingCodeToObj.get(form.buildingCode)?.id ?? null : null),
    [form.buildingCode, buildingCodeToObj]
  )

  // =========================================
  // ดึง Models ตาม Vendor (ยกเลิกคำขอเก่าเมื่อเปลี่ยนเร็ว ๆ)
  // =========================================
  React.useEffect(() => {
    if (!form.vendor) { setModels([]); setForm(prev => ({ ...prev, model: "" })); return }
    const vid = selectedVendorId
    if (!vid) return

    const ac = new AbortController()
    fetchJSON<Model[]>(`/api/models?vendorId=${vid}`, { signal: ac.signal })
      .then(res => {
        setModels(res)
        if (form.model && !res.some(m => m.name === form.model)) {
          setForm(prev => ({ ...prev, model: "" }))
        }
      })
      .catch(err => { if ((err as any)?.name !== "AbortError") console.error(err) })

    return () => ac.abort()
    // form.model ใช้ในการ validate หลังโหลดเสร็จแล้ว ไม่ต้องใส่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vendor, selectedVendorId])

  // =========================================
  // ดึง Rooms ตาม Building (ยกเลิกคำขอเก่าเมื่อเปลี่ยนเร็ว ๆ)
  // =========================================
  React.useEffect(() => {
    if (!form.buildingCode) { setRooms([]); setForm(prev => ({ ...prev, roomName: "", roomId: null })); return }
    const bid = selectedBuildingId
    if (!bid) return

    const ac = new AbortController()
    fetchJSON<Room[]>(`/api/rooms?buildingId=${bid}`, { signal: ac.signal })
      .then(res => {
        setRooms(res)
        if (form.roomId == null && form.roomName) {
          const rr = res.find(x => x.name === form.roomName)
          if (rr) setForm(prev => ({ ...prev, roomId: rr.id }))
        }
        if (form.roomName && !res.some(rr => rr.name === form.roomName)) {
          setForm(prev => ({ ...prev, roomName: "", roomId: null }))
        }
      })
      .catch(err => { if ((err as any)?.name !== "AbortError") console.error(err) })

    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.buildingCode, selectedBuildingId])

  // =========================================
  // AUTO-MAP initial "name" -> "id" เมื่อ master data โหลดเสร็จ
  // =========================================

  // 1) statusName -> statusId
  React.useEffect(() => {
    if (devicestatuss.length && form.statusId == null && form.statusName) {
      const m = devicestatuss.find(s => s.name === form.statusName)
      if (m) setForm(prev => ({ ...prev, statusId: m.id }))
    }
  }, [devicestatuss, form.statusId, form.statusName])

  // 2) type (deviceType name) -> deviceTypeId
  React.useEffect(() => {
    if (devicetypes.length && !form.deviceTypeId && form.type) {
      const m = devicetypes.find(t => t.name === form.type)
      if (m) {
        setForm(prev => ({ ...prev, deviceTypeId: m.id, type: m.name }))
      }
    }
  }, [devicetypes, form.deviceTypeId, form.type])

  // 3) buildingName -> buildingCode (กรณี initial ให้ชื่อมา แต่ไม่ได้ให้ code)
  React.useEffect(() => {
    if (buildings.length && !form.buildingCode && form.buildingName) {
      const b = buildings.find(x => x.name === form.buildingName)
      if (b) setForm(prev => ({ ...prev, buildingCode: b.code }))
    }
  }, [buildings, form.buildingCode, form.buildingName])

  // =========================================

  function resetForm() {
    // revoke blob ที่ค้างอยู่ใน images ตอน reset
    images.forEach(img => {
      if (img.url?.startsWith("blob:")) {
        try { URL.revokeObjectURL(img.url) } catch { }
        const i = blobUrlsRef.current.indexOf(img.url)
        if (i !== -1) blobUrlsRef.current.splice(i, 1)
      }
    })
    setForm({
      assetTag: "",
      name: "",
      type: "",
      deviceId: "",
      statusId: null,
      statusName: "",
      vendor: "",
      model: "",
      ip: "",
      mac: "",
      buildingCode: "",
      buildingName: "",
      roomName: "",
      roomId: null,
      purchaseDate: "",
      installDate: "",
      warrantyEnd: "",
      assetNumber: "",
      images: [],
    })
    setImages([]) // เคลียร์รูปภาพที่แสดงในฟอร์ม
  }

  async function saveDevice() {
    const { images: _omit, ...base } = form
    if (mode === "create") {
      const device = await fetchJSON<{ id: number }>("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      return device.id;
    } else {
      const payload = { ...base, deletedImageIds }; // ✅ ส่ง id ที่ลบทิ้ง
      const device = await fetchJSON<{ id: number }>(`/api/devices/${initial!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setDeletedImageIds([]); // เคลียร์หลังสำเร็จ
      return device.id;
    }
  }

  async function uploadImages(devId: number) {
    const newOnes = images.filter(img => img.isNew && img.file)
    if (newOnes.length === 0) return
    const formData = new FormData()
    newOnes.forEach(img => formData.append("images", img.file!))
    await fetchJSON(`/api/devices/${devId}/images`, { method: "POST", body: formData })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) return // กันกดซ้ำ
    if (!form.assetTag || !form.name || !form.deviceTypeId || form.statusId == null || !form.buildingCode || !form.roomId) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบ")
      return
    }
    try {
      setUploading(true)
      const id = await saveDevice()
      await uploadImages(id)
      onSubmit(form, images)
      alert("บันทึกสำเร็จ")
      resetForm()
    } catch (err) {
      console.error(err)
      alert("เกิดข้อผิดพลาด อาจมีข้อมูลซ้ำ")
    } finally {
      setUploading(false)
    }
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{mode === "edit" ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="assetTag">Asset Tag<span className="text-red-600">*</span></Label>
            <Input id="assetTag" value={form.assetTag} onChange={(e) => setForm(p => ({ ...p, assetTag: e.target.value }))} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">ชื่ออุปกรณ์<span className="text-red-600">*</span></Label>
            <Input id="name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="devicetype">ประเภท<span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.deviceTypeId != null ? String(form.deviceTypeId) : ""}
                onValueChange={(value) => {
                  if (value === "__add__") {
                    setAddDevicetypeOpen(true)
                  } else {
                    const dt = devicetypes.find(d => d.id.toString() === value)
                    if (dt) {
                      setForm(prev => ({ ...prev, deviceTypeId: dt.id, type: dt.name }))
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  {devicetypes.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-blue-500">
                    + เพิ่ม ประเภท ใหม่...
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.deviceTypeId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={() => {
                        const selectedDeviceType = devicetypes.find(d => d.id === form.deviceTypeId)
                        if (selectedDeviceType) {
                          setEditingDevicetype(selectedDeviceType)
                          setEditDevicetypeOpen(true)
                        }
                      }}
                    >
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onSelect={async () => {
                        const selectedDeviceType = devicetypes.find(d => d.id === form.deviceTypeId)
                        if (selectedDeviceType && confirm("ลบ ประเภท นี้?")) {
                          try {
                            const res = await fetch(`/api/devicetypes/${selectedDeviceType.id}`, { method: "DELETE" })
                            if (res.status === 409) {
                              const j = await res.json()
                              alert(`ไม่สามารถลบได้: ถูกใช้งานอยู่ ${j.count} รายการ`)
                              return
                            }
                            if (!res.ok) throw new Error("delete device type failed")
                            setDevicetypes(prev => prev.filter(it => it.id !== selectedDeviceType.id))
                            setForm(prev => ({ ...prev, deviceTypeId: null, type: "" }))
                          } catch (err) {
                            console.error("Error deleting device type:", err)
                            alert("เกิดข้อผิดพลาดในการลบ ประเภท")
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
            <Label htmlFor="devicestatus">สถานะ <span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.statusId != null ? String(form.statusId) : ""}
                onValueChange={(value) => {
                  if (value === "__add__") {
                    setAddDeviceStatusOpen(true)
                  } else {
                    const ds = devicestatuss.find(d => d.id.toString() === value)
                    if (ds) {
                      setForm(prev => ({ ...prev, statusId: ds.id, statusName: ds.name }))
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                <SelectContent>
                  {devicestatuss.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-blue-500">
                    + เพิ่มสถานะใหม่...
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.statusId != null && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={() => {
                        const selectedDeviceStatus = devicestatuss.find(d => d.id === form.statusId)
                        if (selectedDeviceStatus) {
                          setEditingDeviceStatus(selectedDeviceStatus)
                          setEditDeviceStatusOpen(true)
                        }
                      }}
                    >
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onSelect={async () => {
                        const selectedDeviceStatus = devicestatuss.find(d => d.id === form.statusId)
                        if (selectedDeviceStatus && confirm("ลบสถานะนี้?")) {
                          try {
                            const response = await fetch(`/api/devicestatus/${selectedDeviceStatus.id}`, { method: "DELETE" })
                            if (response.status === 409) {
                              const errorData = await response.json()
                              alert(`ไม่สามารถลบได้ เนื่องจากมีการใช้งานอยู่ ${errorData.count} รายการ`)
                              return
                            }
                            if (!response.ok) throw new Error("Failed to delete device status")
                            setDevicestatuss(prev => prev.filter(it => it.id !== selectedDeviceStatus.id))
                            setForm(prev => ({ ...prev, statusId: null, statusName: "" }))
                          } catch (err) {
                            console.error("Error deleting device status:", err)
                            alert("เกิดข้อผิดพลาดในการลบสถานะ")
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
            <Label htmlFor="deviceId">รหัสครุภัณฑ์</Label>
            <Input id="deviceId" value={form.deviceId ?? ""} onChange={(e) => setForm(p => ({ ...p, deviceId: e.target.value }))} />
          </div>

          {/* Vendor Section */}
          <div className="grid gap-2">
            <Label htmlFor="vendor">ยี่ห้อ<span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.vendor ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") {
                    setAddVendorOpen(true)
                  } else {
                    // เมื่อเปลี่ยน vendor ให้เคลียร์ model เดิมทันทีเพื่อลด flash
                    setForm(prev => ({ ...prev, vendor: v, model: "" }))
                  }
                }}
              >
                <SelectTrigger className="flex-1"><SelectValue placeholder="เลือก ยี่ห้อ" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-blue-500">+ เพิ่ม ยี่ห้อ ใหม่...</SelectItem>
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
                        if (selectedVendor && confirm("ลบ ยี่ห้อ นี้?")) {
                          try {
                            const res = await fetch(`/api/vendors/${selectedVendor.id}`, { method: "DELETE" })
                            if (res.status === 409) {
                              const j = await res.json()
                              alert(`ไม่สามารถลบได้: ถูกใช้งานอยู่ ${j.count} รายการ`)
                              return
                            }
                            if (!res.ok) throw new Error("delete vendor failed")
                            setVendors(prev => prev.filter(it => it.id !== selectedVendor.id))
                            setForm(prev => ({ ...prev, vendor: "", model: "" }))
                          } catch (err) {
                            console.error("Error deleting vendor:", err)
                            alert("เกิดข้อผิดพลาดในการลบ ยี่ห้อ")
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

          {/* Model Section */}
          <div className="grid gap-2">
            <Label htmlFor="model">รุ่น<span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.model ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") {
                    if (!form.vendor) {
                      alert("กรุณาเลือก ยี่ห้อ ก่อน")
                      return
                    }
                    setAddModelOpen(true)
                  } else {
                    setForm(prev => ({ ...prev, model: v }))
                  }
                }}
                disabled={!form.vendor}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.vendor ? "เลือก ยี่ห้อ ก่อน" : "เลือก รุ่น"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                  {form.vendor && (
                    <SelectItem value="__add__" className="text-blue-500">+ เพิ่ม รุ่น ใหม่...</SelectItem>
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
                            const res = await fetch(`/api/models/${selectedModel.id}`, { method: "DELETE" })
                            if (res.status === 409) {
                              const j = await res.json()
                              alert(`ไม่สามารถลบได้: ถูกใช้งานอยู่ ${j.count} รายการ`)
                              return
                            }
                            if (!res.ok) throw new Error("delete model failed")
                            setModels(p => p.filter(i => i.id !== selectedModel.id))
                            setForm(prev => ({ ...prev, model: "" }))
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
            <Input id="ip" value={form.ip ?? ""} onChange={(e) => setForm(p => ({ ...p, ip: e.target.value }))} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mac">MAC</Label>
            <Input id="mac" value={form.mac ?? ""} onChange={(e) => setForm(p => ({ ...p, mac: e.target.value }))} />
          </div>

          {/* Building Section */}
          <div className="grid gap-2">
            <Label>อาคาร<span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.buildingCode ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") {
                    setAddBuildingOpen(true)
                  } else {
                    const b = buildingCodeToObj.get(v)
                    if (b) {
                      // batch update: ตั้ง building และเคลียร์ห้องทันที
                      setForm(prev => ({
                        ...prev,
                        buildingCode: b.code,
                        buildingName: b.name,
                        roomId: null,
                        roomName: "",
                      }))
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="เลือกอาคาร" /></SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.code}>{b.code} - {b.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-blue-500">+ เพิ่มอาคารใหม่...</SelectItem>
                </SelectContent>
              </Select>
              {form.buildingCode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => {
                      const b = buildingCodeToObj.get(form.buildingCode!)
                      if (b) { setEditingBuilding(b); setEditBuildingOpen(true) }
                    }}>แก้ไข</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500"
                      onSelect={async () => {
                        const b = buildingCodeToObj.get(form.buildingCode!)
                        if (b && confirm("ลบ building นี้?")) {
                          try {
                            const res = await fetch(`/api/buildings/${b.id}`, { method: "DELETE" })
                            if (res.status === 409) {
                              const j = await res.json()
                              alert(`ไม่สามารถลบได้: ถูกใช้งานอยู่ ${j.count} รายการ`)
                              return
                            }
                            if (!res.ok) throw new Error("delete building failed")
                            setBuildings(prev => prev.filter(it => it.id !== b.id))
                            setForm(prev => ({
                              ...prev,
                              buildingCode: "",
                              buildingName: "",
                              roomId: null,
                              roomName: "",
                            }))
                            setRooms([])
                          } catch (err) {
                            console.error("Error deleting building:", err)
                            alert("เกิดข้อผิดพลาดในการลบ building")
                          }
                        }
                      }}>ลบ</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Room Section */}
          <div className="grid gap-2">
            <Label htmlFor="room">ห้อง<span className="text-red-600">*</span></Label>
            <div className="flex gap-2">
              <Select
                value={form.roomId != null ? String(form.roomId) : ""}
                onValueChange={(v) => {
                  if (v === "__add__") {
                    if (!form.buildingCode) {
                      alert("กรุณาเลือกอาคารก่อน")
                      return
                    }
                    setAddRoomOpen(true)
                  } else {
                    const room = rooms.find(r => r.id.toString() === v)
                    if (room) {
                      setForm(prev => ({ ...prev, roomId: room.id, roomName: room.name }))
                    }
                  }
                }}
                disabled={!form.buildingCode}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.buildingCode ? "เลือกอาคารก่อน" : "เลือกห้อง"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                  {form.buildingCode && (
                    <SelectItem value="__add__" className="text-blue-500">+ เพิ่มห้องใหม่...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.roomId != null && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline"><MoreHorizontal size={16} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={() => {
                        const selectedRoom = rooms.find(r => r.id === form.roomId)
                        if (selectedRoom) {
                          setEditingRoom(selectedRoom)
                          setEditRoomOpen(true)
                        }
                      }}
                    >
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onSelect={async () => {
                        const selectedRoom = rooms.find(r => r.id === form.roomId)
                        if (selectedRoom && confirm("ลบห้องนี้?")) {
                          try {
                            const res = await fetch(`/api/rooms/${selectedRoom.id}`, { method: "DELETE" })
                            if (res.status === 409) {
                              const j = await res.json()
                              alert(`ไม่สามารถลบได้: ถูกใช้งานอยู่ ${j.count} รายการ`)
                              return
                            }
                            if (!res.ok) throw new Error("delete room failed")
                            setRooms(prev => prev.filter(it => it.id !== selectedRoom.id))
                            setForm(prev => ({ ...prev, roomId: null, roomName: "" }))
                          } catch (err) {
                            console.error("Error deleting room:", err)
                            alert("เกิดข้อผิดพลาดในการลบห้อง")
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
            <Label htmlFor="purchaseDate">วันที่ซื้อ</Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate ?? ""} onChange={(e) => setForm(p => ({ ...p, purchaseDate: e.target.value }))} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="installDate">วันที่ติดตั้ง</Label>
            <Input id="installDate" type="date" value={form.installDate ?? ""} onChange={(e) => setForm(p => ({ ...p, installDate: e.target.value }))} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="warrantyEnd">สิ้นสุดประกัน</Label>
            <Input id="warrantyEnd" type="date" value={form.warrantyEnd ?? ""} onChange={(e) => setForm(p => ({ ...p, warrantyEnd: e.target.value }))} />
          </div>
        </div>

        {/* =============== Image Upload Section =============== */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-base font-medium">รูปภาพอุปกรณ์</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={16} className="mr-2" />
              {uploading ? 'กำลังอัพโหลด...' : 'เพิ่มรูปภาพ'}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <Card key={index} className="relative group">
                  <CardContent className="p-2">
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={image.originalName}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Primary badge */}
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Star size={12} fill="currentColor" />
                          หลัก
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {!image.isPrimary && images.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setPrimaryImage(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Star size={12} />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {image.originalName}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <ImageIcon size={48} className="text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">ยังไม่มีรูปภาพ</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  เลือกรูปภาพ
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetForm}>ล้างฟอร์ม</Button>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">ยกเลิก</Button>
            </DialogClose>
            <Button type="submit" disabled={uploading}>
              {mode === "edit"
                ? (uploading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง")
                : (uploading ? "กำลังบันทึก..." : "บันทึก")}
            </Button>
          </DialogFooter>
        </div>
      </form>

      {/* Vendor Dialogs */}
      <WidgetDialog
        open={addVendorOpen}
        setOpen={setAddVendorOpen}
        title="เพิ่มยี่ห้อใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const v = await fetchJSON<Vendor>("/api/vendors", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            setVendors(prev => [...prev, v])
            setForm(prev => ({ ...prev, vendor: v.name }))
          } catch (err) {
            console.error("Error creating vendor:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง vendor")
          }
        }}
      />

      {editingVendor && (
        <WidgetDialog
          open={editVendorOpen}
          setOpen={(open) => {
            setEditVendorOpen(open)
            if (!open) setEditingVendor(null)
          }}
          title="แก้ไขยี่ห้อ"
          initialName={editingVendor.name}
          onSave={async (name) => {
            try {
              await fetchJSON(`/api/vendors/${editingVendor.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              setVendors(prev => prev.map((it) => it.id === editingVendor.id ? { ...it, name } : it))
              setForm(prev => ({ ...prev, vendor: name }))
            } catch (err) {
              console.error("Error updating vendor:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไข vendor")
            }
          }}
        />
      )}

      {/* Model Dialogs */}
      <WidgetDialog
        open={addModelOpen}
        setOpen={setAddModelOpen}
        title="เพิ่มรุ่นใหม่"
        onSave={async (name) => {
          try {
            const vid = selectedVendorId
            if (!vid) {
              alert("ไม่พบ ยี่ห้อ ที่เลือก")
              return
            }
            const m = await fetchJSON<Model>("/api/models", {
              method: "POST",
              body: JSON.stringify({ name, vendorId: vid }),
              headers: { "Content-Type": "application/json" },
            })
            setModels(prev => (prev.some(item => item.id === m.id || item.name === m.name) ? prev : [...prev, m]))
            setForm(prev => ({ ...prev, model: m.name }))
          } catch (err) {
            console.error("Error creating model:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง model")
          }
        }}
      />

      {editingModel && (
        <WidgetDialog
          open={editModelOpen}
          setOpen={(open) => {
            setEditModelOpen(open)
            if (!open) setEditingModel(null)
          }}
          initialName={editingModel.name}
          title="แก้ไขรุ่น"
          onSave={async (name) => {
            try {
              await fetchJSON(`/api/models/${editingModel.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              setModels(p => p.map((it) => (it.id === editingModel.id ? { ...it, name } : it)))
              setForm(prev => ({ ...prev, model: name }))
            } catch (err) {
              console.error("Error updating model:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไข model")
            }
          }}
        />
      )}

      {/* DeviceType Dialogs */}
      <WidgetDialog
        open={addDevicetypeOpen}
        setOpen={setAddDevicetypeOpen}
        title="เพิ่มประเภทใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const d = await fetchJSON<DeviceType>("/api/devicetypes", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            setDevicetypes(prev => [...prev, d])
            setForm(prev => ({ ...prev, deviceTypeId: d.id, type: d.name }))
          } catch (err) {
            console.error("Error creating device type:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง device type")
          }
        }}
      />

      {editingDevicetype && (
        <WidgetDialog
          open={editDevicetypeOpen}
          setOpen={(open) => {
            setEditDevicetypeOpen(open)
            if (!open) setEditingDevicetype(null)
          }}
          title="แก้ไขประเภท"
          initialName={editingDevicetype.name}
          onSave={async (name) => {
            try {
              await fetchJSON(`/api/devicetypes/${editingDevicetype.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              setDevicetypes(prev => prev.map((it) => it.id === editingDevicetype.id ? { ...it, name } : it))
              setForm(prev => ({ ...prev, type: name }))
            } catch (err) {
              console.error("Error updating device type:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไข device type")
            }
          }}
        />
      )}

      {/* Building Dialogs */}
      <BuildingDialog
        open={addBuildingOpen}
        setOpen={setAddBuildingOpen}
        title="เพิ่มอาคาร"
        initialCode=""
        initialName=""
        onSave={async (code, name) => {
          try {
            const b = await fetchJSON<Building>("/api/buildings", {
              method: "POST",
              body: JSON.stringify({ code, name }),
              headers: { "Content-Type": "application/json" }
            })
            setBuildings(prev => [...prev, b])
            setForm(prev => ({
              ...prev,
              buildingCode: b.code,
              buildingName: b.name,
              roomId: null,
              roomName: "",
            }))
          } catch (err) {
            console.error("Error creating building:", err)
            alert("เกิดข้อผิดพลาดในการสร้างอาคาร")
          }
        }}
      />

      {editingBuilding && (
        <BuildingDialog
          open={editBuildingOpen}
          setOpen={(o) => { setEditBuildingOpen(o); if (!o) setEditingBuilding(null) }}
          title="แก้ไขอาคาร"
          initialCode={editingBuilding.code}
          initialName={editingBuilding.name}
          onSave={async (code, name) => {
            try {
              const upd = await fetchJSON<Building>(`/api/buildings/${editingBuilding.id}`, {
                method: "PUT",
                body: JSON.stringify({ code, name }),
                headers: { "Content-Type": "application/json" }
              })
              setBuildings(prev => prev.map(it => it.id === upd.id ? upd : it))
              setForm(prev => ({ ...prev, buildingCode: upd.code, buildingName: upd.name }))
            } catch (err) {
              console.error("Error updating building:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไขอาคาร")
            }
          }}
        />
      )}

      {/* Room Dialogs */}
      <WidgetDialog
        open={addRoomOpen}
        setOpen={setAddRoomOpen}
        title="เพิ่มห้องใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const bid = selectedBuildingId
            if (!bid) {
              alert("ไม่พบอาคารที่เลือก")
              return
            }
            const r = await fetchJSON<Room>("/api/rooms", {
              method: "POST",
              body: JSON.stringify({ name, buildingId: bid }),
              headers: { "Content-Type": "application/json" },
            })

            setRooms(prev => (prev.some(item => item.id === r.id || item.name === r.name) ? prev : [...prev, r]))
            setForm(prev => ({ ...prev, roomId: r.id, roomName: r.name }))
          } catch (err) {
            console.error("Error creating room:", err)
            alert("เกิดข้อผิดพลาดในการสร้างห้อง")
          }
        }}
      />

      {editingRoom && (
        <WidgetDialog
          open={editRoomOpen}
          setOpen={(open) => {
            setEditRoomOpen(open)
            if (!open) setEditingRoom(null)
          }}
          title="แก้ไขห้อง"
          initialName={editingRoom.name}
          onSave={async (name) => {
            try {
              await fetchJSON(`/api/rooms/${editingRoom.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              setRooms(prev => prev.map((it) => it.id === editingRoom.id ? { ...it, name } : it))
              setForm(prev => ({ ...prev, roomName: name }))
            } catch (err) {
              console.error("Error updating room:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไขห้อง")
            }
          }}
        />
      )}

      {/* Device Status Dialogs */}
      <WidgetDialog
        open={addDeviceStatusOpen}
        setOpen={setAddDeviceStatusOpen}
        title="เพิ่มสถานะใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const d = await fetchJSON<DeviceStatus>("/api/devicestatus", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            setDevicestatuss(prev => [...prev, d])
            setForm(prev => ({ ...prev, statusId: d.id, statusName: d.name }))
          } catch (err) {
            console.error("Error creating device status:", err)
            alert("เกิดข้อผิดพลาดในการสร้างสถานะ")
          }
        }}
      />

      {editingDeviceStatus && (
        <WidgetDialog
          open={editDeviceStatusOpen}
          setOpen={(open) => {
            setEditDeviceStatusOpen(open)
            if (!open) setEditingDeviceStatus(null)
          }}
          title="แก้ไขสถานะ"
          initialName={editingDeviceStatus.name}
          onSave={async (name) => {
            try {
              await fetchJSON(`/api/devicestatus/${editingDeviceStatus.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              setDevicestatuss(prev => prev.map((it) => it.id === editingDeviceStatus.id ? { ...it, name } : it))
              setForm(prev => ({ ...prev, statusName: name }))
            } catch (err) {
              console.error("Error updating device status:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไขสถานะ")
            }
          }}
        />
      )}

    </DialogContent>
  )
}
