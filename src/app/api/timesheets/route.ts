import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const chantierId = searchParams.get("chantierId");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};

    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) where.status = status;
    if (chantierId) where.chantierId = chantierId;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chantier: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(timesheets);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des pointages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const body = await request.json();
    const { date, hours, chantierId, comment } = body;

    if (!date || hours === undefined || !chantierId) {
      return NextResponse.json(
        { error: "La date, les heures et le chantier sont requis" },
        { status: 400 }
      );
    }

    if (typeof hours !== "number" || hours <= 0 || hours > 12) {
      return NextResponse.json(
        { error: "Les heures doivent être comprises entre 0 et 12" },
        { status: 400 }
      );
    }

    const tsDate = new Date(date);

    // Check affectation exists for that day
    const affectation = await prisma.affectation.findFirst({
      where: {
        userId: session.user.id,
        chantierId,
        date: tsDate,
      },
    });

    if (!affectation) {
      return NextResponse.json(
        { error: "Aucune affectation trouvée pour ce chantier à cette date" },
        { status: 400 }
      );
    }

    // Validate max 12h/day across all timesheets
    const existingTimesheets = await prisma.timesheet.findMany({
      where: {
        userId: session.user.id,
        date: tsDate,
      },
      select: { hours: true },
    });

    const totalExisting = existingTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
    if (totalExisting + hours > 12) {
      return NextResponse.json(
        {
          error: `Limite de 12h par jour dépassée. Heures déjà saisies: ${totalExisting}h. Disponible: ${12 - totalExisting}h`,
        },
        { status: 400 }
      );
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        date: tsDate,
        hours,
        chantierId,
        userId: session.user.id,
        comment: comment || null,
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chantier: true,
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la création du pointage" },
      { status: 500 }
    );
  }
}
