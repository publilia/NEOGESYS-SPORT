"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-sidebar-border bg-sidebar lg:flex"
    >
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
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
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-primary" : "text-sidebar-foreground"
                    }`}
                  />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-sidebar-border p-3"
          >
            <p className="text-[10px] text-muted-foreground">
              NeoGesys Sport v0.1.0
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
