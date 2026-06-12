"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import L from "leaflet";

interface SimpleMapProps {
  lat: number;
  lng: number;
}

const getClientIcon = () => {
  return L.divIcon({
    className: "map-pulse-marker",
    html: `<div style="background-color: #1b4d2c; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.25);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};


export default function SimpleMap({ lat, lng }: SimpleMapProps) {
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

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      className="w-full h-full bg-zinc-950"
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <MapResizeHandler />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[lat, lng]} icon={getClientIcon()} />
    </MapContainer>
  );
}
