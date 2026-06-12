"use client";

import { apiService } from "./apiService";

export const offlineService = {
  // Check if browser is currently online
  isOnline: (): boolean => {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  },

  // Setup connection listeners to auto-sync offline reports
  setupAutoSync: (tenantId: string, onSyncSuccess: (syncedCount: number) => void) => {
    if (typeof window === "undefined") return;

    const handleOnline = async () => {
      console.log("Network connection restored. Syncing offline emergency reports...");
      try {
        const count = apiService.getOfflineQueueCount(tenantId);
        if (count > 0) {
          const result = await apiService.syncOfflineIncidentes(tenantId);
          if (result.synced > 0) {
            onSyncSuccess(result.synced);
          }
        }
      } catch (e) {
        console.error("Auto-sync failed, will retry on next connection state update.", e);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }
};
