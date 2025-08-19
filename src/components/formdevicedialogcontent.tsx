"use client"

import * as React from "react"
import { useState, useRef } from "react"
import {
  DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import VendorDialog from "./formvendordialog"
import ModelDialog from "./formmodeldialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { MoreHorizontal, Upload, X, Star, ImageIcon } from "lucide-react"

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
  assetNumber?: string | null
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

interface DeviceImage {
  id?: number
  file?: File
  url: string
  originalName: string
  isPrimary: boolean
  isNew?: boolean
}

const TYPES = ["ROUTER", "SWITCH", "ACCESS_POINT", "FIREWALL", "SERVER", "PC", "LAPTOP", "PRINTER", "UPS"]

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

  // =============== Image Upload ===============
  const [images, setImages] = useState<DeviceImage[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial }))
  }, [initial])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // =============== Image Functions ===============
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newImages: DeviceImage[] = []
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        newImages.push({
          file,
          url,
          originalName: file.name,
          isPrimary: images.length === 0 && index === 0, // รูปแรกเป็น primary
          isNew: true
        })
      }
    })

    setImages(prev => [...prev, ...newImages])
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index)
      
      // หากลบรูป primary ไป ให้ตัวแรกเป็น primary
      if (prev[index].isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true
      }
      
      // Clean up object URL
      if (prev[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(prev[index].url)
      }
      
      return newImages
    })
  }

  const setPrimaryImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assetTag || !form.name || !form.type || !form.buildingName || !form.roomName) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบ")
      return
    }
    onSubmit(form, images)
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

  React.useEffect(() => {
    if (!form.vendor) {
      setModels([])
      update("model", "")
      return
    }
    
    const selectedVendor = vendors.find(v => v.name === form.vendor)
    if (selectedVendor) {
      fetch(`/api/models?vendorId=${selectedVendor.id}`)
        .then(r => r.json())
        .then((res) => {
          setModels(res)
          if (form.model && !res.some((m: Model) => m.name === form.model)) {
            update("model", "")
          }
        })
        .catch(err => console.error("Error fetching models:", err))
    }
  }, [form.vendor, vendors])

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          {/* Vendor Section */}
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

          {/* Model Section */}
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
    </DialogContent>
  )
}