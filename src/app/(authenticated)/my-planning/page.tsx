"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  subWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Affectation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  chantier: { id: string; name: string; address: string | null };
}

// Color palette for chantier blocks
const COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-rose-100 border-rose-300 text-rose-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
  "bg-orange-100 border-orange-300 text-orange-800",
];

function getChantierColor(chantierId: string, colorMap: Map<string, string>) {
  if (!colorMap.has(chantierId)) {
    colorMap.set(chantierId, COLORS[colorMap.size % COLORS.length]);
  }
  return colorMap.get(chantierId)!;
}

export default function MyPlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfISOWeek(currentDate);
  const weekEnd = endOfISOWeek(currentDate);
  const weekNumber = getISOWeek(currentDate);
  const weekYear = getISOWeekYear(currentDate);

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (day) => !isWeekend(day)
  );

  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    try {
      const weekStr = `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
      const res = await fetch(`/api/planning?week=${weekStr}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAffectations(data);
    } catch {
      toast.error("Erreur lors du chargement du planning");
    } finally {
      setLoading(false);
    }
  }, [weekYear, weekNumber]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  function goToPreviousWeek() {
    setCurrentDate((d) => subWeeks(d, 1));
  }

  function goToNextWeek() {
    setCurrentDate((d) => addWeeks(d, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const colorMap = new Map<string, string>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon planning</h1>
        <p className="text-muted-foreground">
          Consultez vos affectations de la semaine
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={goToToday}>
          Aujourd&apos;hui
        </Button>
        <Button variant="outline" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Semaine {weekNumber} &mdash;{" "}
          {format(weekStart, "d MMM", { locale: fr })} au{" "}
          {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {weekDays.map((day) => {
            const dayAffectations = affectations.filter((a) =>
              isSameDay(new Date(a.date), day)
            );

            return (
              <Card key={day.toISOString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {format(day, "EEEE d MMMM", { locale: fr })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayAffectations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Pas d&apos;affectation
                    </p>
                  ) : (
                    dayAffectations.map((aff) => (
                      <div
                        key={aff.id}
                        className={`rounded-md border p-2 text-xs ${getChantierColor(
                          aff.chantier.id,
                          colorMap
                        )}`}
                      >
                        <div className="font-medium">{aff.chantier.name}</div>
                        <div>
                          {aff.startTime} - {aff.endTime}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
