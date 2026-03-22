import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden } from "@/lib/api-auth";
import { startOfISOWeek, endOfISOWeek, parseISO } from "date-fns";

function parseISOWeek(weekStr: string): { start: Date; end: Date } {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error("Format de semaine invalide");

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // ISO week date: January 4th is always in week 1
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  const targetDate = new Date(startOfWeek1);
  targetDate.setDate(targetDate.getDate() + (week - 1) * 7);

  return {
    start: startOfISOWeek(targetDate),
    end: endOfISOWeek(targetDate),
  };
}

export async function GET(request: NextRequest) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const date = searchParams.get("date");

    let startDate: Date;
    let endDate: Date;

    if (week) {
      const range = parseISOWeek(week);
      startDate = range.start;
      endDate = range.end;
    } else if (date) {
      const parsed = parseISO(date);
      startDate = startOfISOWeek(parsed);
      endDate = endOfISOWeek(parsed);
    } else {
      startDate = startOfISOWeek(new Date());
      endDate = endOfISOWeek(new Date());
    }

    const where: Record<string, unknown> = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    }

    const affectations = await prisma.affectation.findMany({
      where,
      include: {
        user: true,
        chantier: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(affectations);
  } catch (error) {
    if (error instanceof Error && error.message === "Format de semaine invalide") {
      return NextResponse.json(
        { error: "Format de semaine invalide. Utilisez le format YYYY-Www (ex: 2026-W12)" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la récupération du planning" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const body = await request.json();
    const { userId, chantierId, date, startTime, endTime, dates } = body;

    if (!userId || !chantierId) {
      return NextResponse.json(
        { error: "L'utilisateur et le chantier sont requis" },
        { status: 400 }
      );
    }

    // Bulk creation
    if (dates && Array.isArray(dates)) {
      const data = dates.map(
        (d: { date: string; startTime: string; endTime: string }) => ({
          userId,
          chantierId,
          date: new Date(d.date),
          startTime: d.startTime,
          endTime: d.endTime,
        })
      );

      try {
        const affectations = await prisma.affectation.createMany({
          data,
          skipDuplicates: true,
        });

        return NextResponse.json(
          { count: affectations.count, message: `${affectations.count} affectation(s) créée(s)` },
          { status: 201 }
        );
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: string }).code === "P2002"
        ) {
          return NextResponse.json(
            { error: "Une ou plusieurs affectations existent déjà pour ces dates" },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    // Single creation
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "La date, l'heure de début et l'heure de fin sont requises" },
        { status: 400 }
      );
    }

    try {
      const affectation = await prisma.affectation.create({
        data: {
          userId,
          chantierId,
          date: new Date(date),
          startTime,
          endTime,
        },
        include: {
          user: true,
          chantier: true,
        },
      });

      return NextResponse.json(affectation, { status: 201 });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Une affectation existe déjà pour cet utilisateur sur ce chantier à cette date" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      { error: "Erreur lors de la création de l'affectation" },
      { status: 500 }
    );
  }
}
