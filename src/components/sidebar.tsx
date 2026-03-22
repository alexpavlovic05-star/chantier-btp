"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Clock,
  Users,
  FileText,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminLinks: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chantiers", href: "/chantiers", icon: Building2 },
  { label: "Planning", href: "/planning", icon: CalendarDays },
  { label: "Feuilles d'heures", href: "/feuilles-heures", icon: Clock },
  { label: "Équipe", href: "/equipe", icon: Users },
];

const workerLinks: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mon Planning", href: "/mon-planning", icon: CalendarDays },
  { label: "Mes Heures", href: "/mes-heures", icon: Clock },
];

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/15 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user as { role?: string })?.role ?? "WORKER";
  const links = role === "ADMIN" ? adminLinks : workerLinks;
  const roleLabel = role === "ADMIN" ? "Administrateur" : "Ouvrier";

  return (
    <div className="flex h-full flex-col bg-[#1E3A5F] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">ChantierApp</span>
      </div>

      <Separator className="bg-white/20" />

      {/* Navigation */}
      <div className="flex-1 py-4">
        <NavLinks items={links} pathname={pathname} />
      </div>

      <Separator className="bg-white/20" />

      {/* User info */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">
              {session?.user?.name ?? "Utilisateur"}
            </p>
            <Badge
              variant="secondary"
              className="mt-0.5 bg-white/20 text-blue-100 text-xs hover:bg-white/20"
            >
              {roleLabel}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-blue-100 hover:bg-white/10 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[250px] md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center bg-[#1E3A5F] px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-0 border-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="ml-3 text-lg font-bold text-white">ChantierApp</span>
      </div>
    </>
  );
}
