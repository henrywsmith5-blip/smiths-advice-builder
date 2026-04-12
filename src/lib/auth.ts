import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  email: string;
  isLoggedIn: boolean;
  adviserName: string;
  adviserEmail: string;
  adviserPhone: string;
  adviserFsp: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "change-me-to-a-random-32-char-string-minimum!",
  cookieName: "smiths-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.userId,
    email: session.email,
    isLoggedIn: session.isLoggedIn,
    adviserName: session.adviserName || "Craig Smith",
    adviserEmail: session.adviserEmail || "craig@smiths.net.nz",
    adviserPhone: session.adviserPhone || "0274 293 939",
    adviserFsp: session.adviserFsp || "FSP33042",
  };
}
