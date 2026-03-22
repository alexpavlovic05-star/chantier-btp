import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden, notFound } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const chantier = await prisma.chantier.findUnique({
      where: { id: params.id },
      include: {
        affectations: {
          include: { user: true },
        },
        timesheets: true,
      },
    });

    if (!chantier) return notFound("Chantier non trouvé");

    return NextResponse.json(chantier);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération du chantier" },
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
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const existing = await prisma.chantier.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Chantier non trouvé");

    const body = await request.json();
    const { name, address, description, startDate, endDate, color } = body;

    const chantier = await prisma.chantier.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(chantier);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du chantier" },
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
    const existing = await prisma.chantier.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Chantier non trouvé");

    await prisma.chantier.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Chantier supprimé avec succès" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression du chantier" },
      { status: 500 }
    );
  }
}
