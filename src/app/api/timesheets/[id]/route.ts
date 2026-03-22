import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, notFound } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
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

    if (!timesheet) return notFound("Pointage non trouvé");

    // Workers can only see their own
    if (session.user.role !== "ADMIN" && timesheet.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    return NextResponse.json(timesheet);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération du pointage" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
    });

    if (!timesheet) return notFound("Pointage non trouvé");

    // Owner only
    if (timesheet.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres pointages" },
        { status: 403 }
      );
    }

    // Only DRAFT or REJECTED
    if (!["DRAFT", "REJECTED"].includes(timesheet.status)) {
      return NextResponse.json(
        { error: "Seuls les pointages en brouillon ou rejetés peuvent être modifiés" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { hours, comment, chantierId } = body;

    if (hours !== undefined) {
      if (typeof hours !== "number" || hours <= 0 || hours > 12) {
        return NextResponse.json(
          { error: "Les heures doivent être comprises entre 0 et 12" },
          { status: 400 }
        );
      }

      // Validate max 12h/day (excluding current timesheet)
      const existingTimesheets = await prisma.timesheet.findMany({
        where: {
          userId: session.user.id,
          date: timesheet.date,
          id: { not: params.id },
        },
        select: { hours: true },
      });

      const totalExisting = existingTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
      if (totalExisting + hours > 12) {
        return NextResponse.json(
          {
            error: `Limite de 12h par jour dépassée. Heures déjà saisies (hors ce pointage): ${totalExisting}h. Disponible: ${12 - totalExisting}h`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: {
        ...(hours !== undefined && { hours }),
        ...(comment !== undefined && { comment }),
        ...(chantierId !== undefined && { chantierId }),
        status: "DRAFT", // Reset to DRAFT on edit
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

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du pointage" },
      { status: 500 }
    );
  }
}
