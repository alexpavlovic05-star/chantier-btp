import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden } from "@/lib/api-auth";

export async function GET() {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const chantiers = await prisma.chantier.findMany({
      include: {
        _count: {
          select: { affectations: true },
        },
        timesheets: {
          select: { hours: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = chantiers.map((chantier) => {
      const totalHours = chantier.timesheets.reduce(
        (sum, ts) => sum + ts.hours,
        0
      );
      const { timesheets, ...rest } = chantier;
      return { ...rest, totalHours };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des chantiers" },
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
    const { name, address, description, startDate, endDate, color } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Le nom du chantier est requis" },
        { status: 400 }
      );
    }

    const chantier = await prisma.chantier.create({
      data: {
        name: name.trim(),
        address: address || null,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        color: color || null,
      },
    });

    return NextResponse.json(chantier, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la création du chantier" },
      { status: 500 }
    );
  }
}
