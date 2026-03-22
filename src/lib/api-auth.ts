import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getSessionOrFail(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
}

export function notFound(resource = "Ressource") {
  return NextResponse.json({ error: `${resource} non trouvé(e)` }, { status: 404 });
}
