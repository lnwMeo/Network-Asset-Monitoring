"use client"

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
import { useState, useEffect } from "react"

export default function ModelDialog({
  open,
  setOpen,
  title,
  initialName = "",
  onSave,
}: {
  open: boolean
  setOpen: (o: boolean) => void
  title: string
  initialName?: string
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Label>ชื่อ Model</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              ยกเลิก
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => {
              onSave(name)
              setOpen(false)
            }}
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
