"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { notificationService } from "@/services/notificationService";
import { offlineService } from "@/services/offlineService"; // offline helper
import { 
  AlertTriangle, 
  History, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  User,
  LogOut,
  Wifi,
  WifiOff,
  ChevronRight,
  Send,
  X,
  MessageSquare,
  Bot,
  Wrench,
  Battery,
  ShieldAlert,
  Gauge,
  Calendar,
  DollarSign
} from "lucide-react";

export default function ClienteDashboard() {
  const router = useRouter();
  
  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidents, setIncidents] = useState<Incidente[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  
  // User Profile
  const [clienteName, setClienteName] = useState<string>("Conductor");
  
  // Operational state
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [activeIncidentId, setActiveIncidentId] = useState<string | number | null>(null);

  // AI Diagnostic Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string; provider?: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Initialize initial assistant message based on active tenant
  useEffect(() => {
    if (activeTenant) {
      setChatMessages([
        { sender: "ai", text: `¡Hola! Soy tu asistente de Auxilio.AI (IA Gemini). ¿Tienes alguna consulta sobre tu vehículo, fallas mecánicas o quieres consultar tu historial en ${activeTenant.name}?` }
      ]);
    }
  }, [activeTenant]);

  // Initialize App Configuration
  useEffect(() => {
    const initApp = async () => {
      const tenantList = apiService.getTenants();
      setTenants(tenantList);

      const savedTenantId = localStorage.getItem("active_tenant_id");
      const matchedTenant = tenantList.find(t => t.id === savedTenantId) || tenantList[0];
      setActiveTenant(matchedTenant);

      const isLive = await checkBackendHealth();
      setIsBackendConnected(isLive);

      // Track online status
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

  // Fetch operational history
  const fetchData = async () => {
    if (!activeTenant) return;
    try {
      const incData = await apiService.getIncidentes(activeTenant.id);
      const wkData = await apiService.getTalleres(activeTenant.id);
      setIncidents(incData);
      setWorkshops(wkData);

      // Fetch user profile name
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const profile = await apiService.getPerfil(activeTenant.id);
          setClienteName(profile.nombre || "Conductor");
        } catch {
          setClienteName(localStorage.getItem("user_email")?.split("@")[0] || "Juan Pérez");
        }
      }

      // Check if there is an active incident in progress
      // (status !== 'pagado' && status !== 'cancelado')
      const activeInc = incData.find(i => 
        i.tenant_id === activeTenant.id && 
        i.estado !== "pagado" && 
        i.estado !== "cancelado"
      );

      const skipRedirect = sessionStorage.getItem("skip_active_redirect") === "true";

      if (activeInc) {
        setActiveIncidentId(activeInc.id);
        if (!skipRedirect) {
          // Automatic redirection to emergency tracking route
          router.push(`/dashboard/cliente/emergencia/${activeInc.id}`);
        }
      } else {
        setActiveIncidentId(null);
      }
    } catch (e) {
      console.error("Failed to sync customer main dashboard data", e);
    }
  };

  useEffect(() => {
    if (!activeTenant) return;
    fetchData();

    // Setup periodic polling interval to monitor status transitions
    const interval = setInterval(() => {
      if (!offlineMode) {
        fetchData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTenant, offlineMode]);

  // Connect to WebSocket for active incident to receive real-time push notifications
  useWebSocket({
    incidenteId: activeIncidentId,
    onEvent: (event, data) => {
      notificationService.handleEvent(event, data);
      fetchData();
    }
  });

  // Auto-sync listener registration when connection recovered
  useEffect(() => {
    if (!activeTenant) return;
    
    const handleOnline = async () => {
      const count = apiService.getOfflineQueueCount(activeTenant.id);
      if (count > 0) {
        const res = await apiService.syncOfflineIncidentes(activeTenant.id);
        if (res.synced > 0) {
          alert(`Sincronización automática completa: ${res.synced} reportes offline sincronizados.`);
          fetchData();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [activeTenant]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setActiveIncidentId(null);
      localStorage.setItem("active_tenant_id", tenantId);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await apiService.chatDiagnostico(activeTenant.id, userMsg);
      setChatMessages(prev => [...prev, { 
        sender: "ai", 
        text: response.respuesta,
        provider: response.proveedor
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        sender: "ai", 
        text: "Lo siento, ocurrió un error al comunicarme con el motor de IA de Gemini. Inténtalo de nuevo más tarde." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9] text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-[#10b981] animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Iniciando Consola de Auxilio...</p>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => 
    i.tenant_id === activeTenant.id && 
    i.estado !== "pagado" && 
    i.estado !== "cancelado"
  );

  const historicIncidents = incidents.filter(i => 
    i.tenant_id === activeTenant.id && 
    (i.estado === "pagado" || i.estado === "cancelado")
  );

  return (
    <RoleGuard allowedRoles={["cliente"]}>
      <div className="min-h-screen w-full overflow-x-hidden bg-[#f8faf9] text-slate-800 font-sans antialiased overflow-y-auto flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative">
        
        {/* Offline Indicator global banner */}
        {(!isOnline || offlineMode) && (
          <div className="w-full bg-amber-500 text-zinc-950 px-4 py-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse z-50 sticky top-0 shadow-sm">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Sin conexión — reporte local activo</span>
          </div>
        )}

        {/* Decorative background gradients */}
        <div className="absolute top-[-5%] left-[-10%] w-[35%] h-[35%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-[#10b981]/3 rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-20">
          <Header
            tenants={tenants}
            activeTenant={activeTenant}
            onTenantChange={handleTenantChange}
            activeRole="cliente"
            isBackendConnected={isBackendConnected}
            offlineMode={offlineMode}
            onOfflineModeToggle={handleOfflineToggle}
          />
        </div>

        {/* Main Panel Content */}
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 z-10 flex flex-col gap-6 justify-center animate-fadeIn">
          
          {/* Greeting Area */}
          <div className="text-center space-y-1">
            <p className="text-[#047857] text-[10px] font-black uppercase tracking-widest">Auxilio Vial</p>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Hola, <span className="text-[#10b981] capitalize">{clienteName}</span>
            </h2>
          </div>

          {/* Active Incident Alert Banner */}
          {activeIncidentId && (
            <button
              onClick={() => {
                sessionStorage.removeItem("skip_active_redirect");
                router.push(`/dashboard/cliente/emergencia/${activeIncidentId}`);
              }}
              className="w-full flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-3xl hover:bg-amber-500/15 transition-all text-xs font-bold uppercase tracking-wide cursor-pointer shadow-sm animate-pulse"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tienes un reporte en curso</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-700 font-extrabold">
                Ver Estado <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}

          {/* SOS RADIUS RADAR HUB & BUTTON (Borderless & integrated) */}
          <div className="flex flex-col items-center gap-4 py-4 relative">
            {/* Pulse glow background effect */}
            {!activeIncidentId && (
              <div className="absolute w-44 h-44 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none animate-pulse" />
            )}
            
            <div className="relative flex items-center justify-center">
              {/* Pulsing circular outer rings */}
              {!activeIncidentId && (
                <>
                  <div className="absolute w-36 h-36 border border-emerald-500/10 rounded-full animate-ping pointer-events-none" style={{ animationDuration: "3.5s" }} />
                  <div className="absolute w-28 h-28 border border-emerald-500/20 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: "2.5s" }} />
                </>
              )}

              {activeIncidentId ? (
                <button
                  onClick={() => {
                    sessionStorage.removeItem("skip_active_redirect");
                    router.push(`/dashboard/cliente/emergencia/${activeIncidentId}`);
                  }}
                  className="w-28 h-28 bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-full flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer border-4 border-white z-10 animate-pulse font-black text-xs text-center"
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                  <span className="text-[10px] tracking-tight uppercase leading-none px-1">Ver Reporte</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    sessionStorage.removeItem("skip_active_redirect");
                    router.push("/dashboard/cliente/reportar");
                  }}
                  className="w-28 h-28 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-full flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all cursor-pointer border-4 border-white z-10 font-black text-sm"
                >
                  <span className="text-xl font-black tracking-widest text-white leading-none">SOS</span>
                  <span className="text-[8px] font-bold tracking-wider uppercase leading-none opacity-90 text-white">Pedir Auxilio</span>
                </button>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-500 max-w-[240px] leading-normal">
              {activeIncidentId 
                ? "Tu solicitud está siendo procesada. Presiona arriba para ver detalles." 
                : "Presiona SOS para reportar una emergencia mecánica de inmediato."}
            </p>
          </div>

          {/* Quick Actions Horizontal Carousel (Highly mobile-friendly!) */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Accesos Rápidos
              </span>
              <span className="text-[9px] text-[#047857] font-black uppercase tracking-wider">
                Desliza para ver más
              </span>
            </div>
            
            {/* Horizontal Scroll Wrapper */}
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 snap-x no-scrollbar scroll-smooth">
              {[
                {
                  title: "Falla Motor",
                  desc: "Auto detenido o sobrecalentado",
                  icon: Wrench,
                  color: "text-red-600 bg-red-50 hover:bg-red-100/70 border border-red-100",
                  actionDesc: "Falla de motor o transmisión, el auto no avanza."
                },
                {
                  title: "Llanta Pinchada",
                  desc: "Cambio de neumático en ruta",
                  icon: Gauge,
                  color: "text-blue-600 bg-blue-50 hover:bg-blue-100/70 border border-blue-100",
                  actionDesc: "Neumático pinchado o dañado, requiere auxilio mecánico."
                },
                {
                  title: "Batería Muerta",
                  desc: "Paso de corriente o carga",
                  icon: Battery,
                  color: "text-amber-600 bg-amber-50 hover:bg-amber-100/70 border border-amber-100",
                  actionDesc: "Vehículo descargado o con fallas eléctricas, no arranca."
                },
                {
                  title: "Choque Vial",
                  desc: "Colisión o incidente de tráfico",
                  icon: ShieldAlert,
                  color: "text-rose-600 bg-rose-50 hover:bg-rose-100/70 border border-rose-100",
                  actionDesc: "Colisión o siniestro de tránsito en la vía."
                }
              ].map((act, idx) => {
                const Icon = act.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      sessionStorage.removeItem("skip_active_redirect");
                      router.push(`/dashboard/cliente/reportar?descripcion=${encodeURIComponent(act.actionDesc)}`);
                    }}
                    className={`flex-shrink-0 w-36 snap-start p-3.5 rounded-3xl text-left flex flex-col items-start gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm ${act.color}`}
                  >
                    <div className="p-2 rounded-xl bg-white/80 shrink-0 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-[11px] block text-slate-800 leading-tight">{act.title}</span>
                      <span className="text-[9px] opacity-75 leading-tight block text-slate-500 mt-0.5">{act.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Incident List (Shown only if there are active cases) */}
          {activeIncidents.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest px-1">
                Reportes Activos ({activeIncidents.length})
              </span>
              <div className="divide-y divide-[#e6f4ed] bg-white rounded-3xl shadow-sm border border-[#e6f4ed] overflow-hidden">
                {activeIncidents.map(inc => (
                  <div
                    key={inc.id}
                    onClick={() => {
                      sessionStorage.removeItem("skip_active_redirect");
                      router.push(`/dashboard/cliente/emergencia/${inc.id}`);
                    }}
                    className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block">{inc.vehiculo_modelo}</span>
                      <p className="text-[10px] text-slate-500">
                        Placa: {inc.vehiculo_placa} • {new Date(inc.fecha_reporte).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {inc.estado === "pendiente" ? "Pendiente" : inc.estado === "en_camino" ? "En Camino" : "Atendido"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency History (Clean flat list view, borderless design) */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest px-1">
              Historial de Asistencias ({historicIncidents.length})
            </span>

            {historicIncidents.length === 0 ? (
              <div className="py-6 text-center bg-white rounded-3xl border border-[#e6f4ed] text-xs text-slate-400 italic shadow-sm">
                Ningún auxilio registrado en tu historial.
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-[#e6f4ed] divide-y divide-[#e6f4ed] overflow-hidden max-h-[280px] overflow-y-auto custom-scrollable">
                {historicIncidents.map((inc, index) => {
                  const isSuccess = inc.estado === "pagado";
                  return (
                    <div 
                      key={inc.id} 
                      className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs transition-all cursor-pointer"
                      onClick={() => {
                        sessionStorage.setItem("skip_active_redirect", "true");
                        router.push(`/dashboard/cliente/emergencia/${inc.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Circular status indicator icon */}
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                          isSuccess ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          <History className="w-4 h-4" />
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-[13px] truncate">{inc.vehiculo_modelo}</span>
                            <span className="font-mono text-slate-400 text-[9px] font-bold uppercase">{inc.vehiculo_placa}</span>
                          </div>
                          {inc.descripcion ? (
                            <p className="text-slate-500 text-[10px] truncate max-w-[200px] mt-0.5">
                              {inc.descripcion}
                            </p>
                          ) : (
                            <p className="text-slate-400 text-[10px] italic mt-0.5">Sin descripción</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[9px] font-bold text-slate-400">
                          {new Date(inc.fecha_reporte).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                        {isSuccess && inc.costo_final ? (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-black text-[9px]">
                            {inc.costo_final} BOB
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold text-[9px]">
                            Cancelado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </main>

        {/* Floating Chat Trigger Button */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full shadow-lg shadow-[var(--primary)]/30 transition-all hover:scale-105 border-none cursor-pointer relative"
            title="Diagnóstico con IA"
          >
            {chatOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse text-white" />}
          </button>
        </div>

        {/* Chat Drawer / Popover Window (Matching light theme) */}
        {chatOpen && (
          <div className="fixed bottom-24 right-6 z-40 w-[350px] max-w-[90vw] h-[480px] bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn text-xs">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-650" />
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-800 uppercase tracking-tight text-[11px] leading-none">Asistente Diagnóstico IA</h5>
                  <span className="text-[9px] text-emerald-600 font-medium tracking-wide">Powered by Gemini AI</span>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 border-none text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollable bg-slate-50/30">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-3 max-w-[85%] rounded-3xl leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-slate-100 border border-slate-200/50 text-slate-700 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.provider && (
                    <span className="text-[8px] text-slate-400 mt-1 font-mono uppercase">
                      Motor: {msg.provider}
                    </span>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-400 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px] font-medium tracking-wide animate-pulse">Gemini está analizando...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu consulta o pregunta..."
                className="flex-1 px-3 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-slate-800 placeholder:text-slate-400 transition-colors"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center border-none transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Footer info line */}
        <footer className="w-full py-6 text-center text-[10px] text-slate-400 z-10 border-t border-[#e6f4ed] bg-[#f8faf9]">
          <p>© 2026 Auxilio.AI</p>
        </footer>

      </div>
    </RoleGuard>
  );
}
