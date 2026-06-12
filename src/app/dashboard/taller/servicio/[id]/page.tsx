"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import { TechGPSUpdater } from "@/components/TechGPSUpdater";
import { 
  ChevronLeft, 
  MapPin, 
  Car, 
  Phone, 
  DollarSign, 
  Coins,
  RefreshCw, 
  User, 
  CheckCircle, 
  Navigation,
  ShieldCheck,
  TrendingUp,
  Percent,
  Award
} from "lucide-react";

// Dynamic import for SimpleMap to avoid SSR errors
const SimpleMap = dynamic(
  () => import("../../solicitud/[id]/SimpleMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[var(--bg-raised)] flex items-center justify-center rounded-3xl border border-[var(--border)]">
        <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ServicioActivo({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();
  const incidentId = routeParams.id as string;

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingState, setUpdatingState] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Geolocation transmission states
  const [gpsSending, setGpsSending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Initialize
  useEffect(() => {
    const initApp = async () => {
      const tenantList = apiService.getTenants();
      setTenants(tenantList);

      const tokenTenantId = apiService.getAuthTenantId();
      const savedTenantId = tokenTenantId || localStorage.getItem("active_tenant_id");
      const matchedTenant = tenantList.find(t => t.id === savedTenantId) || tenantList[0];
      setActiveTenant(matchedTenant);
      if (matchedTenant) {
        localStorage.setItem("active_tenant_id", matchedTenant.id);
      }

      const isLive = await checkBackendHealth();
      setIsBackendConnected(isLive);
      setLoading(false);
    };
    initApp();
  }, []);

  // Fetch incident details
  const fetchServiceDetails = async () => {
    if (!activeTenant) return;
    try {
      const matchInc = await apiService.getIncidente(activeTenant.id, incidentId);
      setIncidente(matchInc);

      const wkList = await apiService.getTalleres(activeTenant.id);
      setWorkshops(wkList);
      if (matchInc.taller_asignado_id) {
        const wkMatch = wkList.find(w => w.id === matchInc.taller_asignado_id);
        if (wkMatch) setSelectedWorkshop(wkMatch);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchServiceDetails();
    }
  }, [activeTenant]);

  // Periodic polling for status changes (e.g. client completed Stripe payment)
  useEffect(() => {
    if (!activeTenant) return;

    const interval = setInterval(() => {
      if (!offlineMode) {
        fetchServiceDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTenant, offlineMode]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setIncidente(null);
      localStorage.setItem("active_tenant_id", tenantId);
      router.push("/dashboard/taller");
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

  // Change state
  const handleUpdateState = async (nextStatus: string) => {
    if (!activeTenant || !incidente) return;
    setUpdatingState(true);
    try {
      await apiService.updateServicioEstado(activeTenant.id, incidente.id, nextStatus);
      if (nextStatus === "pagado") {
        showToast("Servicio marcado como completado. Esperando pago del cliente...");
      } else {
        showToast(`Servicio actualizado al estado: ${nextStatus}`);
      }
      await fetchServiceDetails();
    } catch (e) {
      showToast("Error al guardar estado de servicio.");
    } finally {
      setUpdatingState(false);
    }
  };

  // Manual GPS update trigger
  const handleManualGPSUpdate = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsMessage({ type: "error", msg: "La geolocalización no está soportada por tu navegador." });
      return;
    }
    
    setGpsSending(true);
    setGpsMessage({ type: "", msg: "" });

    const optionsHigh = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
    const optionsCoarse = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!activeTenant || !incidente) {
          setGpsSending(false);
          return;
        }
        try {
          await apiService.updateTecnicoUbicacion(
            activeTenant.id, 
            incidente.tecnico_id || "tech_01", 
            pos.coords.latitude, 
            pos.coords.longitude
          );
          setGpsMessage({ type: "success", msg: "Ubicación técnica enviada al mapa del cliente." });
          setTimeout(() => setGpsMessage({ type: "", msg: "" }), 4000);
          await fetchServiceDetails();
        } catch {
          setGpsMessage({ type: "error", msg: "Error al registrar coordenadas en el servidor." });
        } finally {
          setGpsSending(false);
        }
      },
      (err) => {
        console.warn("High accuracy GPS failed, attempting low accuracy coarse location...", err);
        navigator.geolocation.getCurrentPosition(
          async (posFallback) => {
            if (!activeTenant || !incidente) {
              setGpsSending(false);
              return;
            }
            try {
              await apiService.updateTecnicoUbicacion(
                activeTenant.id, 
                incidente.tecnico_id || "tech_01", 
                posFallback.coords.latitude, 
                posFallback.coords.longitude
              );
              setGpsMessage({ type: "success", msg: "Ubicación técnica enviada (Precisión Red)." });
              setTimeout(() => setGpsMessage({ type: "", msg: "" }), 4000);
              await fetchServiceDetails();
            } catch {
              setGpsMessage({ type: "error", msg: "Error al enviar coordenadas de red." });
            } finally {
              setGpsSending(false);
            }
          },
          (errFallback) => {
            console.error("Coarse location also failed", errFallback);
            setGpsMessage({ type: "error", msg: "No se pudieron obtener coordenadas GPS." });
            setGpsSending(false);
          },
          optionsCoarse
        );
      },
      optionsHigh
    );
  };

  if (loading || !activeTenant || !incidente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Cargando Seguimiento...</p>
      </div>
    );
  }

  // Stepper logic
  const steps = ["en_camino", "atendido", "pagado"];
  const currentStepIndex = steps.indexOf(incidente.estado === "pendiente" || incidente.estado === "clasificado" || incidente.estado === "cotizado" ? "en_camino" : incidente.estado);

  // Financial calculations
  const grossAmount = incidente.costo_final || 150;
  const platformFee = Math.round(grossAmount * 0.1 * 100) / 100;
  const netEarnings = Math.round((grossAmount - platformFee) * 100) / 100;

  return (
    <RoleGuard allowedRoles={["taller"]}>
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] font-sans antialiased flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative">
        
        {/* Toast alert popup banner */}
        {toastMsg && (
          <div className="fixed bottom-20 sm:bottom-auto sm:top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 bg-emerald-600/95 backdrop-blur-md border border-emerald-500 text-white p-4 rounded-2xl text-[10.5px] font-black uppercase tracking-wider shadow-2xl flex items-center justify-center text-center gap-2 w-11/12 max-w-xs animate-slideIn">
            <CheckCircle className="w-4 h-4 shrink-0 text-white" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Glow decorative orbs */}
        <div className="absolute top-[-5%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-20">
          <Header
            tenants={tenants}
            activeTenant={activeTenant}
            onTenantChange={handleTenantChange}
            activeRole="taller"
            isBackendConnected={isBackendConnected}
            offlineMode={offlineMode}
            onOfflineModeToggle={handleOfflineToggle}
          />
        </div>

        {/* Main Panel Content */}
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 z-10 flex flex-col gap-6 animate-fadeIn">
          
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/taller")}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-xs font-black uppercase tracking-wider border-none bg-transparent cursor-pointer self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Consola Principal</span>
          </button>

          {/* SECCIÓN 1: ESTADO ACTUAL DEL SERVICIO (Stepper) */}
          <div className="glass-panel p-5 border border-[var(--border)] rounded-[24px] shrink-0 select-none bg-white">
            <div className="flex items-center justify-between relative max-w-xs mx-auto">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--border)] -z-10" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--primary)] -z-10 transition-all duration-700" 
                style={{
                  width: `${currentStepIndex >= 0 ? (currentStepIndex / (steps.length - 1)) * 100 : 0}%`
                }}
              />

              {steps.map((st, sIdx) => {
                const isDone = sIdx < currentStepIndex || incidente.estado === "pagado";
                const isCurrent = sIdx === currentStepIndex && incidente.estado !== "pagado";
                const stepLabel = 
                  st === "en_camino" ? "En Camino" :
                  st === "atendido" ? "Atención" : "Finalizado";

                return (
                  <div key={st} className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all duration-300 ${
                      isDone ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                      isCurrent ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse" :
                      "bg-slate-100 border-slate-200 text-slate-400"
                    }`}>
                      {sIdx + 1}
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                      isCurrent ? "text-[var(--primary)]" : isDone ? "text-emerald-600" : "text-slate-400"
                    }`}>{stepLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper dynamic status badge */}
          <div className="flex items-center justify-between bg-white border border-[var(--border)] p-3 px-4.5 rounded-[16px] text-xs shrink-0 select-none shadow-sm">
            <span className="text-[var(--text-secondary)] font-bold uppercase text-[9px] tracking-wider">Estado de Operación</span>
            <span className={`status-pill !text-[8px] !py-0.5 !px-2 ${
              incidente.estado === "pagado" ? "status-pill-success" : incidente.estado === "atendido" ? "status-pill-accent" : "status-pill-warning animate-pulse"
            }`}>
              {incidente.estado === "pagado" ? "Completado ✓" : incidente.estado === "atendido" ? "En Atención" : "Técnico Despachado"}
            </span>
          </div>

          {/* SECCIÓN 2: DATOS DEL CLIENTE */}
          <div className="glass-panel p-6 border border-[var(--border)] rounded-[24px] space-y-4 shadow-2xl relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none blur-xl" />
            
            <h4 className="label-caps !text-[9px] border-b border-[var(--border)] pb-2 text-[var(--text-muted)]">Información del Cliente</h4>
            <div className="space-y-3.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-[var(--text)] text-[13px]">{incidente.cliente_nombre}</p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-0.5">Vehículo: {incidente.vehiculo_modelo}</p>
                </div>
                
                {incidente.cliente_telefono && (
                  <a
                    href={`tel:${incidente.cliente_telefono}`}
                    className="p-3 rounded-xl bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all flex items-center justify-center shadow-sm"
                  >
                    <Phone className="w-4 h-4 text-[var(--text-secondary)]" />
                  </a>
                )}
              </div>

              <div className="bg-slate-50 border border-[var(--border)] p-3 rounded-[12px] flex items-center justify-between">
                <div>
                  <span className="text-[var(--text-muted)] font-bold uppercase text-[8px] block">Placa</span>
                  <span className="font-mono text-[var(--text)] text-[11px] mt-0.5 block">{incidente.vehiculo_placa || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] font-bold uppercase text-[8px] block">Problema</span>
                  <span className="font-bold text-[var(--text)] text-[11px] mt-0.5 block capitalize">{incidente.categoria_ia || "Auxilio Mecánico"}</span>
                </div>
              </div>
            </div>

            {/* Ubicación en mapa del cliente */}
            <div className="w-full h-40 rounded-2xl overflow-hidden border border-[var(--border)] relative mt-3 z-0 pointer-events-none">
              <SimpleMap lat={incidente.latitude} lng={incidente.longitude} />
            </div>
          </div>

          {/* SECCIÓN 3: TÉCNICO ASIGNADO Y GPS UPDATER */}
          <div className="glass-panel p-6 border border-[var(--border)] rounded-[24px] space-y-4 shadow-2xl bg-white">
            <h4 className="label-caps !text-[9px] border-b border-[var(--border)] pb-2 text-[var(--text-muted)]">Técnico Mecánico Asignado</h4>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center font-black text-xs uppercase shadow-md shadow-emerald-600/20 shrink-0">
                  {incidente.tecnico_asignado ? incidente.tecnico_asignado.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "MT"}
                </div>
                <div>
                  <p className="font-extrabold text-[var(--text)] text-[13px]">{incidente.tecnico_asignado || "Ignacio Herrera"}</p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-0.5">Taller: {selectedWorkshop?.nombre}</p>
                </div>
              </div>

              {incidente.estado === "en_camino" && (
                <button
                  onClick={handleManualGPSUpdate}
                  disabled={gpsSending}
                  className="py-2 px-3 bg-white hover:bg-slate-100 border border-[var(--border)] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer transition-all flex items-center gap-1 shrink-0"
                >
                  {gpsSending ? (
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--primary)] animate-spin shrink-0" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                  )}
                  <span>{gpsSending ? "Enviando..." : "Enviar GPS"}</span>
                </button>
              )}
            </div>

            {gpsMessage.msg && (
              <p className={`text-[10px] font-bold uppercase tracking-wider text-center py-2.5 px-3.5 rounded-xl border animate-fadeIn ${
                gpsMessage.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {gpsMessage.msg}
              </p>
            )}

            {/* SATELITAL GPS UPDATER BACKGROUND SYSTEM COMPONENT */}
            <TechGPSUpdater
              tenantId={activeTenant.id}
              tecnicoId={incidente.tecnico_id || "tech_01"}
              serviceEstado={incidente.estado}
            />

          </div>

          {/* SECCIÓN 4: ACCIONES DEL TALLER SEGÚN ESTADO */}
          <div className="mt-2 shrink-0">
            
            {/* ESTADO A: EN_CAMINO */}
            {(incidente.estado === "pendiente" || incidente.estado === "clasificado" || incidente.estado === "cotizado" || incidente.estado === "en_camino" || incidente.estado === "en_proceso" || incidente.estado === "sin_tecnico") && (
              <button
                onClick={() => handleUpdateState("atendido")}
                disabled={updatingState}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 border-none cursor-pointer hover:scale-102 transition-all"
              >
                <CheckCircle className="w-4.5 h-4.5 text-white" />
                <span>Llegué al cliente — Iniciar atención</span>
              </button>
            )}

            {/* ESTADO B: ATENDIDO (In attention, complete service) */}
            {incidente.estado === "atendido" && (
              <button
                onClick={() => handleUpdateState("pagado")}
                disabled={updatingState}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 border-none cursor-pointer hover:scale-102 transition-all"
              >
                <CheckCircle className="w-4.5 h-4.5 text-white" />
                <span>Servicio completado — Finalizar</span>
              </button>
            )}

            {/* ESTADO C: PAGADO (completed, billing log summary) */}
            {incidente.estado === "pagado" && (
              <div className="glass-panel p-6 border border-emerald-500/10 bg-emerald-500/2 rounded-[24px] space-y-6 shadow-2xl animate-scaleUp bg-white">
                
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/15">
                    <Award className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-black text-[var(--text)] uppercase tracking-wider">¡Servicio Completado!</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                    El chofer ha pagado la cotización acordada de manera segura. A continuación, el resumen financiero de ganancias.
                  </p>
                </div>

                <div className="bg-slate-50 border border-[var(--border)] p-4.5 rounded-2xl text-xs space-y-3.5 text-[var(--text-secondary)] font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)] font-bold uppercase text-[9px] flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Monto Cobrado
                    </span>
                    <span className="font-extrabold text-[var(--text)] font-mono text-[13px]">Bs. {grossAmount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)] font-bold uppercase text-[9px] flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Comisión Plataforma (10%)
                    </span>
                    <span className="font-bold text-red-500 font-mono text-[12px]">-Bs. {platformFee}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-[var(--border)] pt-3 text-sm">
                    <span className="font-black text-[var(--text)] uppercase text-[10px] flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" /> Ganancia Neta Taller
                    </span>
                    <span className="font-black text-emerald-600 font-mono text-base">Bs. {netEarnings}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/dashboard/taller")}
                  className="w-full py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border-none cursor-pointer hover:scale-102 transition-all shadow-lg"
                >
                  <span>Volver al Dashboard</span>
                </button>

              </div>
            )}

          </div>

        </main>

        {/* Footer info line */}
        <footer className="w-full py-6 text-center text-[10px] text-[var(--text-muted)] z-10 border-t border-[var(--border)] bg-[var(--bg)]/80">
          <p>© 2026 Auxilio.AI</p>
        </footer>

      </div>
    </RoleGuard>
  );
}
