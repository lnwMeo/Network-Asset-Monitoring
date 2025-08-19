// src/app/dashboard/page.tsx

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth" // ไฟล์ nextAuth options ของคุณ

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"

import data from "./data.json"
import devices from "./data.json"

export default async function Page() {
  const session = await getServerSession(authOptions)

  // ❌ ถ้าไม่ได้ login → ไปหน้า login เลย
  if (!session) {
    redirect("/login")
  }

  // ✅ ถ้า login แล้ว → render dashboard
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards devices={devices} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive devices={devices} />
      </div>
      <DataTable data={data} />
    </div>
  )
}
