import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ClientType } from "@prisma/client";

// GET /api/cases - List cases for the logged-in user
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        clientType: true,
        clientAName: true,
        clientBName: true,
        clientEmail: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          select: { id: true, docType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ cases });
  } catch {
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

// POST /api/cases - Create a new case.
//
// Two auth paths:
//   1. Session (adviser using the Builder UI directly) — as before.
//   2. Service (QuoteHub CRM push): header `x-crm-service-token` === SOA_BRIDGE_SECRET.
//      The CRM aggregates the lead file (transcripts, fact-find, notes, emails) and
//      creates a PRE-FILLED case here. We attach it to the adviser's Builder user
//      (resolved from adviserEmail, falling back to the first user = Craig) so that
//      GET /cases/:id — which requires case.userId === session.userId — lets them
//      open it after logging in.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const serviceToken = request.headers.get("x-crm-service-token");
    const isService =
      !!serviceToken &&
      !!process.env.SOA_BRIDGE_SECRET &&
      serviceToken === process.env.SOA_BRIDGE_SECRET;

    let userId: string;
    if (isService) {
      const adviserEmail: string | undefined =
        typeof body.adviserEmail === "string" ? body.adviserEmail : undefined;
      // Resolve by LOGIN email first — that's the identity a session carries
      // (session.userId = the user whose `email` they logged in with), and the
      // /cases/:id gate requires case.userId === session.userId. Matching the
      // free-text adviser_email column first can attach the case to a different
      // login (two seeded users may share an adviser_email), 404-ing it for the
      // adviser who created it. Fall back to adviserEmail (deterministic), then first user.
      const user =
        (adviserEmail
          ? (await prisma.user.findFirst({ where: { email: adviserEmail } })) ||
            (await prisma.user.findFirst({ where: { adviserEmail }, orderBy: { createdAt: "asc" } }))
          : null) || (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
      if (!user) {
        return NextResponse.json(
          { error: "No adviser user available to own the case" },
          { status: 400 }
        );
      }
      userId = user.id;
    } else {
      const session = await getSession();
      if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.userId;
    }

    const newCase = await prisma.case.create({
      data: {
        userId,
        title: body.title || `New Case — ${new Date().toLocaleDateString("en-NZ")}`,
        clientType: body.clientType === "PARTNER" ? ClientType.PARTNER : ClientType.INDIVIDUAL,
        clientAName: body.clientAName || null,
        clientBName: body.clientBName || null,
        clientEmail: body.clientEmail || null,
        clientAHasExisting:
          typeof body.clientAHasExisting === "boolean" ? body.clientAHasExisting : false,
        clientBHasExisting:
          typeof body.clientBHasExisting === "boolean" ? body.clientBHasExisting : false,
        firefliesText: body.firefliesText || null,
        quotesText: body.quotesText || null,
        otherDocsText: body.otherDocsText || null,
        additionalContext: body.additionalContext || null,
      },
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cases]", err);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
