"use client";

import { DeviceRow } from "@/schemas/deviceSchema";           // type
import { useIsMobile } from "@/hooks/use-mobile";             // hook
import { daysBetween, daysUntil, ageLabel } from "@/utils/agedevice";  // utils

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

import { Input } from "@/components/ui/input";      // ✅ ขาดตัวนี้
import { Label } from "@/components/ui/label";      // ✅ ขาดตัวนี้

import { StatusBadge } from "@/utils/statusbadge";  // badge

// Drawer (ดูรายละเอียดเร็ว)
export function DeviceDrawer({ item }: { item: DeviceRow }) {
  const isMobile = useIsMobile();
  const ageDays = daysBetween(item.purchaseDate);
  const warrantyDays = daysUntil(item.warrantyEnd);

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>
            {item.assetTag} • {item.type} • {item.vendor || "-"} {item.model || ""}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Status</span>
              <div>
                <StatusBadge status={item.status} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">IP</span>
              <div>{item.ip || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">MAC</span>
              <div>{item.mac || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <div>
                {item.buildingName} / {item.roomName}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Purchased</span>
              <div>{item.purchaseDate || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Installed</span>
              <div>{item.installDate || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Warranty End</span>
              <div>{item.warrantyEnd || "-"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Age</span>
              <div>{ageLabel(ageDays)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Warranty Left</span>
              <div>{warrantyDays ?? "N/A"} days</div>
            </div>
          </div>
          <Separator />
          <form className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" defaultValue={item.vendor ?? ""} />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" defaultValue={item.model ?? ""} />
            </div>
            <div>
              <Label htmlFor="ip">IP</Label>
              <Input id="ip" defaultValue={item.ip ?? ""} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="room">Room</Label>
              <Input id="room" defaultValue={`${item.roomName}`} />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Save</Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
