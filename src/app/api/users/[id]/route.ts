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

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: Number(params.id) },
    select: { id: true, name: true, email: true, role: true, _count: { select: { devices: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...user, devicesCount: user._count.devices });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.email === "string") data.email = body.email;
  if (typeof body.role === "string") data.role = body.role;
  if (typeof body.password === "string" && body.password.trim() !== "") {
    data.password = await bcrypt.hash(body.password, 10);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: Number(params.id) },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
