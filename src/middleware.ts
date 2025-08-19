// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    cookieName: "next-auth.session-token", // หรือ __Secure-next-auth.session-token ถ้า production https
  });

  // ถ้าไม่มี token (ยังไม่ login) => redirect ไป /login
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// ระบุเฉพาะ path ที่ต้องการ protect
export const config = {
  matcher: ["/dashboard/:path*","/settingpage/:path*"],
};
