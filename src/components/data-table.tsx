"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import FormDeviceDialogContent from "@/components/formdevicedialogcontent";
import DataDeviceDialogContent from "@/components/datadevicedialog";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FilterFn } from "@tanstack/react-table";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import type { DeviceRow } from "@/schemas/deviceSchema";
import { downloadDeviceQRAsPDF, downloadDevicesQRBatchPDF } from "@/utils/qrpdf";

import { DeviceDrawer } from "@/components/DeviceDrawer";
// import { StatusBadge } from "@/utils/statusbadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { daysBetween, daysUntil, ageLabel, formatDaysUntil } from "@/utils/agedevice";


// =====================
// Small components
// =====================
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function DraggableRow({ row }: { row: Row<DeviceRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });
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

// =====================
// Main
// =====================
export function DataTable({ data: initialData }: { data: DeviceRow[] }) {
  // Dialog (create/edit)
  const [deviceDialogOpen, setDeviceDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeviceRow | null>(null);
  // Dialog (detail)
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<DeviceRow | null>(null);

  // Table states
  const [data, setData] = React.useState<DeviceRow[]>(() => initialData);
  React.useEffect(() => setData(initialData), [initialData]); // ✅ sync เมื่อ props เปลี่ยน

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      buildingName: false,
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState<string>("");

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  );

  // ====== DeviceStatus map (id -> object) เพื่อ lookup ชื่อจาก statusId ======
  type DeviceStatus = { id: number; name: string; color?: string };
  const [statusMap, setStatusMap] = React.useState<
    Record<number, DeviceStatus>
  >({});

  React.useEffect(() => {
    fetch("/api/devicestatus")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: DeviceStatus[]) => {
        const m: Record<number, DeviceStatus> = {};
        list.forEach((s) => {
          m[s.id] = s;
        });
        setStatusMap(m);
      })
      .catch(() => {
        // เงียบได้ — ถ้าโหลดไม่ได้ยังแสดงผลได้จาก string/object เดิม
      });
  }, []);

  // helper: คืนชื่อสถานะจากรูปแบบข้อมูลที่มี (string | object | statusId)
  const getStatusName = React.useCallback(
    (r: DeviceRow): string => {
      const statusObj = r.status;
      const statusName = r.statusName;
      const statusString = r.status;
      const statusId = r.statusId;

      if (typeof statusObj === "object" && statusObj?.name) {
        return String(statusObj.name);
      }
      if (typeof statusName === "string" && statusName) {
        return statusName;
      }
      if (typeof statusString === "string" && statusString) {
        return statusString;
      }
      if (typeof statusId === "number" && statusMap[statusId]?.name) {
        return statusMap[statusId].name;
      }
      return "UNKNOWN";
    },
    [statusMap]
  );

  // Global filter (multi-field)
  const multiFieldGlobalFilter: FilterFn<DeviceRow> = (
    row,
    _colId,
    filterValue
  ) => {
    if (!filterValue) return true;
    const q = String(filterValue).toLowerCase();
    const r = row.original;
    const val = (s?: string | null) => (s ?? "").toLowerCase();

    return (
      val(r.assetTag).includes(q) ||
      val(r.name).includes(q) ||
      val(r.type).includes(q) ||
      val(r.deviceId).includes(q) ||
      getStatusName(r).toLowerCase().includes(q) || // ✅ ค้นหาตามชื่อสถานะจริง
      val(r.vendor).includes(q) ||
      val(r.model).includes(q) ||
      val(r.ip).includes(q) ||
      val(r.mac).includes(q) ||
      val(r.buildingCode).includes(q) ||
      val(r.buildingName).includes(q) ||
      val(r.roomName).includes(q)
    );
  };

  // Filter options
  const buildingOptions = React.useMemo(
    () =>
      Array.from(new Set(data.map((d) => d.buildingName).filter(Boolean))).sort(),
    [data]
  );
  const typeOptions = React.useMemo(
    () => Array.from(new Set(data.map((d) => d.type).filter(Boolean))).sort(),
    [data]
  );
  const statusOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((d) => getStatusName(d))
            .filter((s) => !!s && s !== "UNKNOWN")
        )
      ).sort(),
    [data, getStatusName]
  );

  // Columns
  const columns: ColumnDef<DeviceRow>[] = [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
      enableHiding: false,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "buildingName",
      header: "อาคาร",
      cell: ({ row }) => row.original.buildingName,
      enableHiding: true,
    },

    {
      accessorKey: "assetTag",
      header: "Asset Tag",
      cell: ({ row }) => (
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {row.original.assetTag}
        </Button>
      ),
    },

    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <DeviceDrawer item={row.original} />,
    },
    {
      accessorKey: "deviceId",
      header: "รหัสครุภัณฑ์",
      cell: ({ row }) => row.original.deviceId || "-",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="text-muted-foreground px-1.5 w-32 justify-center"
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="text-muted-foreground px-1.5 w-32 justify-center"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => row.original.ip || "-",
    },
    {
      id: "location",
      header: "อาคาร / ห้อง",
      cell: ({ row }) => (
        <span>
          {row.original.buildingName} / {row.original.roomName}
        </span>
      ),
    },
    {
      id: "age",
      header: "อายุ",
      cell: ({ row }) => ageLabel(daysBetween(row.original.purchaseDate)),
      sortingFn: (a, b) => {
        const da = daysBetween(a.original.purchaseDate) ?? 0;
        const db = daysBetween(b.original.purchaseDate) ?? 0;
        return da - db;
      },
    },
    {
      id: "warrantyLeft",
      header: () => (
        <div className="w-full text-right">ระยะเวลารับประกันคงเหลือ (วัน)</div>
      ),
      cell: ({ row }) => {
        const d = daysUntil(row.original.warrantyEnd);
        const cls =
          d == null
            ? "text-muted-foreground"
            : d < 0
              ? "text-destructive"
              : d <= 30
                ? "text-amber-600"
                : "";

        return (
          <div className={`text-right ${cls}`}>
            {formatDaysUntil(row.original.warrantyEnd, true)}
            {/* true => แสดง "หมดประกัน (X วัน)" เมื่อเกินกำหนด */}
          </div>
        );
      },
      // จัดเรียง: หมดประกัน(ค่าติดลบ) < กำลังจะหมด < N/A(ไปท้าย)
      sortingFn: (a, b) => {
        const da = daysUntil(a.original.warrantyEnd);
        const db = daysUntil(b.original.warrantyEnd);
        const na = da == null ? Number.POSITIVE_INFINITY : da;
        const nb = db == null ? Number.POSITIVE_INFINITY : db;
        return na - nb;
      },
    }

    ,
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                openEdit(row.original);
              }}
            >
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                openDetail(row.original);
              }}
            >
              รายละเอียด
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                // ใส่ชื่อหน่วยงานที่อยากขึ้นบนป้ายได้ที่นี่
                downloadDeviceQRAsPDF(row.original, { unitName: "สำนักคอมพิวเตอร์" });
              }}
            >
              QRcode
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem /* variant="destructive" (ถ้า type ไม่รองรับ ลบ prop นี้) */>
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
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: multiFieldGlobalFilter,
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    setData((prev) => {
      const ids = prev.map((d) => d.id); // ✅ คำนวณจาก state ล่าสุด
      const oldIndex = ids.indexOf(active.id as number);
      const newIndex = ids.indexOf(over.id as number);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function openCreate() {
    setEditing(null);
    setDeviceDialogOpen(true);
  }
  function openEdit(row: DeviceRow) {
    setEditing(row);
    setDeviceDialogOpen(true);
  }
  function openDetail(row: DeviceRow) {
    setDetailItem(row);
    setDetailOpen(true);
  }

  return (
    <>
      {showSuccess && (
        <Alert variant="success" className="mt-4 flex gap-2 items-start py-4">
          <div>
            <AlertTitle>สำเร็จ!</AlertTitle>
            <AlertDescription>เพิ่มข้อมูลอุปกรณ์เรียบร้อยแล้ว</AlertDescription>
          </div>
        </Alert>
      )}
      <Tabs defaultValue="table" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select defaultValue="table">
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table</SelectItem>
            </SelectContent>
          </Select>
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* Global search */}
            <Input
              placeholder="ค้นหา (ชื่อ, AssetTag, IP, Vendor, Model, อาคาร, ห้อง, ประเภท, สถานะ)"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />

            {/* อาคาร */}
            <Select
              onValueChange={(v) =>
                table
                  .getColumn("buildingName")
                  ?.setFilterValue(v === "ALL" ? undefined : v)
              }
              value={
                (table.getColumn("buildingName")?.getFilterValue() as string) ??
                "ALL"
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="อาคาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกอาคาร</SelectItem>
                {buildingOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ประเภท */}
            <Select
              onValueChange={(v) =>
                table.getColumn("type")?.setFilterValue(v === "ALL" ? undefined : v)
              }
              value={(table.getColumn("type")?.getFilterValue() as string) ?? "ALL"}
            >
              <SelectTrigger>
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภท</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* สถานะ */}
            <Select
              onValueChange={(v) =>
                table
                  .getColumn("status")
                  ?.setFilterValue(v === "ALL" ? undefined : v)
              }
              value={
                (table.getColumn("status")?.getFilterValue() as string) ?? "ALL"
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Columns menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden lg:inline">Customize Columns</span>
                  <span className="lg:hidden">Columns</span>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add / Edit dialog */}
            <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <IconPlus />
                  <span className="hidden lg:inline">Add Device</span>
                </Button>
              </DialogTrigger>


              <FormDeviceDialogContent
                mode={editing ? "edit" : "create"}
                initial={editing ?? undefined}
                onSubmit={(values) => {
                  if (editing) {
                    // update row
                    setData((prev) =>
                      prev.map((d) =>
                        d.id === editing.id ? { ...d, ...values } : d
                      )
                    );
                  } else {
                    // create row — ตั้งค่า status เป็น string อย่างน้อย
                    setData((prev) => {
                      const nextId =
                        (prev?.length ? Math.max(...prev.map((d) => d.id)) : 0) +
                        1;

                      const v: any = values;
                      const statusString: string =
                        typeof v.status === "string"
                          ? v.status
                          : v.statusName
                            ? v.statusName
                            : (v.statusId && (statusMap[v.statusId]?.name ?? "")) || "กำลังใช้งาน";

                      const newItem = {
                        id: nextId,
                        ...values,
                        status: statusString, // ✅ ให้เป็นชื่อสถานะไทย
                      } as any as DeviceRow;

                      return [newItem, ...prev];
                    });
                  }
                  setDeviceDialogOpen(false);
                  setEditing(null);
                  setShowSuccess(true);
                  setTimeout(() => setShowSuccess(false), 3000);
                }}
              />
            </Dialog>

            <Button variant="outline" size="sm"
              onClick={() =>
                downloadDevicesQRBatchPDF(
                  table.getSelectedRowModel().rows.map(r => r.original),
                  { unitName: "สำนักคอมพิวเตอร์", cols: 2, rows: 4, page: "A4", orientation: "portrait" }
                )
              }
            >
              พิมพ์ QR (เฉพาะที่เลือก)
            </Button>

            {/* Detail dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
              {detailItem && (
                <DataDeviceDialogContent
                  item={detailItem}
                  onEdit={(it) => {
                    setDetailOpen(false);
                    openEdit(it as DeviceRow);
                  }}
                />
              )}
            </Dialog>
          </div>
        </div>

        {/* TABLE VIEW */}
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
              id={sortableId}
            >
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {table.getRowModel().rows?.length ? (
                    <SortableContext
                      items={dataIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id.toString()} row={row} />
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getAllColumns().length}
                        className="h-24 text-center"
                      >
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
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
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
