import { NextResponse } from "next/server";
import { generateAuthToken } from "@/lib/auth";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "yogurt";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = generateAuthToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("site-auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
