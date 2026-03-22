"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MapPin,
  Plus,
  Trash2,
  Clock,
  Users,
  CalendarDays,
  HardHat,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Chantier {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  color: string;
  createdAt: string;
  totalHours: number;
  _count: { affectations: number };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  EN_COURS: {
    label: "En cours",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  TERMINE: {
    label: "Termin\u00e9",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  EN_PAUSE: {
    label: "En pause",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter>
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");

  async function fetchChantiers() {
    try {
      const res = await fetch("/api/chantiers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChantiers(data);
    } catch {
      toast.error("Erreur lors du chargement des chantiers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChantiers();
  }, []);

  function resetForm() {
    setFormName("");
    setFormAddress("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
    setFormColor("#3B82F6");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Le nom du chantier est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/chantiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress || undefined,
          description: formDescription || undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          color: formColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Chantier cr\u00e9\u00e9 avec succ\u00e8s");
      setCreateOpen(false);
      resetForm();
      fetchChantiers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la cr\u00e9ation du chantier");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chantiers/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Chantier supprim\u00e9 avec succ\u00e8s");
      setDeleteId(null);
      fetchChantiers();
    } catch {
      toast.error("Erreur lors de la suppression du chantier");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chantiers</h1>
          <p className="text-sm text-muted-foreground">
            G\u00e9rez vos chantiers et suivez leur avancement
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" data-icon="inline-start" />
              Nouveau chantier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nouveau chantier</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour cr\u00e9er un nouveau chantier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nom du chantier"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Adresse du chantier"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Description du chantier"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Date de d\u00e9but</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Couleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="color"
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-input p-1"
                    />
                    <span className="text-sm text-muted-foreground">
                      {formColor}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Cr\u00e9ation..." : "Cr\u00e9er"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && chantiers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <HardHat className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucun chantier</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Commencez par cr\u00e9er votre premier chantier.
          </p>
          <Button
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Nouveau chantier
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!loading && chantiers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chantiers.map((chantier) => {
            const statusConf = STATUS_CONFIG[chantier.status] ?? {
              label: chantier.status,
              className: "bg-gray-100 text-gray-800",
            };
            return (
              <Card key={chantier.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: chantier.color }}
                    />
                    <CardTitle className="truncate">
                      {chantier.name}
                    </CardTitle>
                  </div>
                  <Badge className={statusConf.className}>
                    {statusConf.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {chantier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0" />
                      <span className="truncate">{chantier.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" />
                    <span>
                      {formatDate(chantier.startDate)} &mdash;{" "}
                      {formatDate(chantier.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-4 shrink-0" />
                      <span>
                        {chantier._count.affectations} affectation
                        {chantier._count.affectations !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-4 shrink-0" />
                      <span>{chantier.totalHours}h</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Link href={`/chantiers/${chantier.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Eye className="size-4" data-icon="inline-start" />
                      Voir d\u00e9tail
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteId(chantier.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              \u00cates-vous s\u00fbr de vouloir supprimer ce chantier ? Cette action est
              irr\u00e9versible et supprimera toutes les donn\u00e9es associ\u00e9es.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
