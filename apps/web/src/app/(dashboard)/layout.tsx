"use client";

import { type ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { CommandPalette } from "@/components/command-palette";
import { AIDrawer } from "@/components/ai-drawer";
import { useLayout } from "@/hooks/use-layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { layoutMode, sidebarCollapsed, toggleSidebarCollapsed } = useLayout();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Fixed header - always present */}
      <AppHeader onToggleSidebar={toggleSidebarCollapsed} />

      {/* Topbar navigation (when layout is topbar mode) */}
      {layoutMode === "topbar" && <TopNav />}

      <div className="flex flex-1">
        {/* Sidebar navigation (when layout is sidebar mode) */}
        {layoutMode === "sidebar" && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebarCollapsed}
          />
        )}

        {/* Main content area */}
        <main
          className={`flex-1 overflow-auto ${
            layoutMode === "sidebar"
              ? sidebarCollapsed
                ? "lg:ml-16"
                : "lg:ml-60"
              : ""
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer />

      {/* Command palette (Cmd+K) */}
      <CommandPalette />

      {/* AI Assistant drawer (Cmd+J) */}
      <AIDrawer />
    </div>
  );
}
