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
  Pencil,
  Trash2,
  Loader2,
  X,
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
import { Input } from "@/components/ui/input";
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

const TIME_OPTIONS: string[] = [];
for (let h = 5; h <= 22; h++) {
  for (const m of ["00", "30"]) {
    if (h === 22 && m === "30") continue;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${m}`);
  }
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
      toast.error("Erreur lors du chargement des donnees");
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
      toast.error("Veuillez selectionner un chantier");
      return;
    }
    if (formData.startTime >= formData.endTime) {
      toast.error("L'heure de fin doit etre apres l'heure de debut");
      return;
    }

    setSubmitting(true);
    try {
      if (editingAffectation) {
        // Update
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
        toast.success("Affectation modifiee");
      } else {
        // Create
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
          throw new Error(err.error || "Erreur lors de la creation");
        }
        toast.success("Affectation ajoutee");
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
      toast.success("Affectation supprimee");
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render helpers ------------------------------------------------------

  function renderAffectationBlock(aff: Affectation) {
    const bgColor = aff.chantier?.color ?? "#3B82F6";
    const textColor = contrastColor(bgColor);
    return (
      <button
        key={aff.id}
        onClick={() => openEditDialog(aff)}
        className="group relative w-full rounded-md px-2 py-1.5 text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer text-xs leading-tight mb-1 last:mb-0"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="font-semibold truncate">
          {aff.startTime} - {aff.endTime}
        </div>
        <div className="truncate opacity-90">{aff.chantier?.name}</div>
        <span
          className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center justify-center rounded-full size-4"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <Pencil className="size-2.5" style={{ color: textColor }} />
        </span>
      </button>
    );
  }

  // ---- Desktop grid --------------------------------------------------------

  function renderDesktopGrid() {
    return (
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-r border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 min-w-[160px]">
                Ouvrier
              </th>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <th
                    key={day.toISOString()}
                    className={`border-b border-r border-border px-2 py-2 text-center text-xs font-semibold min-w-[130px] ${
                      isToday
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="capitalize">
                      {format(day, "EEEE", { locale: fr })}
                    </div>
                    <div className="text-[11px] font-normal mt-0.5">
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
                <td
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground text-sm"
                >
                  Aucun ouvrier trouve
                </td>
              </tr>
            )}
            {workers.map((worker) => (
              <tr key={worker.id} className="group/row hover:bg-muted/30">
                <td className="sticky left-0 z-10 bg-background group-hover/row:bg-muted/30 border-b border-r border-border px-3 py-2 font-medium text-sm whitespace-nowrap">
                  {worker.name}
                </td>
                {weekDays.map((day) => {
                  const cellAffs = getAffectationsForCell(worker.id, day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <td
                      key={day.toISOString()}
                      className={`border-b border-r border-border px-1.5 py-1.5 align-top min-h-[60px] ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="space-y-1 min-h-[48px]">
                        {cellAffs.map(renderAffectationBlock)}
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

  // ---- Mobile view ---------------------------------------------------------

  function renderMobileView() {
    return (
      <div className="md:hidden space-y-4">
        {workers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Aucun ouvrier trouve
          </div>
        )}
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border font-semibold text-sm">
              {worker.name}
            </div>
            <div className="divide-y divide-border">
              {weekDays.map((day) => {
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
                        Aucune affectation
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {cellAffs.map(renderAffectationBlock)}
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
            aria-label="Semaine precedente"
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {renderDesktopGrid()}
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
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                <Label htmlFor="start-time">Heure de debut</Label>
                <select
                  id="start-time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                <Trash2 className="size-3.5" />
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
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {editingAffectation ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
