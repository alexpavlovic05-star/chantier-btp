import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, notFound } from "@/lib/api-auth";

export async function PATCH(
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
        { error: "Vous ne pouvez soumettre que vos propres pointages" },
        { status: 403 }
      );
    }

    if (timesheet.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Seuls les pointages en brouillon peuvent être soumis" },
        { status: 400 }
      );
    }

    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
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
      { error: "Erreur lors de la soumission du pointage" },
      { status: 500 }
    );
  }
}
