import { ModeToggle } from "./ModeToggle"
import { Button } from "./ui/button"
import Link from "next/link"
import Image from "next/image"

export default function NavHome() {
    return (
        <nav className="fixed inset-x-0 top-0 z-20 border-b bg-white/80 backdrop-blur dark:bg-zinc-950/80">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3">
                {/* โลโก้ + ชื่อระบบ */}
                <Link href="/" className="flex items-center gap-3" aria-label="หน้าแรก">
                    {/* โหมดสว่าง: ใช้ LogoD | โหมดมืด: ใช้ LogoW */}
                    <Image
                        src="/images/LogoW.png"
                        alt="NRRU Logo"
                        width={40}
                        height={40}
                        className="block h-8 w-8 object-contain dark:hidden"
                        priority
                    />
                    <Image
                        src="/images/LogoD.png"
                        alt="NRRU Logo (dark)"
                        width={40}
                        height={40}
                        className="hidden h-8 w-8 object-contain dark:block"
                        priority
                    />

                    <span className="text-sm font-semibold leading-tight whitespace-nowrap sm:text-base dark:text-white">
                        ระบบรายงานทรัพย์สินด้านระบบสารสนเทศ
                    </span>
                </Link>

                {/* ปุ่มขวา */}
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/login">Login</Link>
                    </Button>
                    <ModeToggle />
                </div>
            </div>
        </nav>
    )
}
