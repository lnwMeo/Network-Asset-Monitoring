// src/app/(auth)/layout.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Layout login ที่ไม่ต้องมี Sidebar */}
      <div className="min-h-screen bg-muted flex items-center justify-center">
        {children}
      </div>
    </SessionProvider>
  );
}
