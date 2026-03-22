import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrFail, forbidden, notFound } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrFail();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "ADMIN") return forbidden();

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return notFound("Utilisateur non trouvé");

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
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
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Utilisateur non trouvé");

    const body = await request.json();
    const { email, name, password, role } = body;

    if (role && !["ADMIN", "WORKER"].includes(role)) {
      return NextResponse.json(
        { error: "Le rôle doit être ADMIN ou WORKER" },
        { status: 400 }
      );
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
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

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });
    if (!existing) return notFound("Utilisateur non trouvé");

    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}
