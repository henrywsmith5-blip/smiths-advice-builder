import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { email: session.email, userId: session.userId },
  });
}
