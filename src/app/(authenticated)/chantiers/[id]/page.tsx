"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock,
  Pencil,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface Affectation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  comment: string | null;
  status: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionNote: string | null;
}

interface ChantierDetail {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  affectations: Affectation[];
  timesheets: Timesheet[];
}

const STATUS_OPTIONS = [
  { value: "EN_COURS", label: "En cours" },
  { value: "TERMINE", label: "Termin\u00e9" },
  { value: "EN_PAUSE", label: "En pause" },
];

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

const TIMESHEET_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  SUBMITTED: {
    label: "Soumis",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  APPROVED: {
    label: "Approuv\u00e9",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  REJECTED: {
    label: "Rejet\u00e9",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />
  );
}

export default function ChantierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [chantier, setChantier] = useState<ChantierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");

  async function fetchChantier() {
    try {
      const res = await fetch(`/api/chantiers/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChantier(data);
    } catch {
      toast.error("Erreur lors du chargement du chantier");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChantier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openEditDialog() {
    if (!chantier) return;
    setFormName(chantier.name);
    setFormAddress(chantier.address ?? "");
    setFormDescription(chantier.description ?? "");
    setFormStartDate(
      chantier.startDate ? chantier.startDate.substring(0, 10) : ""
    );
    setFormEndDate(
      chantier.endDate ? chantier.endDate.substring(0, 10) : ""
    );
    setFormColor(chantier.color);
    setEditOpen(true);
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/chantiers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setChantier((prev) => (prev ? { ...prev, status: updated.status } : prev));
      toast.success("Statut mis \u00e0 jour");
    } catch {
      toast.error("Erreur lors de la mise \u00e0 jour du statut");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Le nom du chantier est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chantiers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress || null,
          description: formDescription || null,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          color: formColor,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Chantier mis \u00e0 jour avec succ\u00e8s");
      setEditOpen(false);
      fetchChantier();
    } catch {
      toast.error("Erreur lors de la mise \u00e0 jour du chantier");
    } finally {
      setSubmitting(false);
    }
  }

  // Derive workers from affectations grouped by user
  const workersMap = new Map<
    string,
    { user: Affectation["user"]; affectationCount: number }
  >();
  if (chantier) {
    for (const aff of chantier.affectations) {
      const existing = workersMap.get(aff.userId);
      if (existing) {
        existing.affectationCount += 1;
      } else {
        workersMap.set(aff.userId, { user: aff.user, affectationCount: 1 });
      }
    }
  }
  const workers = Array.from(workersMap.values());

  const totalHours =
    chantier?.timesheets.reduce((sum, ts) => sum + ts.hours, 0) ?? 0;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-8 w-8" />
          <SkeletonBlock className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="space-y-4 py-6">
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-4 w-1/3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-6">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="space-y-4">
        <Link href="/chantiers">
          <Button variant="ghost">
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Retour aux chantiers
          </Button>
        </Link>
        <p className="text-muted-foreground">Chantier introuvable.</p>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[chantier.status] ?? {
    label: chantier.status,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/chantiers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-4 shrink-0 rounded-full"
              style={{ backgroundColor: chantier.color }}
            />
            <h1 className="text-2xl font-bold tracking-tight">
              {chantier.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={chantier.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={openEditDialog}>
            <Pencil className="size-4" data-icon="inline-start" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>D\u00e9tails du chantier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {chantier.description && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 text-sm">{chantier.description}</p>
              </div>
            )}
            {chantier.address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Adresse
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  {chantier.address}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Statut
              </p>
              <div className="mt-1">
                <Badge className={statusConf.className}>
                  {statusConf.label}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                P\u00e9riode
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                {formatDate(chantier.startDate)} &mdash;{" "}
                {formatDate(chantier.endDate)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Heures totales
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                {totalHours}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Ouvriers affect\u00e9s
          </CardTitle>
          <CardDescription>
            {workers.length} ouvrier{workers.length !== 1 ? "s" : ""} sur ce
            chantier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun ouvrier affect\u00e9 pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>R\u00f4le</TableHead>
                  <TableHead className="text-right">Affectations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map(({ user, affectationCount }) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.role === "ADMIN" ? "Admin" : "Ouvrier"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {affectationCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent timesheets section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Feuilles de temps r\u00e9centes
          </CardTitle>
          <CardDescription>
            {chantier.timesheets.length} feuille
            {chantier.timesheets.length !== 1 ? "s" : ""} de temps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chantier.timesheets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune feuille de temps pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heures</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chantier.timesheets
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .slice(0, 20)
                  .map((ts) => {
                    const tsStatus = TIMESHEET_STATUS_CONFIG[ts.status] ?? {
                      label: ts.status,
                      className: "bg-gray-100 text-gray-800",
                    };
                    return (
                      <TableRow key={ts.id}>
                        <TableCell>{formatDate(ts.date)}</TableCell>
                        <TableCell>{ts.hours}h</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {ts.comment || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge className={tsStatus.className}>
                            {tsStatus.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier le chantier</DialogTitle>
              <DialogDescription>
                Modifiez les informations du chantier.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nom *</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom du chantier"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Adresse du chantier"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description du chantier"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate">Date de d\u00e9but</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-endDate">Date de fin</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-color">Couleur</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-color"
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
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
