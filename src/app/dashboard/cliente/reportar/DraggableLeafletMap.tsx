"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapResizeHandler } from "@/hooks/useMapResize";
import L from "leaflet";

interface DraggableMapProps {
  lat: number;
  lng: number;
  onMarkerDrag: (lat: number, lng: number) => void;
}

const getDraggableIcon = () => {
  return L.divIcon({
    className: "map-pulse-marker",
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background-color: rgba(16, 185, 129, 0.4);
          border-radius: 50%;
          animation: mapMarkerPulse 1.8s ease-out infinite;
        "></div>
        <div style="
          background-color: #10b981;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 3px 8px rgba(16,185,129,0.5);
          position: relative;
          z-index: 10;
        "></div>
        <style>
          @keyframes mapMarkerPulse {
            0% { transform: scale(0.4); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        </style>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, {
      animate: true,
      duration: 1.2
    });
  }, [lat, lng, map]);
  return null;
};


const DraggableLeafletMap: React.FC<DraggableMapProps> = ({
  lat,
  lng,
  onMarkerDrag
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

  return (
    <div className="absolute inset-0 w-full h-full">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        className="w-full h-full bg-zinc-950"
        zoomControl={false}
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <RecenterMap lat={lat} lng={lng} />

        <Marker
          position={[lat, lng]}
          icon={getDraggableIcon()}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              if (marker != null) {
                const pos = marker.getLatLng();
                onMarkerDrag(pos.lat, pos.lng);
              }
            }
          }}
        />
      </MapContainer>
    </div>
  );
};

export default DraggableLeafletMap;
