"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export const PWAInstallBanner = () => {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    const isDevelopment = process.env.NODE_ENV !== "production";

    // En desarrollo no se debe mantener un Service Worker controlando Next.js:
    // puede interceptar HMR, páginas dinámicas y respuestas del servidor local.
    if (isDevelopment) {
      const cleanupDevelopmentPwa = async () => {
        if (!("serviceWorker" in navigator)) return;

        const hadController = Boolean(navigator.serviceWorker.controller);
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }

        const reloadKey = "auxilio-dev-service-worker-cleared";
        if (hadController && sessionStorage.getItem(reloadKey) !== "1") {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
      };

      cleanupDevelopmentPwa().catch((error) => {
        console.warn("[PWA] No se pudo limpiar el Service Worker de desarrollo:", error);
      });
      return;
    }

    // La PWA solo se registra en una compilación de producción.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registrado:", registration.scope);
        })
        .catch((error) => {
          console.error("[PWA] Error al registrar Service Worker:", error);
        });
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (
    process.env.NODE_ENV !== "production" ||
    !mounted ||
    !isVisible
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[9999] glass-panel p-5 border border-white/10 rounded-3xl shadow-2xl animate-slideIn select-none flex flex-col gap-4">
      <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none blur-xl" />

      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Cerrar instalación PWA"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900 shadow-xl flex items-center justify-center p-1">
          <img
            src="/favicon/web-app-manifest-192x192.png"
            alt="Auxilio.AI"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
            Instalar Auxilio.AI
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold tracking-widest animate-pulse">
              PWA
            </span>
          </h4>
          <span className="text-[10px] text-zinc-400 block font-semibold leading-relaxed">
            Asistencia vial con telemetría Gemini IA.
          </span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 leading-snug">
        Disfruta de una experiencia de aplicación rápida y nativa. Funciona sin
        internet y se inicia directo desde tu pantalla principal.
      </p>

      <div className="grid grid-cols-3 gap-2.5 mt-1">
        <button
          onClick={handleDismiss}
          className="col-span-1 btn-secondary !py-3 !text-[10px] text-center"
        >
          Más tarde
        </button>
        <button
          onClick={handleInstallClick}
          className="col-span-2 btn-primary !py-3 !text-[10px] flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--primary)]/20 border-none cursor-pointer hover:scale-102 transition-transform"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Instalar App</span>
        </button>
      </div>
    </div>
  );
};
