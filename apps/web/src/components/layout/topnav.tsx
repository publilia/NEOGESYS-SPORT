"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface NavSection {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  { label: "Home", href: "/" },
  {
    label: "Soci",
    href: "/soci",
    children: [
      { label: "Elenco Soci", href: "/soci" },
      { label: "Nuovo Socio", href: "/soci/nuovo" },
    ],
  },
  { label: "Quote", href: "/quote" },
  { label: "Calendario", href: "/calendario" },
  {
    label: "Corsi",
    href: "/corsi",
    children: [
      { label: "Elenco Corsi", href: "/corsi" },
    ],
  },
  { label: "Eventi", href: "/eventi" },
  { label: "Documenti", href: "/documenti" },
  { label: "AI", href: "/ai" },
  { label: "Impostazioni", href: "/impostazioni" },
];

export function TopNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      className="hidden border-b border-border bg-background px-4 lg:block"
    >
      <div className="flex h-10 items-center gap-1 overflow-x-auto scrollbar-none">
        {NAV_SECTIONS.map((section) => {
          const isActive =
            pathname === section.href ||
            (section.href !== "/" && pathname.startsWith(section.href));

          if (section.children) {
            return (
              <div key={section.href} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === section.href ? null : section.href,
                    )
                  }
                  className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {section.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {openDropdown === section.href && (
                  <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[160px] rounded-md border border-border bg-popover py-1 shadow-lg">
                    {section.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-popover-foreground hover:bg-muted"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={section.href}
              href={section.href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
