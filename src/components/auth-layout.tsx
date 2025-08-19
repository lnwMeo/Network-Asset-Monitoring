"use client"

import { SessionProvider } from "next-auth/react"
import { HeaderBar } from "@/components/headerbar"

export default function AuthLayout({ children }: { children: React.ReactNode }){
  return (
    <SessionProvider>
      <HeaderBar />
      {children}
    </SessionProvider>
  )
}
