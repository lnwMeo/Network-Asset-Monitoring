"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  IconInnerShadowTop,
  IconListDetails,
  IconSettings2
} from "@tabler/icons-react"
import { ModeToggle } from "./ModeToggle"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SessionProvider } from "next-auth/react"

const data = {
  user: {
    name: "SupperO",
    email: "meo@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "แดชบอร์ดอุปกรณ์",
      url: "/dashboard",
      icon: IconListDetails,
    },
  
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  return (
    <SessionProvider>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <a href="#">
                  <IconInnerShadowTop className="!size-5" />
                  <span className="text-base font-semibold">Nrru Network ASSET</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>

          <NavMain items={data.navMain} />
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2 flex justify-between items-center">
            <p className="text-sm">โหมดแสดงผล</p>
            <ModeToggle />
          </div>
          {session?.user && (
            <NavUser
              user={{
                name: session.user.name || "",
                email: session.user.email || "",

              }}
            />
          )}
        </SidebarFooter>
      </Sidebar>
    </SessionProvider>
  )
}
