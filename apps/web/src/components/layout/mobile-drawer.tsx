"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Home,
  Users,
  CreditCard,
  CalendarDays,
  GraduationCap,
  Calendar,
  FileText,
  Bot,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useUIStore } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/soci", label: "Soci", icon: Users },
  { href: "/quote", label: "Quote", icon: CreditCard },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/corsi", label: "Corsi", icon: GraduationCap },
  { href: "/eventi", label: "Eventi", icon: Calendar },
  { href: "/documenti", label: "Documenti", icon: FileText },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function MobileDrawer() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Close on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar lg:hidden"
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  NS
                </div>
                <span className="text-sm font-semibold text-sidebar-foreground">
                  NeoGesys Sport
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Chiudi menu"
              >
                <X className="h-5 w-5 text-sidebar-foreground" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-4">
              <p className="text-xs text-muted-foreground">
                NeoGesys Sport v0.1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
