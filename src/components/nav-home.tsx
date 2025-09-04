import { ModeToggle } from "./ModeToggle"
import { Button } from "./ui/button"
import Link from "next/link"

const NavHome = () => {
    return (
        <nav className="bg-white dark:bg-gray-950/80 fixed w-full z-20 top-0 start-0 border-b ">
            <div className="max-w-screen-2xl flex flex-wrap items-center justify-between mx-auto p-4 ">

                <span className="self-center text-base font-semibold whitespace-nowrap dark:text-white">NETWORK-ASSET</span>

                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse gap-2">
                    <Button variant="outline" size="sm">
                        <Link href="/login">Login</Link>
                    </Button>
                <ModeToggle />
                </div>
            </div>
        </nav>

    )
}
export default NavHome