"use client"

import * as React from "react"
import { useState, useRef } from "react"
import {
  DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import VendorDialog from "./formvendordialog"
import ModelDialog from "./formmodeldialog"
import DeviceTypeDialog from "./formdevicetypedialog"
import BuildingDialog from "./frombuildingdialog"
import RoomDialog from "./formroomdialog"
import StatusDeviceDialog from "./formstatusdevicedialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Upload, X, Star, ImageIcon } from "lucide-react"
import type { DeviceRow, DeviceImage } from "@/schemas/deviceSchema"
// export type DeviceRow = {
//   id: number
//   assetTag: string
//   name: string
//   type: string
//   deviceId: string
//   status?: string
//   vendor?: string | null
//   model?: string | null
//   ip?: string | null
//   mac?: string | null
//   buildingCode: string
//   buildingName: string
//   roomName: string
//   roomId?: number | null
//   purchaseDate?: string | null
//   installDate?: string | null
//   warrantyEnd?: string | null
//   assetNumber?: string | null
//   deviceTypeId?: number | null

//   images?: {
//     id: string | number
//     url: string
//     originalName: string
//     isPrimary?: boolean
//   }[]
// }

type FormValues = Omit<DeviceRow, "id">

interface Model { id: number, name: string }
interface Vendor { id: number, name: string }
interface DeviceType { id: number, name: string }
interface Room { id: number, name: string, buildingId: number }
interface DeviceStatus { id: number, name: string }

// interface DeviceImage {
//   id?: number
//   file?: File
//   url: string
//   originalName: string
//   isPrimary: boolean
//   isNew?: boolean
// }

export default function FormDeviceDialogContent({
  mode = "create",
  initial,
  onSubmit,
}: {
  mode?: "create" | "edit"
  initial?: Partial<FormValues>
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
    ...initial,
  })

  // === IMAGE SECTION ===
  const [images, setImages] = useState<DeviceImage[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial }))
  }, [initial])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function saveDevice() {
    if (mode === "create") {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Create device error")
      const device = await res.json()
      return device.id
    }
    const res = await fetch(`/api/devices/${(initial as any).id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error("Update device error")
    const device = await res.json()
    return device.id
  }

  async function uploadImages(devId: number) {
    const formData = new FormData()
    images.filter(img => img.isNew).forEach(img => {
      formData.append("images", img.file!)
    })
    if (formData.has("images")) {
      await fetch(`/api/devices/${devId}/images`, {
        method: "POST",
        body: formData,
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assetTag || !form.name || !form.type || !form.buildingName || !form.roomName) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบ")
      return
    }
    try {
      setUploading(true)
      const id = await saveDevice()
      await uploadImages(id)
      onSubmit(form, images)
      alert("บันทึกสำเร็จ")
    } catch (err) {
      console.error(err)
      alert("เกิดข้อผิดพลาด")
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const arr: DeviceImage[] = []
    Array.from(files).forEach((file, idx) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        arr.push({ file, url, originalName: file.name, isPrimary: images.length === 0 && idx === 0, isNew: true })
      }
    })
    setImages(prev => [...prev, ...arr])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (prev[idx].isPrimary && next.length > 0) next[0].isPrimary = true
      if (prev[idx].url.startsWith("blob:")) URL.revokeObjectURL(prev[idx].url)
      return next
    })
  }

  const setPrimaryImage = (i: number) => {
    setImages(p => p.map((it, idx) => ({ ...it, isPrimary: idx === i })))
  }

  // ----- DeviceStatus -----
  const [devicestatuss, setDevicestatuss] = useState<DeviceStatus[]>([])
  const [addDeviceStatusOpen, setAddDeviceStatusOpen] = useState(false)
  const [editDeviceStatusOpen, setEditDeviceStatusOpen] = useState(false)
  const [editingDeviceStatus, setEditingDeviceStatus] = useState<DeviceStatus | null>(null)

  React.useEffect(() => {
    fetch("/api/devicestatus").then(r => r.json()).then(setDevicestatuss)
  }, [])



  // ----- Vendors/Models (เหมือนเดิม) -----
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [addVendorOpen, setAddVendorOpen] = useState(false)
  const [editVendorOpen, setEditVendorOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  React.useEffect(() => {
    fetch("/api/vendors").then(r => r.json()).then(setVendors)
  }, [])

  const [models, setModels] = useState<Model[]>([])
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [editModelOpen, setEditModelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  React.useEffect(() => {
    if (!form.vendor) { setModels([]); update("model", ""); return }
    const v = vendors.find(v => v.name === form.vendor)
    if (!v) return
    fetch(`/api/models?vendorId=${v.id}`).then(r => r.json()).then((res) => {
      setModels(res)
      if (form.model && !res.some((m: Model) => m.name === form.model)) update("model", "")
    })
  }, [form.vendor, vendors])

  // ----- DeviceType -----
  const [devicetypes, setDevicetypes] = useState<DeviceType[]>([])
  const [addDevicetypeOpen, setAddDevicetypeOpen] = useState(false)
  const [editDevicetypeOpen, setEditDevicetypeOpen] = useState(false)
  const [editingDevicetype, setEditingDevicetype] = useState<DeviceType | null>(null)

  React.useEffect(() => {
    fetch("/api/devicetypes").then(r => r.json()).then(setDevicetypes)
  }, [])

  // ----- Buildings/Rooms -----
  const [buildings, setBuildings] = useState<{ id: number, code: string, name: string }[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [addBuildingOpen, setAddBuildingOpen] = useState(false)
  const [editBuildingOpen, setEditBuildingOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<{ id: number, code: string, name: string } | null>(null)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [editRoomOpen, setEditRoomOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  React.useEffect(() => {
    fetch("/api/buildings").then(r => r.json()).then(setBuildings)
  }, [])

  React.useEffect(() => {
    if (!form.buildingCode) { setRooms([]); update("roomName", ""); update("roomId", null); return }
    const b = buildings.find(bb => bb.code === form.buildingCode)
    if (!b) return
    fetch(`/api/rooms?buildingId=${b.id}`).then(r => r.json()).then(res => {
      setRooms(res)
      if (form.roomName && !res.some((rr: Room) => rr.name === form.roomName)) {
        update("roomName", ""); update("roomId", null)
      }
    })
  }, [form.buildingCode, buildings])

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{mode === "edit" ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="assetTag">Asset Tag<p className="text-red-600">*</p></Label>
            <Input id="assetTag" value={form.assetTag} onChange={(e) => update("assetTag", e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">ชื่ออุปกรณ์<p className="text-red-600">*</p></Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="devicetype">ประเภท<p className="text-red-600">*</p></Label>
            <div className="flex gap-2">
              <Select
                value={form.deviceTypeId?.toString() ?? ""}
                onValueChange={(value) => {
                  if (value === "__add__") {
                    setAddDevicetypeOpen(true)
                  } else {
                    const deviceType = devicetypes.find(d => d.id.toString() === value)
                    if (deviceType) {
                      update("deviceTypeId", deviceType.id)
                      update("type", deviceType.name)
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
                    + เพิ่ม DeviceType ใหม่...
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
                        if (selectedDeviceType && confirm("ลบ device type นี้?")) {
                          try {
                            await fetch(`/api/devicetypes/${selectedDeviceType.id}`, { method: "DELETE" })
                            setDevicetypes(prev => prev.filter(it => it.id !== selectedDeviceType.id))
                            update("deviceTypeId", null)
                            update("type", "")
                          } catch (err) {
                            console.error("Error deleting device type:", err)
                            alert("เกิดข้อผิดพลาดในการลบ device type")
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
            <Label htmlFor="devicestatus">สถานะ <p className="text-red-600">*</p></Label>
            <div className="flex gap-2">
              <Select
                value={form.statusId?.toString() ?? ""}
                onValueChange={(value) => {
                  if (value === "__add__") {
                    setAddDeviceStatusOpen(true)
                  } else {
                    const deviceStatus = devicestatuss.find(d => d.id.toString() === value)
                    if (deviceStatus) {
                      update("statusId", deviceStatus.id)
                      update("statusName", deviceStatus.name)
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
              {form.statusId && (
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
                            await fetch(`/api/devicestatus/${selectedDeviceStatus.id}`, { method: "DELETE" })
                            setDevicestatuss(prev => prev.filter(it => it.id !== selectedDeviceStatus.id))
                            update("statusId", null)
                            update("statusName", "")
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
            <Input id="deviceId" value={form.deviceId ?? ""} onChange={(e) => update("deviceId", e.target.value)} />
          </div>

          {/* Vendor Section */}
          <div className="grid gap-2">
            <Label htmlFor="vendor">ยี่ห้อ<p className="text-red-600">*</p></Label>
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

          {/* Model Section */}
          <div className="grid gap-2">
            <Label htmlFor="model">รุ่น<p className="text-red-600">*</p></Label>
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

          {/* Building Section */}
          <div className="grid gap-2">
            <Label>อาคาร<p className="text-red-600">*</p></Label>
            <div className="flex gap-2">
              <Select
                value={form.buildingCode}
                onValueChange={(v) => {
                  if (v === "__add__") {
                    setAddBuildingOpen(true)
                  } else {
                    const b = buildings.find(b => b.code === v)
                    if (b) {
                      update("buildingCode", b.code)
                      update("buildingName", b.name)
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
                      const b = buildings.find(bb => bb.code === form.buildingCode)
                      if (b) { setEditingBuilding(b); setEditBuildingOpen(true) }
                    }}>แก้ไข</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500"
                      onSelect={async () => {
                        const b = buildings.find(bb => bb.code === form.buildingCode)
                        if (b && confirm("ลบ building นี้?")) {
                          await fetch(`/api/buildings/${b.id}`, { method: "DELETE" })
                          setBuildings(prev => prev.filter(it => it.id !== b.id))
                          update("buildingCode", "")
                          update("buildingName", "")
                        }
                      }}>ลบ</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Room Section */}
          <div className="grid gap-2">
            <Label htmlFor="room">ห้อง<p className="text-red-600">*</p></Label>
            <div className="flex gap-2">
              <Select
                value={form.roomId?.toString() ?? ""}
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
                      update("roomId", room.id)
                      update("roomName", room.name)
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
              {form.roomId && (
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
                            await fetch(`/api/rooms/${selectedRoom.id}`, { method: "DELETE" })
                            setRooms(prev => prev.filter(it => it.id !== selectedRoom.id))
                            update("roomId", null)
                            update("roomName", "")
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
            <Label htmlFor="purchaseDate">วันที่ซื้อ<p className="text-red-600">*</p></Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate ?? ""} onChange={(e) => update("purchaseDate", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="installDate">วันที่ติดตั้ง<p className="text-red-600">*</p></Label>
            <Input id="installDate" type="date" value={form.installDate ?? ""} onChange={(e) => update("installDate", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="warrantyEnd">สิ้นสุดประกัน<p className="text-red-600">*</p></Label>
            <Input id="warrantyEnd" type="date" value={form.warrantyEnd ?? ""} onChange={(e) => update("warrantyEnd", e.target.value)} />
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

        <DialogFooter className="gap-2">
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

      {/* DeviceType Dialogs */}
      <DeviceTypeDialog
        open={addDevicetypeOpen}
        setOpen={setAddDevicetypeOpen}
        title="เพิ่ม DeviceType ใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const res = await fetch("/api/devicetypes", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to create device type")
            const d = await res.json()
            setDevicetypes(prev => [...prev, d])
            update("deviceTypeId", d.id)
            update("type", d.name)
          } catch (err) {
            console.error("Error creating device type:", err)
            alert("เกิดข้อผิดพลาดในการสร้าง device type")
          }
        }}
      />

      {editingDevicetype && (
        <DeviceTypeDialog
          open={editDevicetypeOpen}
          setOpen={(open) => {
            setEditDevicetypeOpen(open)
            if (!open) setEditingDevicetype(null)
          }}
          title="แก้ไข DeviceType"
          initialName={editingDevicetype.name}
          onSave={async (name) => {
            try {
              const res = await fetch(`/api/devicetypes/${editingDevicetype.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              if (!res.ok) throw new Error("Failed to update device type")
              setDevicetypes(prev => prev.map((it) => it.id === editingDevicetype.id ? { ...it, name } : it))
              update("type", name)
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
            const res = await fetch("/api/buildings", {
              method: "POST",
              body: JSON.stringify({ code, name }),
              headers: { "Content-Type": "application/json" }
            })
            if (!res.ok) throw new Error("Failed to create building")
            const b = await res.json()
            setBuildings(prev => [...prev, b])
            update("buildingCode", b.code)
            update("buildingName", b.name)
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
              const res = await fetch(`/api/buildings/${editingBuilding.id}`, {
                method: "PUT",
                body: JSON.stringify({ code, name }),
                headers: { "Content-Type": "application/json" }
              })
              if (!res.ok) throw new Error("Failed to update building")
              const upd = await res.json()
              setBuildings(prev => prev.map(it => it.id === upd.id ? upd : it))
              update("buildingCode", upd.code)
              update("buildingName", upd.name)
            } catch (err) {
              console.error("Error updating building:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไขอาคาร")
            }
          }}
        />
      )}

      {/* Room Dialogs */}
      <RoomDialog
        open={addRoomOpen}
        setOpen={setAddRoomOpen}
        title="เพิ่มห้องใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const selectedBuilding = buildings.find(b => b.code === form.buildingCode)
            if (!selectedBuilding) {
              alert("ไม่พบอาคารที่เลือก")
              return
            }

            const res = await fetch("/api/rooms", {
              method: "POST",
              body: JSON.stringify({
                name,
                buildingId: selectedBuilding.id
              }),
              headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to create room")
            const r = await res.json()

            setRooms(prev => {
              if (prev.some(item => item.id === r.id || item.name === r.name)) return prev
              return [...prev, r]
            })
            update("roomId", r.id)
            update("roomName", r.name)
          } catch (err) {
            console.error("Error creating room:", err)
            alert("เกิดข้อผิดพลาดในการสร้างห้อง")
          }
        }}
      />

      {editingRoom && (
        <RoomDialog
          open={editRoomOpen}
          setOpen={(open) => {
            setEditRoomOpen(open)
            if (!open) setEditingRoom(null)
          }}
          title="แก้ไขห้อง"
          initialName={editingRoom.name}
          onSave={async (name) => {
            try {
              const res = await fetch(`/api/rooms/${editingRoom.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              if (!res.ok) throw new Error("Failed to update room")
              setRooms(prev => prev.map((it) => it.id === editingRoom.id ? { ...it, name } : it))
              update("roomName", name)
            } catch (err) {
              console.error("Error updating room:", err)
              alert("เกิดข้อผิดพลาดในการแก้ไขห้อง")
            }
          }}
        />
      )}


        <StatusDeviceDialog
        open={addDeviceStatusOpen}
        setOpen={setAddDeviceStatusOpen}
        title="เพิ่มสถานะใหม่"
        initialName=""
        onSave={async (name) => {
          try {
            const res = await fetch("/api/devicestatus", {
              method: "POST",
              body: JSON.stringify({ name }),
              headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to create device status")
            const d = await res.json()
            setDevicestatuss(prev => [...prev, d])
            update("statusId", d.id)
            update("statusName", d.name)
          } catch (err) {
            console.error("Error creating device status:", err)
            alert("เกิดข้อผิดพลาดในการสร้างสถานะ")
          }
        }}
      />

      {editingDeviceStatus && (
        <StatusDeviceDialog
          open={editDeviceStatusOpen}
          setOpen={(open) => {
            setEditDeviceStatusOpen(open)
            if (!open) setEditingDeviceStatus(null)
          }}
          title="แก้ไขสถานะ"
          initialName={editingDeviceStatus.name}
          onSave={async (name) => {
            try {
              const res = await fetch(`/api/devicestatus/${editingDeviceStatus.id}`, {
                method: "PUT",
                body: JSON.stringify({ name }),
                headers: { "Content-Type": "application/json" },
              })
              if (!res.ok) throw new Error("Failed to update device status")
              setDevicestatuss(prev => prev.map((it) => it.id === editingDeviceStatus.id ? { ...it, name } : it))
              update("statusName", name)
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