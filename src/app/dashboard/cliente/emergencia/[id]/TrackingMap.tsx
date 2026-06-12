"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import L from "leaflet";

interface TrackingMapProps {
  clientLat: number;
  clientLng: number;
  techLat: number | null;
  techLng: number | null;
  workshopLat: number | null;
  workshopLng: number | null;
}

/* ─── Custom Emerald-themed Markers ─── */

const getClientIcon = () => {
  return L.divIcon({
    className: "emergency-marker-client",
    html: `
      <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
        <div style="
          position:absolute; inset:0;
          background: radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%);
          border-radius:50%;
          animation: emergencyPulseRing 2s ease-out infinite;
        "></div>
        <div style="
          width:16px; height:16px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius:50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 12px rgba(239,68,68,0.6), 0 2px 8px rgba(0,0,0,0.3);
          position:relative; z-index:2;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const getTechIcon = () => {
  return L.divIcon({
    className: "emergency-marker-tech",
    html: `
      <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
        <div style="
          position:absolute; inset:0;
          background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%);
          border-radius:50%;
          animation: emergencyPulseRing 1.5s ease-out infinite;
        "></div>
        <div style="
          width:18px; height:18px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius:50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px rgba(16,185,129,0.7), 0 2px 8px rgba(0,0,0,0.3);
          position:relative; z-index:2;
          display:flex; align-items:center; justify-content:center;
        ">
          <div style="width:4px; height:4px; background:#fff; border-radius:50%;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const getWorkshopIcon = () => {
  return L.divIcon({
    className: "emergency-marker-workshop",
    html: `
      <div style="
        width:22px; height:22px;
        background: linear-gradient(135deg, #065f46 0%, #047857 100%);
        border-radius:6px;
        border: 2.5px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 10px rgba(5,150,105,0.5), 0 2px 6px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        font-size:9px; font-weight:900; color:#ffffff;
        transform: rotate(45deg);
      ">
        <span style="transform:rotate(-45deg);">T</span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

// Auto center map to show both client and technician (only centers once on start to avoid lagging during updates)
const CenterMapTracker: React.FC<{ clientLat: number; clientLng: number; targetLat: number; targetLng: number }> = ({
  clientLat,
  clientLng,
  targetLat,
  targetLng
}) => {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (hasCentered) return;
    if (targetLat === clientLat && targetLng === clientLng) return;

    const bounds = L.latLngBounds(
      [clientLat, clientLng],
      [targetLat, targetLng]
    );
    map.fitBounds(bounds, {
      padding: [80, 80],
      animate: true,
      duration: 1.5
    });
    setHasCentered(true);
  }, [clientLat, clientLng, targetLat, targetLng, map, hasCentered]);

  // Reset when coordinates change significantly or reset
  useEffect(() => {
    if (targetLat === clientLat && targetLng === clientLng) {
      setHasCentered(false);
    }
  }, [targetLat, targetLng, clientLat, clientLng]);

  return null;
};

// Smooth Marker component that interpolates position updates smoothly over the step interval
const SmoothMarker: React.FC<{
  position: [number, number];
  icon: L.DivIcon;
  children?: React.ReactNode;
}> = ({ position, icon, children }) => {
  const [currentPos, setCurrentPos] = useState<[number, number]>(position);

  useEffect(() => {
    let animationFrameId: number;
    const start = performance.now();
    const duration = 950; // Slide duration in ms, slightly less than 1s step interval
    const startLat = currentPos[0];
    const startLng = currentPos[1];
    const targetLat = position[0];
    const targetLng = position[1];

    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuad easing
      const ease = progress * (2 - progress);

      const lat = startLat + (targetLat - startLat) * ease;
      const lng = startLng + (targetLng - startLng) * ease;

      setCurrentPos([lat, lng]);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [position]);

  return (
    <Marker position={currentPos} icon={icon}>
      {children}
    </Marker>
  );
};


const TrackingMap: React.FC<TrackingMapProps> = ({
  clientLat,
  clientLng,
  techLat,
  techLng,
  workshopLat,
  workshopLng
}) => {
  const [mounted, setMounted] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTargetLat = techLat ?? workshopLat ?? clientLat;
  const activeTargetLng = techLng ?? workshopLng ?? clientLng;

  // Fetch real street routing from OSRM
  useEffect(() => {
    if (activeTargetLat === clientLat && activeTargetLng === clientLng) {
      setRouteCoordinates([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${clientLng},${clientLat};${activeTargetLng},${activeTargetLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            // OSRM returns [lng, lat], Leaflet expects [lat, lng]
            const leafletCoords = coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            setRouteCoordinates(leafletCoords);
            return;
          }
        }
      } catch (err) {
        console.error("OSRM Route fetch failed, using straight line fallback:", err);
      }
      // Fallback: straight line
      setRouteCoordinates([[clientLat, clientLng], [activeTargetLat, activeTargetLng]]);
    };

    fetchRoute();
  }, [clientLat, clientLng, activeTargetLat, activeTargetLng]);

  if (!mounted) {
    return (
      <div className="emergency-map-loading">
        <div className="emergency-map-loading-spinner" />
        <span>Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="emergency-map-fullscreen">
      <MapContainer
        center={[clientLat, clientLng]}
        zoom={14}
        className="emergency-leaflet-container"
        zoomControl={false}
        attributionControl={false}
      >
        <MapResizeHandler />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Dynamic bounds recenter */}
        {activeTargetLat !== clientLat && (
          <CenterMapTracker 
            clientLat={clientLat} 
            clientLng={clientLng} 
            targetLat={activeTargetLat} 
            targetLng={activeTargetLng} 
          />
        )}

        {/* Client emergency pulse ring */}
        <CircleMarker
          center={[clientLat, clientLng]}
          radius={40}
          pathOptions={{
            color: 'rgba(16, 185, 129, 0.15)',
            fillColor: 'rgba(16, 185, 129, 0.05)',
            fillOpacity: 1,
            weight: 1,
          }}
        />

        {/* Client Pin */}
        <Marker position={[clientLat, clientLng]} icon={getClientIcon()} />

        {/* Tech Pin */}
        {techLat !== null && techLng !== null && (
          <SmoothMarker position={[techLat, techLng]} icon={getTechIcon()} />
        )}

        {/* Workshop Pin */}
        {workshopLat !== null && workshopLng !== null && (
          <Marker position={[workshopLat, workshopLng]} icon={getWorkshopIcon()} />
        )}

        {/* Neon Emerald Street Route Lines */}
        {routeCoordinates.length > 0 && (
          <>
            {/* Outer glow shadow */}
            <Polyline 
              positions={routeCoordinates}
              color="#10b981"
              weight={8}
              opacity={0.12}
              lineCap="round"
              lineJoin="round"
            />
            {/* Mid glow */}
            <Polyline 
              positions={routeCoordinates}
              color="#10b981"
              weight={5}
              opacity={0.3}
              lineCap="round"
              lineJoin="round"
            />
            {/* Inner bright route line */}
            <Polyline 
              positions={routeCoordinates}
              color="#34d399"
              weight={3}
              opacity={0.85}
              lineCap="round"
              lineJoin="round"
              dashArray="8 4"
            />
          </>
        )}

      </MapContainer>

      {/* Green ambient vignette overlay */}
      <div className="emergency-map-vignette" />
    </div>
  );
};

export default TrackingMap;
