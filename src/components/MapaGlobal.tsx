"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import { Incidente, Workshop } from "@/services/mockData";
import L from "leaflet";
import { Wrench, MapPin, Navigation, RefreshCw, Layers, Star } from "lucide-react";

interface MapaGlobalProps {
  incidents: Incidente[];
  workshops: Workshop[];
  onSelectIncident: (inc: Incidente) => void;
}

// Custom markers using clean and high-fidelity design styles
const getIncidentIcon = (prio: string) => {
  const color = prio === "critica" ? "#f43f5e" : prio === "alta" ? "#f59e0b" : "#10b981";
  return L.divIcon({
    className: "map-incident-marker",
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.2s ease;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const getWorkshopIcon = () => {
  return L.divIcon({
    className: "map-workshop-marker",
    html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 5px; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 950; color: #ffffff;">T</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

const getTechIcon = () => {
  return L.divIcon({
    className: "map-tech-marker",
    html: `<div style="background-color: #3b82f6; width: 15px; height: 15px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35); display: flex; align-items: center; justify-content: center; color: #ffffff;"><svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg></div>`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5]
  });
};

// Auto center and adjust bounds component
function MapAutoBounds({ incidents, workshops }: { incidents: Incidente[]; workshops: Workshop[] }) {
  const map = useMap();

  useEffect(() => {
    if (incidents.length === 0 && workshops.length === 0) return;

    const bounds: L.LatLngTuple[] = [];

    incidents.forEach(inc => {
      if (inc.latitude && inc.longitude) {
        bounds.push([inc.latitude, inc.longitude]);
      }
    });

    workshops.forEach(wk => {
      const lat = wk.latitude !== undefined ? wk.latitude : (wk as any).latitud;
      const lng = wk.longitude !== undefined ? wk.longitude : (wk as any).longitud;
      if (lat && lng) {
        bounds.push([lat, lng]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [60, 60],
        maxZoom: 14,
        animate: true,
        duration: 1.2
      });
    }
  }, [incidents, workshops, map]);

  return null;
}

export default function MapaGlobal({
  incidents,
  workshops,
  onSelectIncident
}: MapaGlobalProps) {
  const [mounted, setMounted] = useState(false);
  
  // Layer Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showWorkshops, setShowWorkshops] = useState(true);
  const [showTechs, setShowTechs] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 w-full h-full bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-200">
        <div className="flex flex-col items-center gap-2.5">
          <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cargando mapa......</span>
        </div>
      </div>
    );
  }

  // Filter active incidents
  const activeIncidents = incidents.filter(i => 
    i.estado === "pendiente" || 
    i.estado === "clasificado" || 
    i.estado === "cotizado" || 
    i.estado === "en_camino" || 
    i.estado === "atendido"
  );

  // Get active technicians in route. A technician can appear in more than one
  // incident response, so Map guarantees one marker and one unique React key.
  const activeTechs = Array.from(
    incidents
      .filter(i =>
        (i.estado === "en_camino" || i.estado === "en_proceso") &&
        typeof i.latitude === "number" &&
        typeof i.longitude === "number" &&
        Boolean(i.tecnico_id)
      )
      .reduce((unique, inc) => {
        const technicianId = String(inc.tecnico_id);
        if (unique.has(technicianId)) return unique;

        const hasRealCoords =
          typeof inc.tecnico_lat === "number" &&
          typeof inc.tecnico_lng === "number";

        unique.set(technicianId, {
          id: `t_${technicianId}`,
          name: inc.tecnico_asignado || "Técnico Especializado",
          lat: hasRealCoords ? inc.tecnico_lat! : inc.latitude + 0.003,
          lng: hasRealCoords ? inc.tecnico_lng! : inc.longitude - 0.003,
          job: inc.vehiculo_placa
        });
        return unique;
      }, new Map<string, {
        id: string;
        name: string;
        lat: number;
        lng: number;
        job: string;
      }>())
      .values()
  );

  const defaultPos: [number, number] = [-17.7833, -63.1812];

  return (
    <div className="absolute inset-0 w-full h-full z-0 flex flex-col justify-between">
      
      {/* Map Container */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          center={defaultPos}
          zoom={12}
          className="w-full h-full bg-slate-50"
          zoomControl={false}
        >
          <MapResizeHandler />
          <MapAutoBounds incidents={activeIncidents} workshops={workshops} />
          
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <ZoomControl position="bottomright" />

          {/* Incident Pins Layer */}
          {showIncidents && activeIncidents.map(inc => {
            const lat = inc.latitude;
            const lng = inc.longitude;
            const validLat = typeof lat === "number" && !isNaN(lat);
            const validLng = typeof lng === "number" && !isNaN(lng);
            if (!validLat || !validLng) return null;

            return (
              <Marker
                key={`inc_${inc.id}`}
                position={[lat, lng]}
                icon={getIncidentIcon(inc.prioridad_ia || "media")}
                eventHandlers={{
                  click: () => onSelectIncident(inc)
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs text-slate-800">
                    <p className="font-extrabold text-slate-900 text-sm uppercase leading-none">{inc.vehiculo_modelo}</p>
                    <span className="inline-block text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold mt-1.5">{inc.vehiculo_placa || "4567-XYZ"}</span>
                    <p className="text-slate-500 mt-2 text-[10.5px] leading-relaxed border-t border-slate-100 pt-2">"{inc.descripcion}"</p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-bold">
                      <span className="text-emerald-600 uppercase tracking-wider">Estado: {inc.estado}</span>
                      <span className="text-slate-400">ID: #{inc.id.toString().substring(0, 8)}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Workshop Pins Layer */}
          {showWorkshops && workshops.map(wk => {
            const lat = wk.latitude !== undefined ? wk.latitude : (wk as any).latitud;
            const lng = wk.longitude !== undefined ? wk.longitude : (wk as any).longitud;
            const validLat = typeof lat === "number" && !isNaN(lat);
            const validLng = typeof lng === "number" && !isNaN(lng);
            if (!validLat || !validLng) return null;

            return (
              <Marker
                key={`wk_${wk.id}`}
                position={[lat, lng]}
                icon={getWorkshopIcon()}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs text-slate-850">
                    <p className="font-extrabold text-slate-900 text-sm uppercase leading-none">{wk.nombre}</p>
                    <span className="inline-block text-slate-400 text-[9px] uppercase font-bold tracking-wider mt-1">{wk.especialidad}</span>
                    <div className="flex items-center text-amber-500 font-extrabold gap-0.5 mt-2 border-t border-slate-100 pt-2">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Rating: {wk.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Techs Pins Layer */}
          {showTechs && activeTechs.map(tech => (
            <Marker
              key={tech.id}
              position={[tech.lat, tech.lng]}
              icon={getTechIcon()}
            >
              <Popup>
                <div className="p-1 font-sans text-xs text-slate-850">
                  <p className="font-extrabold text-slate-900 text-sm uppercase leading-none">{tech.name}</p>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-1">Mecánico en Ruta</p>
                  <p className="text-slate-500 font-mono text-[9px] mt-2 border-t border-slate-100 pt-2">Asistiendo Placa: {tech.job}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </div>

      {/* Floating Layer Toggle Switches Control Panel (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 border border-slate-200 p-3.5 rounded-xl shadow-lg backdrop-blur-md flex flex-col gap-2.5 text-[9.5px] font-black uppercase tracking-wider select-none shrink-0 w-36">
        <div className="flex items-center justify-between gap-2 text-slate-700">
          <span>Casos</span>
          <button 
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 border rounded-lg text-[8px] font-black uppercase cursor-pointer transition-all ${
              showIncidents 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' 
                : 'bg-slate-50 text-slate-500 border-slate-250'
            }`}
          >
            {showIncidents ? "On" : "Off"}
          </button>
        </div>
        
        <div className="flex items-center justify-between gap-2 text-slate-700">
          <span>Talleres</span>
          <button 
            onClick={() => setShowWorkshops(!showWorkshops)}
            className={`px-2.5 py-1 border rounded-lg text-[8px] font-black uppercase cursor-pointer transition-all ${
              showWorkshops 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' 
                : 'bg-slate-50 text-slate-500 border-slate-250'
            }`}
          >
            {showWorkshops ? "On" : "Off"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-slate-700">
          <span>Técnicos</span>
          <button 
            onClick={() => setShowTechs(!showTechs)}
            className={`px-2.5 py-1 border rounded-lg text-[8px] font-black uppercase cursor-pointer transition-all ${
              showTechs 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' 
                : 'bg-slate-50 text-slate-500 border-slate-250'
            }`}
          >
            {showTechs ? "On" : "Off"}
          </button>
        </div>
      </div>

    </div>
  );
}
