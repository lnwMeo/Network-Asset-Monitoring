"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SingleFieldDialogProps = {
  open: boolean
  setOpen: (o: boolean) => void
  title: string
  label: string
  placeholder?: string
  initialValue?: string
  required?: boolean
  maxLength?: number
  submitText?: string
  cancelText?: string
  onSave: (value: string) => void | Promise<void>
  transformValue?: (value: string) => string // เช่น (v) => v.trim()
}

export default function SingleFieldDialog({
  open,
  setOpen,
  title,
  label,
  placeholder,
  initialValue = "",
  required = false,
  maxLength,
  submitText = "บันทึก",
  cancelText = "ยกเลิก",
  onSave,
  transformValue,
}: SingleFieldDialogProps) {
  const inputId = React.useId()

  const [value, setValue] = React.useState(initialValue)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  // รีเซ็ตค่าเมื่อ initialValue เปลี่ยนหรือเมื่อ dialog เปิดใหม่
  React.useEffect(() => {
    setValue(initialValue)
    setError(null)
  }, [initialValue, open])

  const trimmed = value.trim()
  const initialTrimmed = (initialValue ?? "").trim()
  const changed = trimmed !== initialTrimmed
  const isEmpty = required && trimmed.length === 0
  const disableSave = loading || isEmpty || !changed

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)

    let out = transformValue ? transformValue(value) : value
    out = out.trim()

    if (required && out.length === 0) {
      setError("กรุณากรอกข้อมูล")
      return
    }

    try {
      setLoading(true)
      await onSave(out)
      setOpen(false)
    } catch (err: any) {
      setError(err?.message ?? "บันทึกไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={inputId}>
              {label}{required ? " *" : ""}
            </Label>
            <Input
              id={inputId}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              maxLength={maxLength}
              aria-invalid={!!error}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                {cancelText}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={disableSave}>
              {loading ? "กำลังบันทึก..." : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
