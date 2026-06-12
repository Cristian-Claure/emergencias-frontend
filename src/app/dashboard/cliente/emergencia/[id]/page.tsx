"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import confetti from "canvas-confetti";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { useWebSocket } from "@/hooks/useWebSocket";
import { notificationService } from "@/services/notificationService";
import { Incidente, Tenant, Workshop, Cotizacion } from "@/services/mockData";
import { FormattedText } from "@/components/FormattedText";
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Star, 
  User, 
  Phone, 
  DollarSign, 
  Coins,
  CheckCircle, 
  RefreshCw, 
  XSquare, 
  ShieldCheck, 
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Zap,
  WifiOff,
  ChevronRight,
  Play,
  Wrench,
  ExternalLink,
  X,
  Radio,
  Users,
  Navigation,
  CreditCard,
  Check,
  Shield,
  Crosshair
} from "lucide-react";

// Dynamic import for TrackingMap to avoid SSR Leaflet window errors
const TrackingMap = dynamic(
  () => import("./TrackingMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="emergency-map-loading">
        <div className="emergency-map-loading-spinner" />
        <span>Cargando mapa...</span>
      </div>
    )
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmergenciaActiva({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();
  const incidenteId = routeParams.id as string;

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  
  // Cotizaciones & GPS Telemetry
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [trackingData, setTrackingData] = useState<any>(null);

  // Ratings feedback fields
  const [ratingVal, setRatingVal] = useState(5);
  const [comentarioVal, setComentarioVal] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Custom Toast State
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });

  // Simulation for demo/exam
  const [simulando, setSimulando] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [syncDb, setSyncDb] = useState(true);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // UI toggles
  const [showSidebar, setShowSidebar] = useState(false);

  const acercarTecnico = async () => {
    if (!incidente || !activeTenant || !incidente.tecnico_id) return;
    const lat = incidente.latitude + 0.0004;
    const lng = incidente.longitude - 0.0004;
    
    setTrackingData((prev: any) => ({
      ...prev,
      tecnico_latitud: lat,
      tecnico_longitud: lng,
      eta_minutos: 1
    }));
    
    try {
      await apiService.updateTecnicoUbicacion(activeTenant.id, incidente.tecnico_id, lat, lng);
      showToast("Técnico posicionado a 50m (Base de Datos actualizada)", "success");
      await fetchEmergencyData();
    } catch (e) {
      showToast("Posicionado localmente", "success");
    }
  };

  const alejarTecnico = async () => {
    if (!incidente || !activeTenant || !incidente.tecnico_id) return;
    const lat = incidente.latitude - 0.02;
    const lng = incidente.longitude + 0.02;
    
    setTrackingData((prev: any) => ({
      ...prev,
      tecnico_latitud: lat,
      tecnico_longitud: lng,
      eta_minutos: 15
    }));
    
    try {
      await apiService.updateTecnicoUbicacion(activeTenant.id, incidente.tecnico_id, lat, lng);
      showToast("Técnico posicionado a 3km (Base de Datos actualizada)", "success");
      await fetchEmergencyData();
    } catch (e) {
      showToast("Posicionado localmente", "success");
    }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, msg });
    setTimeout(() => setToastMsg({ type: "", msg: "" }), 4500);
  };

  // Initialize
  useEffect(() => {
    const initApp = async () => {
      const tenantList = apiService.getTenants();
      setTenants(tenantList);

      const savedTenantId = localStorage.getItem("active_tenant_id");
      const matchedTenant = tenantList.find(t => t.id === savedTenantId) || tenantList[0];
      setActiveTenant(matchedTenant);

      const isLive = await checkBackendHealth();
      setIsBackendConnected(isLive);

      if (typeof window !== "undefined") {
        setIsOnline(navigator.onLine);
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
      }

      // Request native Web Push Notification permissions and sync subscription (only if already granted to prevent mobile gestures block)
      await notificationService.registerPushSubscription(matchedTenant.id, true);

      setLoading(false);
    };
    initApp();
  }, []);

  // Fetch active incident telemetry & bids
  const fetchEmergencyData = async () => {
    if (!activeTenant) return;
    try {
      // 1. Fetch main incident status
      const incList = await apiService.getIncidentes(activeTenant.id);
      const matchedInc = incList.find(i => i.id.toString() === incidenteId.toString());
      
      if (!matchedInc) {
        // Redirect to dashboard home if incident not found
        router.push("/dashboard/cliente");
        return;
      }
      setIncidente(matchedInc);

      // 2. Fetch certified workshops
      const wkList = await apiService.getTalleres(activeTenant.id);
      setWorkshops(wkList);

      // 3. Fetch bids/cotizaciones if in bidding phase
      if (
        matchedInc.estado === "pendiente" ||
        matchedInc.estado === "reportado" ||
        matchedInc.estado === "cotizado" ||
        matchedInc.estado === "clasificado"
      ) {
        const bids = await apiService.getCotizacionesForIncidente(activeTenant.id, matchedInc.id);
        setCotizaciones(bids);
      } else {
        setCotizaciones([]);
      }

      // 4. Fetch rating review if service completes
      if (matchedInc.estado === "pagado" && !existingReview) {
        // Simulate checking if already reviewed
        // In real backend, we check reviews list
        const token = localStorage.getItem("auth_token");
        if (token && matchedInc.taller_asignado_id) {
          try {
            const baseUrl = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
              ? "https://backend-si2-taller-385056433848.us-central1.run.app"
              : (process.env.NEXT_PUBLIC_API_URL || "https://backend-si2-taller-385056433848.us-central1.run.app");
            const res = await fetch(`${baseUrl}/api/v1/reviews/taller/${matchedInc.taller_asignado_id}`, {
              headers: {
                "X-Tenant-ID": activeTenant.id,
                "Authorization": `Bearer ${token}`
              }
            });
            if (res.ok) {
              const reviewsList = await res.json();
              const myReview = reviewsList.find((r: any) => r.incidente_id.toString() === matchedInc.id.toString());
              if (myReview) {
                setExistingReview(myReview);
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error("Failed to sync emergency tracking telemetry", e);
    }
  };

  useEffect(() => {
    if (!activeTenant) return;
    fetchEmergencyData();

    // Polling every 5 seconds to sync state changes immediately
    const stateInterval = setInterval(() => {
      if (!offlineMode) {
        fetchEmergencyData();
      }
    }, 5000);

    return () => clearInterval(stateInterval);
  }, [activeTenant, offlineMode]);

  // Connect to WebSocket for active incident to receive real-time push notifications
  useWebSocket({
    incidenteId: incidenteId,
    onEvent: (event, data) => {
      if (event === "ubicacion_tecnico_actualizada") {
        setTrackingData((prev: any) => ({
          incidente_id: data.incidente_id,
          incidente_latitud: incidente?.latitude || data.incidente_latitud || prev?.incidente_latitud,
          incidente_longitud: incidente?.longitude || data.incidente_longitud || prev?.incidente_longitud,
          tecnico_id: data.tecnico_id,
          tecnico_latitud: data.latitud,
          tecnico_longitud: data.longitud,
          taller_latitud: prev?.taller_latitud,
          taller_longitud: prev?.taller_longitud,
          estado: "en_camino",
          eta_minutos: data.eta_minutos,
          points: data.points || prev?.points || []
        }));
      } else {
        notificationService.handleEvent(event, data);
        fetchEmergencyData();
      }
    }
  });

  // GPS Telemetry Polling (every 10 seconds, only in en_camino status)
  useEffect(() => {
    if (!activeTenant || !incidente || incidente.estado !== "en_camino") {
      setTrackingData(null);
      return;
    }

    const fetchGPSTelemetry = async () => {
      try {
        const telemetry = await apiService.getRealtimeTracking(activeTenant.id, incidente.id);
        setTrackingData(telemetry);
      } catch (e) {
        console.error("Failed to fetch GPS tracking positions", e);
      }
    };

    fetchGPSTelemetry();
    const gpsInterval = setInterval(() => {
      if (!offlineMode) {
        fetchGPSTelemetry();
      }
    }, 10000);

    return () => clearInterval(gpsInterval);
  }, [activeTenant, incidente?.estado]);

  // Dynamic terminal-like status logging simulation for AI evaluation phase
  useEffect(() => {
    if (incidente?.estado === "pendiente" || incidente?.estado === "clasificado") {
      const logs = [
        "📡 Conectando con los servidores neurales de Gemini...",
        "🎤 Procesando evidencias y descripción de voz...",
        "🚗 Identificando marca, modelo y placa del vehículo...",
        "⚙️ Ejecutando análisis de fallas en el bloque motor...",
        "📊 Evaluando nivel de riesgo y severidad del siniestro...",
        "✅ Análisis IA completo. Solicitando ofertas de talleres..."
      ];
      setAiLogs([logs[0]]);
      let current = 1;
      const interval = setInterval(() => {
        if (current < logs.length) {
          setAiLogs(prev => [...prev, logs[current]]);
          current++;
        } else {
          clearInterval(interval);
        }
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setAiLogs([]);
    }
  }, [incidente?.estado]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setIncidente(null);
      localStorage.setItem("active_tenant_id", tenantId);
      router.push("/dashboard/cliente");
    }
  };

  const handleOfflineToggle = () => {
    const nextState = !offlineMode;
    setOfflineMode(nextState);
    if (nextState) {
      setIsBackendConnected(false);
    } else {
      checkBackendHealth().then((live) => setIsBackendConnected(live));
    }
  };

  // Cancel emergency
  const handleCancelEmergency = async () => {
    if (!activeTenant || !incidente) return;
    if (!confirm("¿Confirmar cancelación? Esta acción no se puede deshacer.")) return;

    try {
      // In real backend, we change status to cancelado
      const token = localStorage.getItem("auth_token");
      if (token) {
        const baseUrl = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
          ? "https://backend-si2-taller-385056433848.us-central1.run.app"
          : (process.env.NEXT_PUBLIC_API_URL || "https://backend-si2-taller-385056433848.us-central1.run.app");
        const res = await fetch(`${baseUrl}/api/v1/incidentes/${incidente.id}/completar`, { // complete or cancel endpoint, or trigger local complete with fallback
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": activeTenant.id,
            "Authorization": `Bearer ${token}`
          }
        });
      }
      
      // Fallback update
      const localIncidents = JSON.parse(localStorage.getItem("auxilio_auto_incidents") || "[]");
      const idx = localIncidents.findIndex((i: any) => i.id.toString() === incidente.id.toString());
      if (idx !== -1) {
        localIncidents[idx].estado = "cancelado";
        localStorage.setItem("auxilio_auto_incidents", JSON.stringify(localIncidents));
      }

      await fetchEmergencyData();
      showToast("Emergencia cancelada con éxito.", "success");
    } catch (e) {
      console.error(e);
      showToast("Error al cancelar la emergencia.", "error");
    }
  };

  // ──── SIMULACIÓN EN VIVO PARA DEFENSA DE EXAMEN ────
  // Interpola la posición del técnico desde el taller hasta el cliente a lo largo de calles reales usando OSRM
  const startSimulacionEnVivo = async () => {
    if (!incidente || simulando) return;

    // Punto de origen: taller o posición actual del técnico
    const origenLat = trackingData?.tecnico_latitud ?? trackingData?.taller_latitud ?? (incidente.latitude - 0.015);
    const origenLng = trackingData?.tecnico_longitud ?? trackingData?.taller_longitud ?? (incidente.longitude - 0.012);

    // Punto destino: ubicación del cliente/incidente
    const destinoLat = incidente.latitude;
    const destinoLng = incidente.longitude;

    setSimulando(true);
    showToast("Descargando ruta de calles en tiempo real...", "success");

    let steps: [number, number][] = [];
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates;
          steps = coords.map((c: any) => [c[1], c[0]] as [number, number]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch OSRM simulation route", e);
    }

    // Fallback: 20 linear steps if OSRM is offline
    if (steps.length === 0) {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        steps.push([
          origenLat + (destinoLat - origenLat) * t,
          origenLng + (destinoLng - origenLng) * t
        ]);
      }
    }

    showToast("Simulación iniciada — observa al mecánico recorrer las calles en vivo", "success");

    let step = 0;
    const TOTAL_STEPS = steps.length;
    const STEP_INTERVAL_MS = 1000; // 1 segundo por paso para una demo fluida

    const simInterval = setInterval(async () => {
      if (step >= TOTAL_STEPS) {
        clearInterval(simInterval);
        setSimulando(false);
        showToast("¡El técnico ha llegado a tu ubicación!", "success");
        return;
      }

      const currentPos = steps[step];
      const progress = step / TOTAL_STEPS;
      const etaMinutos = Math.max(1, Math.round((1 - progress) * 15));

      setTrackingData((prev: any) => ({
        ...prev,
        tecnico_latitud: currentPos[0],
        tecnico_longitud: currentPos[1],
        eta_minutos: etaMinutos,
        taller_latitud: prev?.taller_latitud ?? origenLat,
        taller_longitud: prev?.taller_longitud ?? origenLng
      }));

      if (syncDb && activeTenant && incidente.tecnico_id) {
        try {
          await apiService.updateTecnicoUbicacion(
            activeTenant.id,
            incidente.tecnico_id,
            currentPos[0],
            currentPos[1]
          );
        } catch (e) {
          console.error("Failed to sync simulated position to db", e);
        }
      }

      step++;
    }, STEP_INTERVAL_MS);
  };

  // Accept competitive bid quote
  const handleAcceptQuote = async (quoteId: string | number) => {
    if (!activeTenant) return;
    if (!confirm("¿Confirmar asignación? El mecánico iniciará la ruta de despacho.")) return;

    try {
      const ok = await apiService.aceptarCotizacion(activeTenant.id, quoteId);
      if (ok) {
        await fetchEmergencyData();
        showToast("Oferta aceptada con éxito. Mecánico en camino.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Error al aceptar la oferta.", "error");
    }
  };

  // Submit star rating feedback review
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !incidente || !incidente.taller_asignado_id) return;

    if (incidente.estado !== "pagado") {
      showToast("Solo puedes calificar el servicio una vez pagado.", "error");
      return;
    }

    setSubmittingReview(true);
    try {
      await apiService.crearReview(activeTenant.id, {
        incidente_id: incidente.id,
        taller_id: incidente.taller_asignado_id,
        calificacion: ratingVal,
        comentario: comentarioVal
      });

      setReviewCompleted(true);
      try {
        confetti({
          particleCount: 120,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#1b4d2c", "#2e7d32", "#a3e635", "#ffffff"]
        });
      } catch (e) {
        console.error("Confetti failed", e);
      }
      setTimeout(() => {
        setReviewCompleted(false);
        setComentarioVal("");
        router.push("/dashboard/cliente");
      }, 2000);
    } catch (e) {
      console.error(e);
      showToast("Error al enviar calificación.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !activeTenant || !incidente) {
    return (
      <div className="emergency-page-loader">
        <div className="emergency-page-loader-inner">
          <RefreshCw className="emergency-page-loader-icon" />
          <p>Cargando emergencia...</p>
        </div>
      </div>
    );
  }

  // Visual state transitions stepper with support for unhandled states in backend ('en_proceso' and completed classification in 'pendiente')
  const steps = ["pendiente", "cotizado", "sin_tecnico", "en_camino", "atendido", "pagado"];
  let mappedEstado = incidente.estado as string;
  if (incidente.estado === "clasificado") {
    mappedEstado = "pendiente";
  } else if (incidente.estado === "pendiente" && incidente.analisis_ia) {
    mappedEstado = "cotizado";
  } else if (mappedEstado === "en_proceso") {
    mappedEstado = "en_camino";
  }
  const currentStepIndex = steps.indexOf(mappedEstado);

  // Get status label
  const getStatusLabel = () => {
    switch (mappedEstado) {
      case "pendiente": return "Evaluación IA";
      case "cotizado": return "Subasta Activa";
      case "sin_tecnico": return "Asignando";
      case "en_camino": return "En Ruta";
      case "atendido": return "Servicio Activo";
      case "pagado": return "Completado";
      default: return "Emergencia";
    }
  };

  return (
    <RoleGuard allowedRoles={["cliente"]}>
      <div className="emergency-page-root">

        {/* ═══ LAYER 0: FULL-SCREEN MAP BACKGROUND ═══ */}
        <div className="emergency-map-layer">
          <TrackingMap
            clientLat={incidente.latitude}
            clientLng={incidente.longitude}
            techLat={trackingData?.tecnico_latitud ?? null}
            techLng={trackingData?.tecnico_longitud ?? null}
            workshopLat={trackingData?.taller_latitud ?? null}
            workshopLng={trackingData?.taller_longitud ?? null}
          />
        </div>

        {/* ═══ LAYER 1: FLOATING UI OVERLAYS ═══ */}
        <div className="emergency-overlay-layer">

          {/* Offline indicator global banner */}
          {(!isOnline || offlineMode) && (
            <div className="emergency-offline-banner">
              <WifiOff className="emergency-offline-icon" />
              <span>Sin conexión — tu emergencia se guardará localmente</span>
            </div>
          )}

          {/* ── TOP BAR: Back + Status + Pipeline ── */}
          <div className="emergency-top-bar">
            {/* Back button */}
            <button 
              onClick={() => {
                sessionStorage.setItem("skip_active_redirect", "true");
                router.push("/dashboard/cliente");
              }}
              className="emergency-back-btn"
            >
              <ArrowLeft className="emergency-back-icon" />
            </button>

            {/* Status badge */}
            <div className="emergency-status-badge">
              <span className="emergency-status-dot" />
              <span className="emergency-status-label">{getStatusLabel()}</span>
              <span className="emergency-status-phase">Fase {currentStepIndex + 1}/6</span>
            </div>

            {/* Pipeline Stepper */}
            {incidente.estado !== "cancelado" && (
              <div className="emergency-pipeline">
                {steps.map((st, sIdx) => {
                  const isDone = sIdx < currentStepIndex;
                  const isCurrent = sIdx === currentStepIndex;
                  const stepLabel = 
                    st === "pendiente" ? "Reportado" :
                    st === "cotizado" ? "Licitación" :
                    st === "sin_tecnico" ? "Asignando" :
                    st === "en_camino" ? "En Ruta" :
                    st === "atendido" ? "Atención" : "Pago";

                  let StepIcon = AlertTriangle;
                  if (st === "pendiente") StepIcon = Radio;
                  else if (st === "cotizado") StepIcon = Coins;
                  else if (st === "sin_tecnico") StepIcon = Users;
                  else if (st === "en_camino") StepIcon = Navigation;
                  else if (st === "atendido") StepIcon = Wrench;
                  else if (st === "pagado") StepIcon = CreditCard;

                  return (
                    <React.Fragment key={st}>
                      {sIdx > 0 && (
                        <div className={`emergency-pipeline-connector ${sIdx <= currentStepIndex ? "active" : ""}`} />
                      )}
                      <div 
                        className={`emergency-pipeline-node ${isCurrent ? "current" : isDone ? "done" : "future"}`}
                        title={stepLabel}
                      >
                        {isDone ? (
                          <Check className="emergency-pipeline-check" />
                        ) : (
                          <StepIcon className="emergency-pipeline-icon" />
                        )}
                        {isCurrent && (
                          <span className="emergency-pipeline-label">{stepLabel}</span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── FLOATING CONTENT PANEL (Bottom-anchored) ── */}
          <div className="emergency-content-area">
            
            {/* Inject scanner keyframe animations globally */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan {
                0% { top: 0%; opacity: 0.4; }
                50% { top: 97%; opacity: 0.95; }
                100% { top: 0%; opacity: 0.4; }
              }
              @keyframes emergencyPulseRing {
                0% { transform: scale(1); opacity: 0.6; }
                100% { transform: scale(2.5); opacity: 0; }
              }
              @keyframes emergencyGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.15); }
                50% { box-shadow: 0 0 40px rgba(16,185,129,0.3); }
              }
            `}} />
            
            {/* ESTADO A: PENDIENTE (AI analyzing emergency) */}
            {(incidente.estado === "pendiente" || incidente.estado === "clasificado") && !incidente.analisis_ia && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                {/* Holographic scanning card */}
                <div className="emergency-ai-scan-card">
                  {/* Laser scanning line */}
                  <div className="emergency-scan-line" />
                  
                  <div className="emergency-ai-scan-header">
                    <div className="emergency-ai-icon-wrap">
                      <RefreshCw className="emergency-ai-spinner" />
                      <Sparkles className="emergency-ai-sparkle" />
                    </div>
                    <div>
                      <h4 className="emergency-ai-title">
                        <span className="emergency-ai-dot" />
                        Diagnóstico Activo
                      </h4>
                      <p className="emergency-ai-subtitle">
                        Gemini AI analizando evidencias...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terminal Simulation console */}
                <div className="emergency-terminal">
                  <div className="emergency-terminal-header">
                    <span className="emergency-terminal-dot" />
                    <span>Consola Gemini Neural Link</span>
                  </div>
                  <div className="emergency-terminal-body">
                    {aiLogs.map((log, lIdx) => (
                      <motion.div 
                        key={lIdx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`emergency-terminal-line ${lIdx === aiLogs.length - 1 ? "active" : ""}`}
                      >
                        <span>&gt;</span>
                        <span>{log}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Summary card */}
                <div className="emergency-info-card">
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Vehículo</span>
                    <span className="emergency-info-value">{incidente.vehiculo_modelo}</span>
                  </div>
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Reportado</span>
                    <span className="emergency-info-value mono">{new Date(incidente.fecha_reporte).toLocaleTimeString()}</span>
                  </div>
                  {incidente.descripcion && (
                    <div className="emergency-info-description">
                      &ldquo;{incidente.descripcion}&rdquo;
                    </div>
                  )}
                </div>
              </motion.div>
            )}
 
            {/* ESTADO B: COTIZADO (Mechanical bidding auction) */}
            {(incidente.estado === "cotizado" || ((incidente.estado === "pendiente" || incidente.estado === "clasificado") && incidente.analisis_ia)) && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                {/* AI Diagnosis badge */}
                <div className="emergency-diagnosis-card">
                  <div className="emergency-diagnosis-header">
                    <span className="emergency-diagnosis-tag">
                      <Zap className="emergency-diagnosis-icon" /> Diagnóstico IA
                    </span>
                    <span className={`emergency-priority-pill ${
                      incidente.prioridad_ia === "critica" ? "critical" : incidente.prioridad_ia === "alta" ? "high" : "normal"
                    }`}>
                      {incidente.prioridad_ia || "media"}
                    </span>
                  </div>
                  
                  <p className="emergency-diagnosis-category">
                    <span className="emergency-diagnosis-category-value">{incidente.categoria_ia || "Falla técnica"}</span>
                  </p>
                  
                  {incidente.analisis_ia && (
                    <div className="emergency-diagnosis-analysis">
                      &ldquo;<FormattedText text={incidente.analisis_ia} />&rdquo;
                    </div>
                  )}
                </div>

                {/* Competitive quotes reverse auction list */}
                <div className="emergency-bids-section">
                  <div className="emergency-bids-header">
                    <span>Licitaciones ({cotizaciones.length})</span>
                    {cotizaciones.length > 0 && <span className="emergency-bids-live-dot" />}
                  </div>
                  
                  {cotizaciones.length === 0 ? (
                    <div className="emergency-bids-empty">
                      <RefreshCw className="emergency-bids-spinner" />
                      <span>Recibiendo ofertas en tiempo real...</span>
                    </div>
                  ) : (
                    <div className="emergency-bids-list">
                      <AnimatePresence>
                        {cotizaciones.map((quote, idx) => (
                          <motion.div 
                            key={quote.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 }}
                            className="emergency-bid-card"
                          >
                            <div className="emergency-bid-info">
                              <div className="emergency-bid-name-row">
                                <span className="emergency-bid-name">{quote.taller_nombre}</span>
                                <div className="emergency-bid-rating">
                                  <Star className="emergency-bid-star" /> 4.9
                                </div>
                              </div>
                              <p className="emergency-bid-eta">
                                <Clock className="emergency-bid-clock" /> 
                                Arribo: <span className="emergency-bid-eta-value">{quote.tiempo_estimado_minutos} mins</span>
                              </p>
                              {quote.descripcion && <p className="emergency-bid-desc">&ldquo;{quote.descripcion}&rdquo;</p>}
                            </div>

                            <div className="emergency-bid-actions">
                              <span className="emergency-bid-price">Bs. {quote.costo_estimado}</span>
                              <button
                                onClick={() => handleAcceptQuote(quote.id)}
                                className="emergency-bid-accept"
                              >
                                Aceptar
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ESTADO B2: SIN_TECNICO */}
            {incidente.estado === "sin_tecnico" && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                <div className="emergency-waiting-card">
                  <div className="emergency-waiting-icon-wrap">
                    <Clock className="emergency-waiting-clock" />
                    <RefreshCw className="emergency-waiting-spinner" />
                  </div>
                  <h4 className="emergency-waiting-title">Buscando técnico...</h4>
                  <p className="emergency-waiting-subtitle">
                    Estamos buscando un técnico disponible para tu taller asignado.
                  </p>
                </div>

                <div className="emergency-info-card">
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Taller Asignado</span>
                    <span className="emergency-info-value">{incidente.taller_nombre || "Taller Oficial"}</span>
                  </div>
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Estado actual</span>
                    <span className="emergency-info-value highlight">Asignando Técnico</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ESTADO C: EN_CAMINO or EN_PROCESO (GPS real-time tracking) */}
            {(incidente.estado === "en_camino" || (incidente.estado as string) === "en_proceso") && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel emergency-tracking-panel"
              >
                {/* ETA Banner */}
                <div className="emergency-eta-banner">
                  <div className="emergency-eta-left">
                    <span className="emergency-eta-dot" />
                    <span className="emergency-eta-label">¡Ayuda en Camino!</span>
                  </div>
                  <span className="emergency-eta-value">
                    ETA: {trackingData?.eta_minutos ?? 15} Mins
                  </span>
                </div>

                {/* Technician credential card */}
                <div className="emergency-tech-card">
                  <div className="emergency-tech-info">
                    <div className="emergency-tech-avatar">
                      <span>{incidente.tecnico_asignado ? incidente.tecnico_asignado.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "MC"}</span>
                      <span className="emergency-tech-online" />
                    </div>
                    <div>
                      <p className="emergency-tech-name">{incidente.tecnico_asignado || "Mecánico Autorizado"}</p>
                      <p className="emergency-tech-workshop">{incidente.taller_nombre}</p>
                    </div>
                  </div>

                  {incidente.tecnico_telefono && (
                    <a href={`tel:${incidente.tecnico_telefono}`} className="emergency-tech-call">
                      <Phone className="emergency-tech-call-icon" />
                    </a>
                  )}
                </div>

                {/* Route progress indicator */}
                <div className="emergency-route-progress">
                  <div className="emergency-route-labels">
                    <span>Taller</span>
                    <span className="emergency-route-eta-label">En Ruta ({trackingData?.eta_minutos ?? 15}m)</span>
                    <span>Cliente</span>
                  </div>
                  <div className="emergency-route-bar">
                    <div 
                      className="emergency-route-fill"
                      style={{ width: `${Math.max(10, Math.min(95, 100 - ((trackingData?.eta_minutos ?? 15) / 15) * 85))}%` }}
                    />
                    <div 
                      className="emergency-route-dot"
                      style={{ 
                        left: `calc(${Math.max(10, Math.min(95, 100 - ((trackingData?.eta_minutos ?? 15) / 15) * 85))}% - 5px)` 
                      }}
                    />
                  </div>
                </div>

                {/* Demo Control Trigger Button */}
                {!showDemoPanel && (
                  <button
                    onClick={() => setShowDemoPanel(true)}
                    className="emergency-demo-trigger"
                    title="Herramientas de Presentación"
                  >
                    <Wrench className="emergency-demo-trigger-icon" />
                  </button>
                )}

                {/* Demo Control panel */}
                <AnimatePresence>
                  {showDemoPanel && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="emergency-demo-panel"
                    >
                      <div className="emergency-demo-header">
                        <span>
                          <Wrench className="emergency-demo-header-icon" /> Consola de Telemetría
                        </span>
                        <button onClick={() => setShowDemoPanel(false)} className="emergency-demo-close">
                          <X className="emergency-demo-close-icon" />
                        </button>
                      </div>
                      
                      <div className="emergency-demo-sync">
                        <span>Sincronización GPRS</span>
                        <label className="emergency-demo-toggle">
                          <input 
                            type="checkbox" 
                            checked={syncDb}
                            onChange={(e) => setSyncDb(e.target.checked)}
                          />
                          <div className="emergency-demo-toggle-track" />
                        </label>
                      </div>

                      <div className="emergency-demo-actions">
                        <button
                          onClick={startSimulacionEnVivo}
                          disabled={simulando}
                          className={`emergency-demo-sim-btn ${simulando ? "active" : ""}`}
                        >
                          <Play className="emergency-demo-play" />
                          <span>{simulando ? "Simulación Activa" : "Simular Ruta GPRS"}</span>
                        </button>

                        <div className="emergency-demo-grid">
                          <button onClick={acercarTecnico} className="emergency-demo-pos-btn">
                            Acercar (100m)
                          </button>
                          <button onClick={alejarTecnico} className="emergency-demo-pos-btn">
                            Alejar (3km)
                          </button>
                        </div>
                      </div>

                      <div className="emergency-demo-footer">
                        <span>Base de Datos:</span>
                        <a 
                          href="https://backend-si2-taller-385056433848.us-central1.run.app/admin"
                          target="_blank"
                          rel="noreferrer"
                          className="emergency-demo-link"
                        >
                          SQLAdmin <ExternalLink className="emergency-demo-link-icon" />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ESTADO D: ATENDIDO (Arrival confirmation, trigger checkout) */}
            {incidente.estado === "atendido" && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                <div className="emergency-arrived-header">
                  <div className="emergency-arrived-icon">
                    <ShieldCheck className="emergency-arrived-shield" />
                  </div>
                  <h3 className="emergency-arrived-title">¡Mecánico Contigo!</h3>
                  <p className="emergency-arrived-subtitle">
                    El técnico ha arribado. Procede con el pago una vez finalizado el servicio.
                  </p>
                </div>

                <div className="emergency-info-card">
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Taller</span>
                    <span className="emergency-info-value">{incidente.taller_nombre}</span>
                  </div>
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Técnico</span>
                    <span className="emergency-info-value">{incidente.tecnico_asignado}</span>
                  </div>
                  <div className="emergency-info-row total">
                    <span className="emergency-info-label">Costo Total</span>
                    <span className="emergency-info-value price">Bs. {incidente.costo_final}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/dashboard/cliente/pago/${incidente.id}`)}
                  className="emergency-pay-btn"
                >
                  <Coins className="emergency-pay-icon" />
                  <span>Pagar ahora — Bs. {incidente.costo_final}</span>
                </button>
              </motion.div>
            )}

            {/* ESTADO E: PAGADO (Service completed with review) */}
            {incidente.estado === "pagado" && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                <div className="emergency-arrived-header">
                  <div className="emergency-arrived-icon success">
                    <CheckCircle className="emergency-arrived-shield" />
                  </div>
                  <h3 className="emergency-arrived-title">Servicio Completado</h3>
                  <p className="emergency-arrived-subtitle">
                    Taller: {incidente.taller_nombre}
                  </p>
                </div>

                <div className="emergency-info-card">
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Falla</span>
                    <span className="emergency-info-value">{incidente.categoria_ia || "Auxilio mecánico"}</span>
                  </div>
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Monto Pagado</span>
                    <span className="emergency-info-value price">Bs. {incidente.costo_final}</span>
                  </div>
                  <div className="emergency-info-row">
                    <span className="emergency-info-label">Fecha</span>
                    <span className="emergency-info-value mono">{new Date(incidente.fecha_reporte).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Rating section */}
                <div className="emergency-review-section">
                  {reviewCompleted || existingReview ? (
                    <div className="emergency-review-done">
                      <Star className="emergency-review-done-star" />
                      <span>¡Gracias por tu Calificación!</span>
                      <p className="emergency-review-done-comment">
                        &ldquo;{comentarioVal || existingReview?.comentario || "Calificación enviada."}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReview} className="emergency-review-form">
                      <span className="emergency-review-title">Calificar Taller</span>
                      
                      <div className="emergency-review-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            type="button"
                            whileHover={{ scale: 1.3, rotate: 12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setRatingVal(star)}
                            className="emergency-review-star-btn"
                          >
                            <Star className={`emergency-review-star-icon ${star <= ratingVal ? "filled" : ""}`} />
                          </motion.button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Ej. Trato excelente y solución veloz."
                        value={comentarioVal}
                        onChange={(e) => setComentarioVal(e.target.value)}
                        className="emergency-review-input"
                      />

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="emergency-review-submit"
                      >
                        {submittingReview ? "Enviando..." : "Enviar Calificación"}
                      </button>
                    </form>
                  )}
                </div>

                {(reviewCompleted || existingReview) && (
                  <button
                    onClick={() => router.push("/dashboard/cliente")}
                    className="emergency-home-btn"
                  >
                    <span>Volver al inicio</span>
                    <ChevronRight className="emergency-home-chevron" />
                  </button>
                )}
              </motion.div>
            )}

            {/* ESTADO F: CANCELADO */}
            {incidente.estado === "cancelado" && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="emergency-floating-panel"
              >
                <div className="emergency-arrived-header">
                  <div className="emergency-arrived-icon cancelled">
                    <XSquare className="emergency-arrived-shield" />
                  </div>
                  <h3 className="emergency-arrived-title">Emergencia Cancelada</h3>
                  <p className="emergency-arrived-subtitle">
                    Has cancelado este reporte. Puedes declarar una nueva emergencia desde tu pantalla principal.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/dashboard/cliente")}
                  className="emergency-home-btn"
                >
                  <span>Volver al inicio</span>
                  <ChevronRight className="emergency-home-chevron" />
                </button>
              </motion.div>
            )}

          </div>
        </div>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMsg.msg && (
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.95 }}
              className="emergency-toast-wrap"
            >
              <div className={`emergency-toast ${toastMsg.type}`}>
                <span>{toastMsg.msg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </RoleGuard>
  );
}
