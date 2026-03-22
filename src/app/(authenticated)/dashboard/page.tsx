"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, startOfISOWeek, endOfISOWeek, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Clock,
  Building2,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Chantier {
  id: string;
  name: string;
  status: string;
  color: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: string;
  comment: string | null;
  user: { id: string; name: string; email: string };
  chantier: Chantier;
}

interface Affectation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  user: UserRecord;
  chantier: Chantier;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentISOWeek() {
  const now = new Date();
  const start = startOfISOWeek(now);
  const year = start.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const days = Math.floor(
    (start.getTime() - oneJan.getTime()) / 86400000
  );
  const weekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

const statusLabel: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SUBMITTED: "default",
  APPROVED: "outline",
  REJECTED: "destructive",
};

// ---------------------------------------------------------------------------
// Skeleton component
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ""}`}
    />
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };
  const borderMap: Record<string, string> = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    orange: "border-l-orange-500",
  };

  const inner = (
    <Card
      className={`border-l-4 ${borderMap[color] ?? "border-l-primary"} transition-shadow hover:shadow-md ${href ? "cursor-pointer" : ""}`}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colorMap[color] ?? ""}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";
  const userName = session?.user?.name ?? "";

  // Data state
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ------ Fetch data ------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const week = currentISOWeek();

      const promises: Promise<Response>[] = [
        fetch("/api/chantiers"),
        fetch("/api/timesheets"),
        fetch(`/api/planning?week=${week}`),
      ];

      if (isAdmin) {
        promises.push(fetch("/api/users"));
      }

      const responses = await Promise.all(promises);
      const [chantiersRes, timesheetsRes, planningRes, usersRes] = responses;

      const chantiersData = await chantiersRes.json();
      const timesheetsData = await timesheetsRes.json();
      const planningData = await planningRes.json();

      setChantiers(Array.isArray(chantiersData) ? chantiersData : []);
      setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
      setAffectations(Array.isArray(planningData) ? planningData : []);

      if (usersRes) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus, fetchData]);

  // ------ Computed KPIs ------
  const now = new Date();
  const weekStart = startOfISOWeek(now);
  const weekEnd = endOfISOWeek(now);

  const weekTimesheets = timesheets.filter((ts) => {
    const d = new Date(ts.date);
    return d >= weekStart && d <= weekEnd;
  });

  const totalHoursWeek = weekTimesheets.reduce((s, t) => s + t.hours, 0);
  const activeChantiers = chantiers.filter(
    (c) => c.status === "EN_COURS"
  ).length;
  const workerCount = users.filter((u) => u.role === "WORKER").length;
  const pendingTimesheets = timesheets.filter(
    (ts) => ts.status === "SUBMITTED"
  );
  const draftTimesheets = timesheets.filter((ts) => ts.status === "DRAFT");
  const weekChantierIds = new Set(
    weekTimesheets.map((ts) => ts.chantier.id)
  );

  // Today's affectations
  const todayAffectations = affectations.filter((a) =>
    isToday(new Date(a.date))
  );

  // Group today's affectations by worker (admin view)
  const affectationsByWorker = todayAffectations.reduce<
    Record<string, Affectation[]>
  >((acc, a) => {
    const key = a.user.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // ------ Actions (approve / reject) ------
  async function handleTimesheetAction(
    id: string,
    action: "APPROVED" | "REJECTED"
  ) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }

      toast.success(
        action === "APPROVED"
          ? "Feuille approuvée"
          : "Feuille rejetée"
      );

      // Refresh data
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'action"
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ------ Loading state ------
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // ======================================================================
  // ADMIN Dashboard
  // ======================================================================
  if (isAdmin) {
    return (
      <div className="space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {userName}
          </h1>
          <p className="text-muted-foreground">
            {format(now, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Heures cette semaine"
            value={`${totalHoursWeek.toFixed(1)}h`}
            icon={Clock}
            color="blue"
          />
          <KpiCard
            label="Chantiers actifs"
            value={activeChantiers}
            icon={Building2}
            color="green"
          />
          <KpiCard
            label="Salariés"
            value={workerCount}
            icon={Users}
            color="purple"
          />
          <KpiCard
            label="Feuilles en attente"
            value={pendingTimesheets.length}
            icon={FileText}
            color="orange"
            href="/timesheets?status=SUBMITTED"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Planning de la semaine */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Planning du jour
              </CardTitle>
              <Link href="/planning">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Voir le planning complet
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {Object.keys(affectationsByWorker).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune affectation aujourd&apos;hui
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(affectationsByWorker).map(
                    ([, workerAffectations]) => {
                      const worker = workerAffectations[0].user;
                      return (
                        <div key={worker.id} className="space-y-1">
                          <p className="text-sm font-medium">{worker.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {workerAffectations.map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white"
                                style={{
                                  backgroundColor:
                                    a.chantier.color || "#3B82F6",
                                }}
                              >
                                <span className="inline-block h-2 w-2 rounded-full bg-white/40" />
                                {a.chantier.name}
                                <span className="opacity-75">
                                  {a.startTime}-{a.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dernières feuilles soumises */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Dernières feuilles soumises
              </CardTitle>
              <Link href="/timesheets">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Voir toutes les feuilles
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {pendingTimesheets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune feuille en attente
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salarié</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Chantier</TableHead>
                      <TableHead className="text-right">Heures</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTimesheets.slice(0, 5).map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium">
                          {ts.user.name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ts.date), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  ts.chantier.color || "#3B82F6",
                              }}
                            />
                            {ts.chantier.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {ts.hours}h
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                              disabled={actionLoading === ts.id}
                              onClick={() =>
                                handleTimesheetAction(ts.id, "APPROVED")
                              }
                            >
                              {actionLoading === ts.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={actionLoading === ts.id}
                              onClick={() =>
                                handleTimesheetAction(ts.id, "REJECTED")
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ======================================================================
  // WORKER Dashboard
  // ======================================================================
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {userName}
        </h1>
        <p className="text-muted-foreground">
          {format(now, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          label="Mes heures cette semaine"
          value={`${totalHoursWeek.toFixed(1)}h`}
          icon={Clock}
          color="blue"
        />
        <KpiCard
          label="Chantiers cette semaine"
          value={weekChantierIds.size}
          icon={Building2}
          color="green"
        />
        <KpiCard
          label="Feuilles en brouillon"
          value={draftTimesheets.length}
          icon={FileText}
          color="orange"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mon planning aujourd'hui */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              Mon planning aujourd&apos;hui
            </CardTitle>
            <Link href="/my-planning">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Voir mon planning
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayAffectations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune affectation aujourd&apos;hui
              </p>
            ) : (
              <div className="space-y-2">
                {todayAffectations.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className="h-10 w-1.5 rounded-full"
                      style={{
                        backgroundColor: a.chantier.color || "#3B82F6",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {a.chantier.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.startTime} - {a.endTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mes dernières saisies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              Mes dernières saisies
            </CardTitle>
            <Link href="/my-timesheets">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Saisir mes heures
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {timesheets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune saisie récente
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Chantier</TableHead>
                    <TableHead className="text-right">Heures</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets.slice(0, 5).map((ts) => (
                    <TableRow key={ts.id}>
                      <TableCell>
                        {format(new Date(ts.date), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                ts.chantier.color || "#3B82F6",
                            }}
                          />
                          {ts.chantier.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ts.hours}h
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariant[ts.status] ?? "secondary"}>
                          {statusLabel[ts.status] ?? ts.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
