"use client";

import { useCallback, useEffect, useState } from "react";

export type LayoutMode = "sidebar" | "topbar";

const SIDEBAR_STORAGE_KEY = "neogesys-sidebar-collapsed";
const LAYOUT_STORAGE_KEY = "neogesys-layout-mode";

export function useLayout() {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>("sidebar");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (storedLayout === "sidebar" || storedLayout === "topbar") {
      setLayoutModeState(storedLayout);
    }

    const storedCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedCollapsed !== null) {
      setSidebarCollapsedState(storedCollapsed === "true");
    }
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return {
    layoutMode,
    setLayoutMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
  };
}
