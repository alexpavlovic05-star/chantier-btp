import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden, notFound } from "@/lib/api-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const existing = await prisma.affectation.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Affectation non trouvée");

    const body = await request.json();
    const { startTime, endTime } = body;

    const affectation = await prisma.affectation.update({
      where: { id: params.id },
      data: {
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      },
      include: {
        user: true,
        chantier: true,
      },
    });

    return NextResponse.json(affectation);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'affectation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const existing = await prisma.affectation.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Affectation non trouvée");

    await prisma.affectation.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Affectation supprimée avec succès" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'affectation" },
      { status: 500 }
    );
  }
}
