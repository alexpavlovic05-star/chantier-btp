import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden, notFound } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const body = await request.json();
    const { rejectionNote } = body;

    if (!rejectionNote || typeof rejectionNote !== "string" || rejectionNote.trim() === "") {
      return NextResponse.json(
        { error: "Le motif de rejet est requis" },
        { status: 400 }
      );
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
    });

    if (!timesheet) return notFound("Pointage non trouvé");

    if (timesheet.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Seuls les pointages soumis peuvent être rejetés" },
        { status: 400 }
      );
    }

    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        rejectionNote: rejectionNote.trim(),
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
      { error: "Erreur lors du rejet du pointage" },
      { status: 500 }
    );
  }
}
