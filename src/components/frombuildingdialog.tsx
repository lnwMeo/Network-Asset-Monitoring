"use client"

import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function BuildingDialog({
    open,
    setOpen,
    title,
    initialCode,
    initialName,
    onSave,
}: {
    open: boolean
    setOpen: (o: boolean) => void
    title: string
    initialCode: string
    initialName: string
    onSave: (code: string, name: string) => void
}) {
    const [code, setCode] = useState(initialCode)
    const [name, setName] = useState(initialName)

    useEffect(() => {
        setCode(initialCode)
        setName(initialName)
    }, [initialCode, initialName])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <Label>รหัสอาคาร</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} required
                        autoFocus />
                </div>
                <div className="grid gap-4">
                    <Label>ชื่ออาคาร</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">ยกเลิก</Button>
                    </DialogClose>
                    <Button type="button" onClick={() => {
                        onSave(code.trim(), name.trim())
                        setOpen(false)
                    }}>
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}