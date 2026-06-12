"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Fixes Leaflet rendering bugs when map containers
 * are resized or mounted inside dynamic layouts.
 */
export function useMapResize() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    const timer = setTimeout(() => map.invalidateSize(), 200);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(map.getContainer());
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

export function MapResizeHandler() {
  useMapResize();
  return null;
}
