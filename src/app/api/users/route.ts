import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role ?? "";
  return role.toString().toUpperCase() === "ADMIN";
}

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { devices: true } },
    },
    orderBy: { id: "asc" },
  });
  // map count -> devicesCount
  return NextResponse.json(
    users.map((u) => ({ ...u, devicesCount: u._count.devices }))
  );
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, email, password, role = "USER" } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, password is required" },
      { status: 400 }
    );
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
