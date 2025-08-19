"use client"
import { useSession, signOut } from "next-auth/react"
import { NavUser } from "@/components/nav-user"

export function HeaderBar() {
    const { data: session, status } = useSession()

    if (status !== "authenticated") return null

    return (
        <NavUser
            user={{
                name: session.user?.name || "",    // ป้องกัน undefined
                email: session.user?.email || "",

            }}
        />
    )
}
