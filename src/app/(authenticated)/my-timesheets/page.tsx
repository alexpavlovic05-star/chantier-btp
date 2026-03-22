"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Send, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  comment: string | null;
  rejectionNote: string | null;
  chantier: { id: string; name: string };
}

interface Affectation {
  id: string;
  chantierId: string;
  chantier: { id: string; name: string };
  startTime: string;
  endTime: string;
}

const STATUS_CONFIG = {
  DRAFT: { label: "Brouillon", variant: "secondary" as const },
  SUBMITTED: { label: "Soumis", variant: "outline" as const },
  APPROVED: { label: "Validé", variant: "default" as const },
  REJECTED: { label: "Rejeté", variant: "destructive" as const },
};

export default function MyTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTs, setEditingTs] = useState<Timesheet | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loadingAffectations, setLoadingAffectations] = useState(false);
  const [formChantierId, setFormChantierId] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTimesheets = useCallback(async () => {
    try {
      const res = await fetch("/api/timesheets");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTimesheets(data);
    } catch {
      toast.error("Erreur lors du chargement des pointages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  async function fetchAffectationsForDate(date: Date) {
    setLoadingAffectations(true);
    setAffectations([]);
    setFormChantierId("");
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/planning?date=${dateStr}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAffectations(data);
      if (data.length === 0) {
        toast.info("Aucune affectation pour cette date");
      }
    } catch {
      toast.error("Erreur lors du chargement des affectations");
    } finally {
      setLoadingAffectations(false);
    }
  }

  function handleDateSelect(date: Date | undefined) {
    setFormDate(date);
    setCalendarOpen(false);
    if (date) {
      fetchAffectationsForDate(date);
    }
  }

  function openCreateDialog() {
    setEditingTs(null);
    setFormDate(undefined);
    setAffectations([]);
    setFormChantierId("");
    setFormHours("");
    setFormComment("");
    setDialogOpen(true);
  }

  function openEditDialog(ts: Timesheet) {
    setEditingTs(ts);
    const date = new Date(ts.date);
    setFormDate(date);
    setFormChantierId(ts.chantier.id);
    setFormHours(String(ts.hours));
    setFormComment(ts.comment || "");
    fetchAffectationsForDate(date);
    setDialogOpen(true);
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formDate || !formChantierId || !formHours) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours <= 0 || hours > 12) {
      toast.error("Les heures doivent être comprises entre 0 et 12");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTs) {
        const res = await fetch(`/api/timesheets/${editingTs.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hours,
            chantierId: formChantierId,
            comment: formComment || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur");
        }
        toast.success("Pointage modifié avec succès");
      } else {
        const res = await fetch("/api/timesheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: format(formDate, "yyyy-MM-dd"),
            hours,
            chantierId: formChantierId,
            comment: formComment || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur");
        }
        toast.success("Pointage créé avec succès");
      }

      setDialogOpen(false);
      fetchTimesheets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitTimesheet(id: string) {
    try {
      const res = await fetch(`/api/timesheets/${id}/submit`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Pointage soumis pour validation");
      fetchTimesheets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la soumission"
      );
    }
  }

  // Deduplicate chantiers from affectations
  const uniqueChantiers = affectations.reduce<
    { id: string; name: string }[]
  >((acc, aff) => {
    if (!acc.find((c) => c.id === aff.chantierId)) {
      acc.push({ id: aff.chantierId, name: aff.chantier.name });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes pointages</h1>
          <p className="text-muted-foreground">
            Saisie et suivi de vos heures de travail
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle saisie
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Chantier</TableHead>
                <TableHead>Heures</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Aucun pointage trouvé
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell>
                      {new Date(ts.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>{ts.chantier.name}</TableCell>
                    <TableCell>{ts.hours}h</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_CONFIG[ts.status].variant}>
                          {STATUS_CONFIG[ts.status].label}
                        </Badge>
                        {ts.status === "REJECTED" && ts.rejectionNote && (
                          <span className="text-xs text-destructive">
                            {ts.rejectionNote}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(ts.status === "DRAFT" ||
                          ts.status === "REJECTED") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(ts)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitTimesheet(ts.id)}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Soumettre
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>
                {editingTs ? "Modifier le pointage" : "Nouvelle saisie"}
              </DialogTitle>
              <DialogDescription>
                {editingTs
                  ? "Modifiez les informations du pointage"
                  : "Saisissez vos heures pour un chantier"}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      disabled={!!editingTs}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formDate
                        ? format(formDate, "dd MMMM yyyy", { locale: fr })
                        : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formDate}
                      onSelect={handleDateSelect}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {formDate && (
                <div className="space-y-2">
                  <Label>Chantier</Label>
                  {loadingAffectations ? (
                    <p className="text-sm text-muted-foreground">
                      Chargement des affectations...
                    </p>
                  ) : uniqueChantiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune affectation pour cette date
                    </p>
                  ) : (
                    <Select
                      value={formChantierId}
                      onValueChange={setFormChantierId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un chantier" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueChantiers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hours">Heures</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  placeholder="8"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire</Label>
                <Textarea
                  id="comment"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="Commentaire optionnel..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !formDate ||
                  !formChantierId ||
                  !formHours
                }
              >
                {submitting
                  ? "Enregistrement..."
                  : editingTs
                    ? "Modifier"
                    : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
