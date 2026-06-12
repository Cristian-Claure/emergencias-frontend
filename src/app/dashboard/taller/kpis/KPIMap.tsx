"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import L from "leaflet";

interface HotSpot {
  lat: number;
  lng: number;
  weight: number;
}

interface KPIMapProps {
  hotspots: HotSpot[];
}

const getHeatIcon = (weight: number) => {
  const size = Math.max(30, Math.min(80, weight * 40));
  const opacity = Math.max(0.3, Math.min(0.8, weight * 0.4));
  
  return L.divIcon({
    className: "leaflet-heatmap-pulse",
    html: `<div style="
      background-color: rgba(239, 68, 68, ${opacity}); 
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%; 
      filter: blur(8px);
      box-shadow: 0 0 ${size * 0.8}px ${size * 0.4}px rgba(239, 68, 68, 0.5);
      animation: pulse 2.5s infinite ease-in-out;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};


export default function KPIMap({ hotspots }: KPIMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
        <span className="text-xs text-zinc-500 font-medium">Cargando mapa......</span>
      </div>
    );
  }

  // Default coordinate centered at Santa Cruz, Bolivia
  const defaultLat = -17.7833;
  const defaultLng = -63.1812;

  return (
    <MapContainer
      center={[defaultLat, defaultLng]}
      zoom={12}
      className="w-full h-full bg-zinc-950"
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <MapResizeHandler />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {hotspots.map((spot, idx) => (
        <Marker 
          key={idx} 
          position={[spot.lat, spot.lng]} 
          icon={getHeatIcon(spot.weight)} 
        />
      ))}
    </MapContainer>
  );
}
