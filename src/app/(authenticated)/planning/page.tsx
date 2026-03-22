"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  parseISO,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Chantier {
  id: string;
  name: string;
  color: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
}

interface Affectation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userId: string;
  chantierId: string;
  chantier: Chantier;
  user: User;
}

interface AffectationFormData {
  chantierId: string;
  startTime: string;
  endTime: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekString(monday: Date): string {
  const year = getISOWeekYear(monday);
  const week = getISOWeek(monday);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6h à 20h

const TIME_OPTIONS: string[] = [];
for (let h = 5; h <= 22; h++) {
  for (const m of ["00", "30"]) {
    if (h === 22 && m === "30") continue;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${m}`);
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function contrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanningPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(() =>
    startOfISOWeek(new Date())
  );
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffectation, setEditingAffectation] =
    useState<Affectation | null>(null);
  const [dialogUserId, setDialogUserId] = useState<string>("");
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<AffectationFormData>({
    chantierId: "",
    startTime: "08:00",
    endTime: "17:00",
  });
  const [submitting, setSubmitting] = useState(false);

  // View mode
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const weekString = useMemo(() => getWeekString(currentWeek), [currentWeek]);
  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  const workers = useMemo(
    () =>
      users
        .filter((u) => u.role === "WORKER")
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [users]
  );

  const activeChantiers = useMemo(
    () => chantiers.filter((c) => c.status === "EN_COURS"),
    [chantiers]
  );

  // ---- Week label ----------------------------------------------------------

  const weekLabel = useMemo(() => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const range = `${format(firstDay, "d", { locale: fr })} - ${format(lastDay, "d MMMM yyyy", { locale: fr })}`;
    const weekNum = getISOWeek(firstDay);
    return { range, weekNum };
  }, [weekDays]);

  // ---- Data fetching -------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [affRes, usersRes, chantiersRes] = await Promise.all([
        fetch(`/api/planning?week=${weekString}`),
        fetch("/api/users"),
        fetch("/api/chantiers"),
      ]);

      if (!affRes.ok) throw new Error("Erreur chargement planning");
      if (!usersRes.ok) throw new Error("Erreur chargement utilisateurs");
      if (!chantiersRes.ok) throw new Error("Erreur chargement chantiers");

      const [affData, usersData, chantiersData] = await Promise.all([
        affRes.json(),
        usersRes.json(),
        chantiersRes.json(),
      ]);

      setAffectations(affData);
      setUsers(usersData);
      setChantiers(chantiersData);
    } catch (err) {
      toast.error("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [weekString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Week navigation -----------------------------------------------------

  const goToPreviousWeek = () =>
    setCurrentWeek((prev) => addDays(prev, -7));
  const goToNextWeek = () =>
    setCurrentWeek((prev) => addDays(prev, 7));
  const goToToday = () => setCurrentWeek(startOfISOWeek(new Date()));

  // ---- Affectation lookup --------------------------------------------------

  const getAffectationsForCell = useCallback(
    (userId: string, day: Date) =>
      affectations.filter(
        (a) => a.userId === userId && isSameDay(parseISO(a.date), day)
      ),
    [affectations]
  );

  // ---- Dialog handlers -----------------------------------------------------

  function openAddDialog(userId: string, day: Date) {
    setEditingAffectation(null);
    setDialogUserId(userId);
    setDialogDate(day);
    setFormData({
      chantierId: activeChantiers[0]?.id ?? "",
      startTime: "08:00",
      endTime: "17:00",
    });
    setDialogOpen(true);
  }

  function openEditDialog(aff: Affectation) {
    setEditingAffectation(aff);
    setDialogUserId(aff.userId);
    setDialogDate(parseISO(aff.date));
    setFormData({
      chantierId: aff.chantierId,
      startTime: aff.startTime,
      endTime: aff.endTime,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!formData.chantierId) {
      toast.error("Veuillez sélectionner un chantier");
      return;
    }
    if (formData.startTime >= formData.endTime) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    setSubmitting(true);
    try {
      if (editingAffectation) {
        const res = await fetch(`/api/planning/${editingAffectation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chantierId: formData.chantierId,
            startTime: formData.startTime,
            endTime: formData.endTime,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de la modification");
        }
        toast.success("Affectation modifiée");
      } else {
        const res = await fetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: dialogUserId,
            date: dialogDate!.toISOString(),
            chantierId: formData.chantierId,
            startTime: formData.startTime,
            endTime: formData.endTime,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de la création");
        }
        toast.success("Affectation ajoutée");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingAffectation) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/planning/${editingAffectation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Affectation supprimée");
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Vue semaine (Alobees style) -----------------------------------------

  function renderWeekOverview() {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-r border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 min-w-[160px]">
                Salarié
              </th>
              {weekDays.slice(0, 5).map((day) => {
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <th
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`border-b border-r border-border px-2 py-2 text-center text-xs font-semibold min-w-[140px] cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="capitalize">
                      {format(day, "EEEE", { locale: fr })}
                    </div>
                    <div className={`text-[11px] font-normal mt-0.5 ${isSelected ? "text-primary-foreground/80" : ""}`}>
                      {format(day, "d MMMM", { locale: fr })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  Aucun ouvrier trouvé. Créez des salariés dans l&apos;onglet Équipe.
                </td>
              </tr>
            )}
            {workers.map((worker) => (
              <tr key={worker.id} className="group/row hover:bg-muted/30">
                <td className="sticky left-0 z-10 bg-background group-hover/row:bg-muted/30 border-b border-r border-border px-3 py-2 font-medium text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {worker.name.charAt(0).toUpperCase()}
                    </div>
                    {worker.name}
                  </div>
                </td>
                {weekDays.slice(0, 5).map((day) => {
                  const cellAffs = getAffectationsForCell(worker.id, day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <td
                      key={day.toISOString()}
                      className={`border-b border-r border-border px-1.5 py-1.5 align-top ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="space-y-1 min-h-[52px]">
                        {cellAffs.map((aff) => {
                          const bgColor = aff.chantier?.color ?? "#3B82F6";
                          const textColor = contrastColor(bgColor);
                          return (
                            <button
                              key={aff.id}
                              onClick={() => openEditDialog(aff)}
                              className="w-full rounded-md px-2 py-1.5 text-left shadow-sm hover:shadow-md cursor-pointer text-xs leading-tight transition-shadow"
                              style={{ backgroundColor: bgColor, color: textColor }}
                            >
                              <div className="font-bold">
                                {aff.startTime} - {aff.endTime}
                              </div>
                              <div className="truncate opacity-90">
                                {aff.chantier?.name}
                              </div>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => openAddDialog(worker.id, day)}
                          className="flex items-center justify-center w-full rounded-md border border-dashed border-muted-foreground/25 py-1 text-muted-foreground/50 hover:border-primary/50 hover:text-primary/70 hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Vue journée détaillée (timeline heure par heure) --------------------

  function renderDayTimeline() {
    if (!selectedDay) return null;

    const dayAffs = affectations.filter((a) =>
      isSameDay(parseISO(a.date), selectedDay)
    );

    // Grouper par worker
    const workerAffs = workers.map((worker) => ({
      worker,
      affs: dayAffs
        .filter((a) => a.userId === worker.id)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    }));

    const startHour = 6; // 6h
    const endHour = 20; // 20h
    const totalMinutes = (endHour - startHour) * 60;

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold capitalize">
            {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)}>
            Retour à la semaine
          </Button>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <div className="min-w-[800px]">
            {/* En-tête horaire */}
            <div className="flex border-b border-border">
              <div className="w-40 min-w-[160px] shrink-0 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border">
                Salarié
              </div>
              <div className="flex-1 relative">
                <div className="flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 text-center text-[11px] text-muted-foreground font-medium py-2 border-r border-border last:border-r-0"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lignes par salarié */}
            {workerAffs.map(({ worker, affs }) => (
              <div
                key={worker.id}
                className="flex border-b border-border last:border-b-0 hover:bg-muted/20"
              >
                <div className="w-40 min-w-[160px] shrink-0 px-3 py-3 border-r border-border flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {worker.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">{worker.name}</span>
                </div>
                <div className="flex-1 relative" style={{ minHeight: "52px" }}>
                  {/* Lignes verticales pour chaque heure */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 border-r border-border/50 last:border-r-0"
                      />
                    ))}
                  </div>

                  {/* Blocs d'affectation positionnés */}
                  <div className="absolute inset-0 py-1.5 px-0.5">
                    {affs.map((aff) => {
                      const startMin = timeToMinutes(aff.startTime) - startHour * 60;
                      const endMin = timeToMinutes(aff.endTime) - startHour * 60;
                      const left = Math.max(0, (startMin / totalMinutes) * 100);
                      const width = Math.min(100 - left, ((endMin - startMin) / totalMinutes) * 100);
                      const bgColor = aff.chantier?.color ?? "#3B82F6";
                      const textColor = contrastColor(bgColor);

                      return (
                        <button
                          key={aff.id}
                          onClick={() => openEditDialog(aff)}
                          className="absolute top-1.5 bottom-1.5 rounded-md px-2 flex flex-col justify-center shadow-sm hover:shadow-md cursor-pointer transition-shadow overflow-hidden"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: bgColor,
                            color: textColor,
                          }}
                        >
                          <div className="text-[11px] font-bold whitespace-nowrap">
                            {aff.startTime} - {aff.endTime}
                          </div>
                          <div className="text-[11px] truncate opacity-90">
                            {aff.chantier?.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Zone cliquable pour ajouter */}
                  {affs.length === 0 && (
                    <button
                      onClick={() => openAddDialog(worker.id, selectedDay)}
                      className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 hover:text-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <Plus className="size-4" />
                      <span className="text-xs ml-1">Ajouter</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {workerAffs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Aucun ouvrier trouvé
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Mobile view ---------------------------------------------------------

  function renderMobileView() {
    return (
      <div className="md:hidden space-y-4">
        {workers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Aucun ouvrier trouvé
          </div>
        )}
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border font-semibold text-sm flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {worker.name.charAt(0).toUpperCase()}
              </div>
              {worker.name}
            </div>
            <div className="divide-y divide-border">
              {weekDays.slice(0, 5).map((day) => {
                const cellAffs = getAffectationsForCell(worker.id, day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`px-4 py-2.5 ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-medium capitalize ${
                          isToday
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "EEEE d MMM", { locale: fr })}
                      </span>
                      <button
                        onClick={() => openAddDialog(worker.id, day)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    {cellAffs.length === 0 ? (
                      <div className="text-xs text-muted-foreground/50 italic">
                        Pas d&apos;affectation
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {cellAffs.map((aff) => {
                          const bgColor = aff.chantier?.color ?? "#3B82F6";
                          const textColor = contrastColor(bgColor);
                          return (
                            <button
                              key={aff.id}
                              onClick={() => openEditDialog(aff)}
                              className="w-full rounded-md px-2 py-1.5 text-left shadow-sm text-xs leading-tight cursor-pointer"
                              style={{ backgroundColor: bgColor, color: textColor }}
                            >
                              <div className="font-bold">
                                {aff.startTime} - {aff.endTime}
                              </div>
                              <div className="truncate opacity-90">
                                {aff.chantier?.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- Main render ---------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {weekLabel.range} &middot; Semaine {weekLabel.weekNum}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousWeek}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextWeek}
            aria-label="Semaine suivante"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Instruction */}
      {!selectedDay && !loading && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          💡 Cliquez sur un jour de la semaine pour voir le détail heure par heure de chaque salarié.
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            {renderWeekOverview()}
            {renderDayTimeline()}
          </div>
          {/* Mobile */}
          {renderMobileView()}
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAffectation
                ? "Modifier l'affectation"
                : "Nouvelle affectation"}
            </DialogTitle>
          </DialogHeader>

          {dialogDate && (
            <p className="text-xs text-muted-foreground -mt-2">
              {users.find((u) => u.id === dialogUserId)?.name} &middot;{" "}
              <span className="capitalize">
                {format(dialogDate, "EEEE d MMMM yyyy", { locale: fr })}
              </span>
            </p>
          )}

          <div className="grid gap-4 py-2">
            {/* Chantier selector */}
            <div className="grid gap-1.5">
              <Label htmlFor="chantier-select">Chantier</Label>
              <select
                id="chantier-select"
                value={formData.chantierId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    chantierId: e.target.value,
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Choisir un chantier --</option>
                {activeChantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="start-time">Heure de début</Label>
                <select
                  id="start-time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="end-time">Heure de fin</Label>
                <select
                  id="end-time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            {editingAffectation && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={submitting}
                className="mr-auto"
              >
                <Trash2 className="size-3.5 mr-1" />
                Supprimer
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              {editingAffectation ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
