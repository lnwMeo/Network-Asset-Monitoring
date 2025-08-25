"use client";

import * as React from "react";
import { z } from "zod";
import { useSession } from "next-auth/react";
import {
  closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, type UniqueIdentifier
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ColumnDef, ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, Row, SortingState, useReactTable, VisibilityState
} from "@tanstack/react-table";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  IconGripVertical, IconDotsVertical, IconPlus,
  IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight
} from "@tabler/icons-react";

// ---------- Types ----------
export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string; // "ADMIN" | "USER"
  devicesCount?: number;
};

// ---------- Small helpers ----------
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground size-7 hover:bg-transparent">
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function DraggableRow({ row }: { row: Row<UserRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.original.id });
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------- Form (Dialog) ----------
const baseSchema = z.object({
  name: z.string().min(1, "กรอกชื่อ"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  password: z.string().optional(), // create จะบังคับด้านนอก
});
type UserFormValues = z.infer<typeof baseSchema>;

function UserFormDialog({
  mode, initial, open, onOpenChange, onSubmit, submitting
}: {
  mode: "create" | "edit";
  initial?: Partial<UserRow>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
  submitting?: boolean;
}) {
  const [values, setValues] = React.useState<UserFormValues>(() => ({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: (initial?.role as "ADMIN" | "USER") ?? "USER",
    password: "",
  }));

  React.useEffect(() => {
    setValues({
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      role: (initial?.role as "ADMIN" | "USER") ?? "USER",
      password: "",
    });
  }, [initial, open]);

  const submit = async () => {
    // validate
    const schema = mode === "create"
      ? baseSchema.extend({ password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร") })
      : baseSchema;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    await onSubmit(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "เพิ่มผู้ใช้" : "แก้ไขผู้ใช้"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>ชื่อ</Label>
            <Input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>อีเมล</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>บทบาท</Label>
            <Select
              value={values.role}
              onValueChange={(val) => setValues((v) => ({ ...v, role: val as "ADMIN" | "USER" }))}
            >
              <SelectTrigger><SelectValue placeholder="เลือกบทบาท" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{mode === "create" ? "รหัสผ่าน (อย่างน้อย 6 ตัว)" : "ตั้งรหัสผ่านใหม่ (เว้นว่างได้)"}</Label>
            <Input
              type="password"
              value={values.password ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              placeholder={mode === "create" ? "••••••" : "(ไม่เปลี่ยนรหัส ปล่อยว่าง)"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={!!submitting}>
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Table ----------
export function UsersTableAdmin({ data: initialData }: { data: UserRow[] }) {
  const { data: session } = useSession();
  const isAdmin = ((session?.user as any)?.role ?? "").toString().toUpperCase() === "ADMIN";

  const [data, setData] = React.useState<UserRow[]>(() => initialData);
  React.useEffect(() => setData(initialData), [initialData]);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "success" | "error"; msg: string } | null>(null);

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map((d) => d.id), [data]);

  const globalFilterFn = React.useCallback(
    (row: Row<UserRow>, _colId: string, value: string) => {
      const q = (value ?? "").toLowerCase();
      const r = row.original;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.role ?? "").toLowerCase().includes(q)
      );
    },
    []
  );

  const columns: ColumnDef<UserRow>[] = [
    { id: "drag", header: () => null, cell: ({ row }) => <DragHandle id={row.original.id} />, enableHiding: false },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "ชื่อ",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "บทบาท",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>{row.original.role}</Badge>
      ),
    },
   
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setFormMode("edit");
                setEditing(row.original);
                setOpenForm(true);
              }}
              disabled={!isAdmin}
            >
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                if (!isAdmin) return;
                if (!confirm(`ลบผู้ใช้ ${row.original.name}?`)) return;
                const id = row.original.id;
                const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
                if (res.ok) {
                  setData((prev) => prev.filter((u) => u.id !== id));
                  setAlert({ type: "success", msg: "ลบผู้ใช้สำเร็จ" });
                } else {
                  const j = await res.json().catch(() => ({}));
                  setAlert({ type: "error", msg: j?.error ?? "ลบไม่สำเร็จ" });
                }
              }}
              disabled={!isAdmin}
            >
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    setData((prev) => {
      const ids = prev.map((d) => d.id);
      const oldIndex = ids.indexOf(active.id as number);
      const newIndex = ids.indexOf(over.id as number);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // submit create/update
  const submitUser = async (vals: z.infer<typeof baseSchema>) => {
    setSubmitting(true);
    try {
      if (formMode === "create") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vals),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Create failed");
        setData((prev) => [{ ...j, devicesCount: 0 }, ...prev]);
        setAlert({ type: "success", msg: "เพิ่มผู้ใช้สำเร็จ" });
      } else if (editing) {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vals),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Update failed");
        setData((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...j } : u)));
        setAlert({ type: "success", msg: "บันทึกการแก้ไขแล้ว" });
      }
      setOpenForm(false);
      setEditing(null);
    } catch (e: any) {
      setAlert({ type: "error", msg: e?.message ?? "ดำเนินการไม่สำเร็จ" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {alert && (
        <Alert variant={alert.type === "success" ? "success" : "destructive"} className="mx-4 mt-4 lg:mx-6">
          <AlertTitle>{alert.type === "success" ? "สำเร็จ!" : "ผิดพลาด"}</AlertTitle>
          <AlertDescription>{alert.msg}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="table" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList>
            <TabsTrigger value="table">ผู้ใช้</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Input
              placeholder="ค้นหา (ชื่อ, อีเมล, บทบาท)"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Dialog open={openForm} onOpenChange={setOpenForm}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormMode("create");
                    setEditing(null);
                    setOpenForm(true);
                  }}
                  disabled={!isAdmin}
                  title={!isAdmin ? "อนุญาตเฉพาะผู้ดูแลระบบ" : undefined}
                >
                  <IconPlus />
                  <span className="hidden lg:inline">Add User</span>
                </Button>
              </DialogTrigger>

              <UserFormDialog
                mode={formMode}
                initial={editing ?? undefined}
                open={openForm}
                onOpenChange={setOpenForm}
                onSubmit={submitUser}
                submitting={submitting}
              />
            </Dialog>
          </div>
        </div>

        <TabsContent
          value="table"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <div className="overflow-hidden rounded-lg border">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id} colSpan={h.colSpan}>
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {table.getRowModel().rows?.length ? (
                    <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id.toString()} row={row} />
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((ps) => (
                      <SelectItem key={ps} value={`${ps}`}>
                        {ps}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                  <span className="sr-only">Go to first page</span>
                  <IconChevronsLeft />
                </Button>
                <Button variant="outline" className="size-8" size="icon"
                  onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <span className="sr-only">Go to previous page</span>
                  <IconChevronLeft />
                </Button>
                <Button variant="outline" className="size-8" size="icon"
                  onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <span className="sr-only">Go to next page</span>
                  <IconChevronRight />
                </Button>
                <Button variant="outline" className="hidden size-8 lg:flex" size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                  <span className="sr-only">Go to last page</span>
                  <IconChevronsRight />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
