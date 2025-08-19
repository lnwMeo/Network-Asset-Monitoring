"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

// 👉 ต้อง import icon ที่ใช้ให้ครบตามนี้
import {
  IconCircleCheckFilled,
  IconAlertTriangle,
  IconTool,
  IconArchive,
  IconQuestionMark,
} from "@tabler/icons-react";

export function StatusBadge({ status }: { status: string }) {
  const norm = status?.toUpperCase?.() || "UNKNOWN";
  const map: Record<
    string,
    {
      label: string;
      icon: React.ReactNode;
      variant: "default" | "secondary" | "outline";
    }
  > = {
    ACTIVE: {
      label: "ACTIVE",
      icon: <IconCircleCheckFilled className="fill-green-500" />,
      variant: "default",
    },
    WARNING: {
      label: "WARNING",
      icon: <IconAlertTriangle className="text-amber-500" />,
      variant: "secondary",
    },
    REPAIR: { label: "REPAIR", icon: <IconTool />, variant: "outline" },
    RETIRED: { label: "RETIRED", icon: <IconArchive />, variant: "outline" },
    UNKNOWN: { label: "UNKNOWN", icon: <IconQuestionMark />, variant: "outline" },
  };

  const cfg = map[norm] ?? map.UNKNOWN;
  return (
    <Badge variant={cfg.variant} className="gap-1 px-1.5">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}
