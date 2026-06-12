"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import L from "leaflet";

interface KPIMapProps {
  geojson: any;
}


export default function KPIMap({ geojson }: KPIMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center rounded-2xl border border-white/5">
        <span className="text-xs text-zinc-500 font-medium animate-pulse">
          Cargando mapa......
        </span>
      </div>
    );
  }

  // Extract coordinates from geojson features
  const features = geojson?.features || [];
  const heatPoints = features.map((f: any) => {
    const coords = f.geometry?.coordinates || [];
    const weight = f.properties?.weight || 1.0;
    // geojson coords are usually [lng, lat]
    return {
      lat: coords[1] || -17.7833,
      lng: coords[0] || -63.1812,
      weight: weight
    };
  });

  const defaultPos: [number, number] = [-17.7833, -63.1812];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-zinc-950">
      <MapContainer
        center={defaultPos}
        zoom={12}
        className="w-full h-full bg-zinc-950"
        zoomControl={false}
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Glow circles for high, medium, low concentration zones */}
        {heatPoints.map((pt: any, idx: number) => {
          // Color based on weight: high (> 0.7) = red, medium (0.4 - 0.7) = yellow, low (< 0.4) = green
          const isHigh = pt.weight > 0.7;
          const isMed = pt.weight >= 0.4 && pt.weight <= 0.7;
          const color = isHigh ? "#ef4444" : isMed ? "#eab308" : "#10b981";

          return (
            <React.Fragment key={idx}>
              {/* Outer soft glowing circle */}
              <Circle
                center={[pt.lat, pt.lng]}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 0
                }}
                radius={800 * pt.weight}
              />
              {/* Inner brighter core */}
              <Circle
                center={[pt.lat, pt.lng]}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.4,
                  weight: 1
                }}
                radius={300 * pt.weight}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-10 bg-white border border-[#dce3db] p-3 rounded-lg shadow-sm flex flex-col gap-1.5 text-[9px] font-bold tracking-wider uppercase shrink-0 w-28 select-none">
        <span className="text-[#5a6659] font-bold border-b border-[#dce3db] pb-1 block mb-0.5">Densidad</span>
        <div className="flex items-center gap-2 text-[#111a12]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#c62828]" />
          <span>Alta</span>
        </div>
        <div className="flex items-center gap-2 text-[#111a12]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e65100]" />
          <span>Media</span>
        </div>
        <div className="flex items-center gap-2 text-[#111a12]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2e7d32]" />
          <span>Baja</span>
        </div>
      </div>
    </div>
  );
}
