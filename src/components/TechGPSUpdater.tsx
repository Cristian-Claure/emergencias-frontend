"use client";

import React, { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";
import { Radio, MapPin } from "lucide-react";

interface TechGPSUpdaterProps {
  tenantId: string;
  tecnicoId: string | null;
  serviceEstado: string;
  onUpdate?: (lat: number, lng: number) => void;
}

export const TechGPSUpdater: React.FC<TechGPSUpdaterProps> = ({
  tenantId,
  tecnicoId,
  serviceEstado,
  onUpdate
}) => {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);

  useEffect(() => {
    if (!tecnicoId || serviceEstado !== "en_camino") {
      setTrackingActive(false);
      return;
    }

    setTrackingActive(true);

    const updateLocation = () => {
      if (!navigator.geolocation) {
        console.warn("Geolocation API not supported by this browser.");
        return;
      }

      const postLocation = async (lat: number, lng: number) => {
        try {
          await apiService.updateTecnicoUbicacion(tenantId, tecnicoId, lat, lng);
          setLastUpdate(new Date().toLocaleTimeString());
          if (onUpdate) {
            onUpdate(lat, lng);
          }
        } catch (err) {
          console.error("Failed to post technician GPRS coordinates", err);
        }
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          postLocation(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("High accuracy background GPS failed, falling back to coarse...", err);
          navigator.geolocation.getCurrentPosition(
            (posFallback) => {
              postLocation(posFallback.coords.latitude, posFallback.coords.longitude);
            },
            (errFallback) => {
              console.error("Background coarse geolocation failed too", errFallback);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    // First execute immediately
    updateLocation();

    // Trigger GPRS updates every 30s as requested
    const interval = setInterval(updateLocation, 30000);

    return () => {
      clearInterval(interval);
      setTrackingActive(false);
    };
  }, [tenantId, tecnicoId, serviceEstado, onUpdate]);

  if (!trackingActive) return null;

  return (
    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center justify-between text-[10px] uppercase font-bold text-indigo-400 select-none animate-pulse">
      <div className="flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
        <span>GPRS Satelital Transmitiendo...</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-500">
        <MapPin className="w-3 h-3 text-zinc-600" />
        <span>GPS: {lastUpdate || "Actualizando..."}</span>
      </div>
    </div>
  );
};
