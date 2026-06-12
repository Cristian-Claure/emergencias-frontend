"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import { Incidente, Workshop } from "@/services/mockData";
import L from "leaflet";

interface InteractiveMapProps {
  incidents: Incidente[];
  workshops: Workshop[];
  selectedIncident: Incidente | null;
  onSelectIncident: (inc: Incidente) => void;
}

// Custom Leaflet Icons using DivIcon to avoid server-side asset mapping errors and support premium dark theme glowing effects
const getIncidentIcon = (prio: string, status: string) => {
  const color = status === "pagado" ? "#2e7d32" : 
                prio === "critica" ? "#c62828" : 
                prio === "alta" ? "#e65100" : "#1b4d2c";
  
  const pulseClass = status === "pagado" ? "" :
                     prio === "critica" ? "marker-pulse-critical" :
                     prio === "alta" ? "marker-pulse-high" : "marker-pulse-normal";
  
  return L.divIcon({
    className: "map-pulse-marker",
    html: `<div class="${pulseClass}" style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const getWorkshopIcon = () => {
  return L.divIcon({
    className: "",
    html: `<div style="background-color: #1b4d2c; width: 14px; height: 14px; border-radius: 3px; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; color: #ffffff; font-family: sans-serif;">T</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

// Component to dynamically re-center map when active selection shifts
const RecenterMap: React.FC<{ selectedIncident: Incidente | null }> = ({ selectedIncident }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedIncident) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 14, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedIncident, map]);
  return null;
};


const InteractiveMap: React.FC<InteractiveMapProps> = ({
  incidents,
  workshops,
  selectedIncident,
  onSelectIncident
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 w-full h-full bg-zinc-950 flex items-center justify-center">
        <span className="text-xs text-zinc-500 font-medium">Cargando mapa......</span>
      </div>
    );
  }

  // Default coordinate centered at Santa Cruz, Bolivia
  const defaultPos: [number, number] = [-17.7833, -63.1812];
  const centerPos: [number, number] = selectedIncident 
    ? [selectedIncident.latitude, selectedIncident.longitude]
    : defaultPos;

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <MapContainer
        center={centerPos}
        zoom={12}
        className="w-full h-full bg-zinc-950"
        zoomControl={false} // Disable to keep full screen minimal, we will place clean controls if needed
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Dynamic center controller */}
        <RecenterMap selectedIncident={selectedIncident} />
        <MapResizeHandler />

        {/* Incident Markers */}
        {incidents.map((inc) => {
          const lat = inc.latitude;
          const lng = inc.longitude;
          const validLat = typeof lat === "number" && !isNaN(lat);
          const validLng = typeof lng === "number" && !isNaN(lng);
          if (!validLat || !validLng) return null;

          return (
            <Marker
              key={inc.id}
              position={[lat, lng]}
              icon={getIncidentIcon(inc.prioridad_ia || "media", inc.estado)}
              eventHandlers={{
                click: () => onSelectIncident(inc)
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 text-zinc-900 font-sans text-xs">
                  <p className="font-bold text-sm text-zinc-950">{inc.vehiculo_modelo}</p>
                  <p className="font-mono text-zinc-500 text-[10px]">{inc.vehiculo_placa}</p>
                  <p className="text-zinc-600 mt-1 leading-relaxed">
                    {inc.descripcion}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-indigo-600">
                      Estado: {inc.estado}
                    </span>
                    <span className="text-zinc-400">
                      ID: #{inc.id}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Workshop Markers */}
        {workshops.map((wk) => {
          const lat = wk.latitude !== undefined ? wk.latitude : (wk as any).latitud;
          const lng = wk.longitude !== undefined ? wk.longitude : (wk as any).longitud;
          const validLat = typeof lat === "number" && !isNaN(lat);
          const validLng = typeof lng === "number" && !isNaN(lng);
          if (!validLat || !validLng) return null;

          return (
            <Marker
              key={wk.id}
              position={[lat, lng]}
              icon={getWorkshopIcon()}
            >
              <Popup>
                <div className="p-2 text-zinc-900 font-sans text-xs">
                  <p className="font-bold text-zinc-950">{wk.nombre}</p>
                  <p className="text-zinc-500 text-[10px]">{wk.especialidad}</p>
                  <p className="text-zinc-600 mt-1 font-semibold">Puntuación: {wk.rating} / 5.0</p>
                  <p className="text-zinc-400 mt-0.5">{wk.telefono}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
