"use client";

const VAPID_PUBLIC_KEY = "BJJFZUAcvCNugOTLfxaDogLtN8SSQVUelrORKIDh8twaU4xwQ-46n0WGQappdMEKnHiZ83tW1r6Q9k-KBJxzKOk";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    const playTone = (freq: number, startOffset: number, duration: number, volume: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + startOffset);
      
      gainNode.gain.setValueAtTime(0, now + startOffset);
      gainNode.gain.linearRampToValueAtTime(volume, now + startOffset + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };
    
    // WhatsApp/iOS style double-tone notification ping
    playTone(1046.50, 0, 0.15, 0.15); // C6 tone
    playTone(1318.51, 0.07, 0.22, 0.12); // E6 tone
  } catch (err) {
    console.warn("[Push Service] Web Audio chime failed:", err);
  }
}

/**
 * Service to manage native PWA Web Push Notifications.
 * Works seamlessly in standard browsers and PWAs, providing a 100% free, robust,
 * and high-fidelity native notification experience.
 */
export const notificationService = {
  /**
   * Request native browser permission for showing notifications.
   */
  requestPermission: async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("Notifications are not supported in this browser.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (e) {
      console.error("Error requesting notification permissions:", e);
      return false;
    }
  },

  /**
   * Request native browser permission for showing notifications and register Web Push.
   */
  registerPushSubscription: async (tenantId: string, onlyIfGranted: boolean = false): Promise<boolean> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications are not supported in this browser or service worker context.");
      return false;
    }

    if (onlyIfGranted && Notification.permission !== "granted") {
      console.log("[Push Service] Notification permission not granted, skipping automatic registration on load to prevent mobile gesture block.");
      return false;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.log("[Push Service] User not authenticated, skipping push registration.");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request notifications permission first
      const hasPermission = await notificationService.requestPermission();
      if (!hasPermission) {
        console.warn("[Push Service] Notification permission not granted.");
        return false;
      }

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log("[Push Service] No active subscription, subscribing...");
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      console.log("[Push Service] Subscription obtained:", subscription);

      // Send to backend
      const { apiService } = await import("./apiService");
      await apiService.savePushSubscription(tenantId, subscription.toJSON());
      console.log("[Push Service] Subscription saved on backend.");
      return true;
    } catch (e) {
      console.error("[Push Service] Error registering push subscription:", e);
      return false;
    }
  },

  /**
   * Return the current permission status.
   */
  getPermissionStatus: (): string => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  },

  /**
   * Dispatches a native push notification, utilizing the active Service Worker
   * registration for maximum compatibility and native PWA background integration.
   */
  show: (title: string, body: string, options?: any) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") {
      console.warn("Notifications permission not granted.");
      return;
    }

    // Play synthesized foreground notification sound
    playChime();

    const defaultOptions: any = {
      body,
      icon: "/favicon/web-app-manifest-192x192.png",
      badge: "/favicon/favicon-96x96.png",
      vibrate: [200, 100, 200, 100, 300],
      tag: "auxilio-ai-notification",
      renotify: true,
      data: {
        url: window.location.href
      },
      ...options
    };

    // Correct standard way for PWA: trigger notification through Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, defaultOptions);
      }).catch((err) => {
        console.error("Failed to show notification via service worker, falling back", err);
        new Notification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  },

  /**
   * Translates real-time WebSocket / polling events to immediate user-facing push notifications.
   */
  handleEvent: (event: string, data: any) => {
    console.log(`[Push Service] Handling event: ${event}`, data);
    
    switch (event) {
      case "nueva_cotizacion_recibida":
        notificationService.show(
          "¡Un taller aceptó tu solicitud!",
          `El taller "${data.taller_nombre || 'Socio Autorizado'}" ha aceptado tu reporte de auxilio vial y envió una propuesta de cotización competitiva.`,
          { tag: "quote-received" }
        );
        break;

      case "incidente_aceptado":
        notificationService.show(
          "¡Servicio aceptado por taller!",
          `El taller "${data.taller_nombre || 'Asignado'}" ha aceptado atender tu emergencia. Un mecánico preparará su salida.`,
          { tag: "incident-accepted" }
        );
        break;

      case "incidente_declinado":
        notificationService.show(
          "¡Taller declinó el servicio!",
          "El taller asignado ha cancelado/declinado tu atención por motivos de fuerza mayor. Tu reporte se reasignará automáticamente de inmediato.",
          { tag: "incident-declined", vibrate: [400, 200, 400] }
        );
        break;

      case "incidente_estado_actualizado":
        const newStatus = data.estado;
        if (newStatus === "en_camino") {
          notificationService.show(
            "¡El auxilio vial está en camino!",
            `El mecánico asignado ya se dirige hacia tu ubicación. Sigue su ruta GPS en tiempo real desde el mapa de seguimiento.`,
            { tag: "status-en-camino" }
          );
        } else if (newStatus === "atendido") {
          notificationService.show(
            "¡El mecánico ha llegado!",
            "El mecánico ha arribado a tu ubicación y ha iniciado el servicio de auxilio vial.",
            { tag: "status-atendido" }
          );
        } else if (newStatus === "pagado" || newStatus === "completado") {
          notificationService.show(
            "¡Servicio completado!",
            "El auxilio vial ha sido finalizado con éxito. Por favor, califica tu experiencia.",
            { tag: "status-pagado" }
          );
        } else if (newStatus === "pendiente") {
          notificationService.show(
            "Tu emergencia ha sido re-clasificada",
            "El reporte de auxilio ha regresado al estado de búsqueda activa. Estamos encontrando el taller más óptimo.",
            { tag: "status-pendiente" }
          );
        }
        break;

      default:
        // Do not spam generic notifications for minor updates
        break;
    }
  }
};
