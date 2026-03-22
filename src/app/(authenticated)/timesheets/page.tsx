"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
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

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  comment: string | null;
  rejectionNote: string | null;
  user: { id: string; name: string; email: string };
  chantier: { id: string; name: string };
}

const STATUS_CONFIG = {
  DRAFT: { label: "Brouillon", variant: "secondary" as const },
  SUBMITTED: { label: "Soumis", variant: "outline" as const },
  APPROVED: { label: "Validé", variant: "default" as const },
  REJECTED: { label: "Rejeté", variant: "destructive" as const },
};

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [editingHours, setEditingHours] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const fetchTimesheets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/timesheets?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTimesheets(data);
    } catch {
      toast.error("Erreur lors du chargement des pointages");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchTimesheets();
  }, [fetchTimesheets]);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/timesheets/${id}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Pointage validé");
      fetchTimesheets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la validation"
      );
    }
  }

  function openRejectDialog(id: string) {
    setRejectingId(id);
    setRejectionNote("");
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!rejectingId || !rejectionNote.trim()) {
      toast.error("Veuillez saisir un motif de rejet");
      return;
    }

    try {
      const res = await fetch(`/api/timesheets/${rejectingId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote: rejectionNote.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Pointage rejeté");
      setRejectDialogOpen(false);
      fetchTimesheets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors du rejet"
      );
    }
  }

  function startEditHours(ts: Timesheet) {
    if (!["DRAFT", "REJECTED"].includes(ts.status)) return;
    setEditingHours({ id: ts.id, value: String(ts.hours) });
  }

  async function saveEditHours() {
    if (!editingHours) return;
    const hours = parseFloat(editingHours.value);
    if (isNaN(hours) || hours <= 0 || hours > 12) {
      toast.error("Les heures doivent être comprises entre 0 et 12");
      return;
    }

    try {
      const res = await fetch(`/api/timesheets/${editingHours.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Heures mises à jour");
      setEditingHours(null);
      fetchTimesheets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pointages</h1>
        <p className="text-muted-foreground">
          Gestion et validation des pointages des salariés
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Label>Statut :</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="SUBMITTED">Soumis</SelectItem>
            <SelectItem value="APPROVED">Validé</SelectItem>
            <SelectItem value="REJECTED">Rejeté</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>Salarié</TableHead>
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
                    colSpan={6}
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
                    <TableCell>{ts.user.name}</TableCell>
                    <TableCell>{ts.chantier.name}</TableCell>
                    <TableCell>
                      {editingHours?.id === ts.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="12"
                            value={editingHours.value}
                            onChange={(e) =>
                              setEditingHours({
                                ...editingHours,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditHours();
                              if (e.key === "Escape") setEditingHours(null);
                            }}
                            className="h-7 w-20"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveEditHours}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingHours(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={
                            ["DRAFT", "REJECTED"].includes(ts.status)
                              ? "cursor-pointer underline decoration-dashed underline-offset-4 hover:text-primary"
                              : ""
                          }
                          onClick={() => startEditHours(ts)}
                        >
                          {ts.hours}h
                        </span>
                      )}
                    </TableCell>
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
                      {ts.status === "SUBMITTED" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(ts.id)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(ts.id)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le pointage</DialogTitle>
            <DialogDescription>
              Indiquez le motif du rejet. Le salarié pourra corriger et
              resoumettre.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="rejectionNote">Motif du rejet</Label>
            <Textarea
              id="rejectionNote"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Expliquez le motif du rejet..."
              rows={3}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionNote.trim()}
            >
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
