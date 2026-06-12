"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import { FormattedText } from "@/components/FormattedText";
import { useWebSocket } from "@/hooks/useWebSocket";
import { 
  Wrench, 
  MapPin, 
  DollarSign, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  Play,
  CheckCircle,
  TrendingUp,
  Activity,
  Zap,
  User,
  Power,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  List,
  Map as MapIcon,
  BarChart2,
  History,
  Phone,
  Radio,
  Star,
  Users,
  Trash2
} from "lucide-react";

// Dynamic import for InteractiveMap to avoid Leaflet SSR errors
const InteractiveMap = dynamic(
  () => import("@/components/InteractiveMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#f8faf9] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

export default function TallerDashboard() {
  const router = useRouter();

  // Navigation states
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Solicitudes Lists
  const [pendingIncidents, setPendingIncidents] = useState<Incidente[]>([]);
  const [activeJobs, setActiveJobs] = useState<Incidente[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Interactive selection
  const [selectedIncident, setSelectedIncident] = useState<Incidente | null>(null);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "alert" | "success" }[]>([]);

  // Push notification helper
  const addToast = (msg: string, type: "alert" | "success" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // WebSocket message receiver
  const handleWebSocketEvent = useCallback((event: string, data: any) => {
    if (event === "nueva_solicitud") {
      addToast("Nueva alerta de emergencia registrada en tu zona!", "alert");
      if (data.incidente) {
        setPendingIncidents(prev => {
          const exists = prev.some(i => i.id.toString() === data.incidente.id.toString());
          if (exists) return prev;
          return [data.incidente, ...prev];
        });
      }
    } else if (event === "cotizacion_aceptada") {
      addToast("Tu cotización fue aceptada! Técnico en camino.", "success");
      // Redirect directly to the active service tracking screen
      if (data.incidente_id) {
        router.push(`/dashboard/taller/servicio/${data.incidente_id}`);
      }
    } else if (event === "pago_completado") {
      addToast("Pago del cliente recibido con éxito. Servicio facturado.", "success");
      fetchData();
    }
  }, [router]);

  // Hook ws/taller/{taller_id}
  useWebSocket({
    tallerId: selectedWorkshop?.id,
    onEvent: handleWebSocketEvent
  });

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
      
      // Request native Web Push Notification permissions and sync subscription (only if already granted to prevent mobile gestures block)
      try {
        const { notificationService } = await import("@/services/notificationService");
        await notificationService.registerPushSubscription(matchedTenant.id, true);
      } catch (e) {
        console.error("Error registering push notifications on workshop init:", e);
      }

      setLoading(false);
    };
    initApp();
  }, []);

  // Technician Management states and functions
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [techList, setTechList] = useState<any[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");
  const [techActionLoading, setTechActionLoading] = useState(false);

  const fetchTechnicians = async () => {
    if (!activeTenant) return;
    try {
      const list = await apiService.getTecnicos(activeTenant.id);
      // Filter list to only show this workshop's technicians if logged in as a workshop user
      if (selectedWorkshop) {
        setTechList(list.filter(t => t.taller_id === selectedWorkshop.id));
      } else {
        setTechList(list);
      }
    } catch (e) {
      console.error("Failed to fetch technicians:", e);
    }
  };

  useEffect(() => {
    if (isTechModalOpen && activeTenant) {
      fetchTechnicians();
    }
  }, [isTechModalOpen, activeTenant, selectedWorkshop]);

  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !newTechName || !newTechPhone) return;
    setTechActionLoading(true);
    try {
      await apiService.createTecnico(activeTenant.id, {
        nombre: newTechName,
        telefono: newTechPhone,
        disponible: true
      });
      setNewTechName("");
      setNewTechPhone("");
      await fetchTechnicians();
      fetchData(); // Refresh main dashboard KPIs
      addToast("Técnico registrado con éxito.", "success");
    } catch (err) {
      console.error(err);
      addToast("Error al registrar técnico.", "alert");
    } finally {
      setTechActionLoading(false);
    }
  };

  const handleToggleTech = async (techId: string) => {
    if (!activeTenant) return;
    try {
      await apiService.toggleTecnicoDisponibilidad(activeTenant.id, techId);
      await fetchTechnicians();
      fetchData();
      addToast("Disponibilidad del técnico actualizada.", "success");
    } catch (err) {
      console.error(err);
      addToast("Error al actualizar disponibilidad.", "alert");
    }
  };

  const handleDeleteTech = async (techId: string) => {
    if (!activeTenant || !window.confirm("¿Está seguro de eliminar a este técnico?")) return;
    try {
      await apiService.deleteTecnico(activeTenant.id, techId);
      await fetchTechnicians();
      fetchData();
      addToast("Técnico eliminado.", "success");
    } catch (err) {
      console.error(err);
      addToast("Error al eliminar técnico.", "alert");
    }
  };

  // Fetch telemetry operational data
  const fetchData = async () => {
    if (!activeTenant) return;
    try {
      const isLive = await checkBackendHealth();
      setIsBackendConnected(isLive);

      // Fetch workshops in tenant
      const wkData = await apiService.getTalleres(activeTenant.id);
      setWorkshops(wkData);

      let currentWk = selectedWorkshop;
      if (wkData.length > 0) {
        if (selectedWorkshop) {
          const match = wkData.find(w => w.id === selectedWorkshop.id);
          if (match) currentWk = match;
        } else {
          const userEmail = typeof window !== "undefined" ? localStorage.getItem("user_email") : null;
          const matchByEmail = wkData.find(w => w.email === userEmail);
          currentWk = matchByEmail || wkData[0];
          setSelectedWorkshop(currentWk);
        }
      }

      // Fetch requests from API
      const allIncidents = await apiService.getSolicitudes(activeTenant.id);
      
      // Categorize
      const pending = allIncidents.filter(i => 
        i.estado === "pendiente" || 
        i.estado === "clasificado" || 
        i.estado === "cotizado"
      );
      setPendingIncidents(pending);

      if (currentWk) {
        const active = allIncidents.filter(i => 
          i.taller_asignado_id && i.taller_asignado_id.toString() === currentWk.id.toString() && 
          (i.estado === "en_camino" || i.estado === "atendido" || i.estado === "en_proceso" || i.estado === "sin_tecnico")
        );
        setActiveJobs(active);

        // Fetch completed count
        const history = await apiService.getTallerHistorial(activeTenant.id);
        setCompletedJobsCount(history.filter(i => i.taller_asignado_id && i.taller_asignado_id.toString() === currentWk.id.toString() && i.estado === "pagado").length);
      }

      // Fetch workshop specific dashboard data
      try {
        const dashData = await apiService.getTallerDashboard(activeTenant.id);
        setDashboardData(dashData);
      } catch (dashError) {
        console.error("Failed to fetch workshop dashboard KPIs:", dashError);
      }
    } catch (e) {
      console.error("Failed to sync workshop console data", e);
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
  }, [activeTenant, offlineMode, selectedWorkshop?.id]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setSelectedIncident(null);
      setSelectedWorkshop(null);
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

  // Mark job as attended
  const handleMarkAsAttended = async (incidenteId: string | number) => {
    if (!activeTenant) return;
    try {
      await apiService.updateServicioEstado(activeTenant.id, incidenteId, "atendido");
      addToast("Servicio marcado como: Técnico en sitio atendiendo.", "success");
      router.push(`/dashboard/taller/servicio/${incidenteId}`);
    } catch (e) {
      addToast("Error al actualizar estado de servicio", "alert");
    }
  };

  if (loading || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9] text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Iniciando Consola de Taller...</p>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["taller"]}>
      <div className="h-screen w-full bg-[#f8faf9] text-slate-800 font-sans antialiased overflow-hidden flex flex-col selection:bg-emerald-600 selection:text-white relative">
        
        {/* WebSocket Push Toast Area */}
        <div className="fixed bottom-20 sm:bottom-auto sm:top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[2000] flex flex-col gap-2 w-11/12 max-w-sm">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border text-xs font-bold uppercase tracking-wide shadow-2xl flex items-center gap-3 animate-slideIn ${
                t.type === "alert" 
                  ? "bg-red-50 border-red-200/50 text-red-700" 
                  : "bg-emerald-50 border-emerald-200/50 text-emerald-700"
              }`}
            >
              <Radio className={`w-4.5 h-4.5 shrink-0 ${t.type === "alert" ? "animate-pulse" : "animate-spin text-emerald-600"}`} />
              <span>{t.msg}</span>
            </div>
          ))}
        </div>

        {/* Header bar */}
        <div className="w-full z-[1000] relative shrink-0">
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

        {/* Map Workspace (Full Screen Background) */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col">
          
          {/* Draggable Map Canvas in Background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <InteractiveMap
              incidents={pendingIncidents}
              workshops={workshops}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
              }}
            />
          </div>

          {/* Floating Navigation Pill */}
          <div className="absolute top-4 left-4 right-4 md:left-auto md:right-6 z-20 flex justify-center md:block pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md border border-emerald-100/40 p-1.5 rounded-2xl flex items-center gap-1 shadow-lg">
              <button 
                onClick={() => router.push("/dashboard/taller")}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-white border-none cursor-pointer shadow-md shadow-emerald-600/10"
              >
                <Wrench className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button 
                onClick={() => router.push("/dashboard/taller/historial")}
                className="px-3.5 py-2 rounded-xl hover:bg-slate-50/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <History className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Historial</span>
              </button>
              <button 
                onClick={() => router.push("/dashboard/taller/kpis")}
                className="px-3.5 py-2 rounded-xl hover:bg-slate-50/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Métricas</span>
              </button>
              <button 
                onClick={() => setIsTechModalOpen(true)}
                className="px-3.5 py-2 rounded-xl hover:bg-slate-50/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mecánicos</span>
              </button>
            </div>
          </div>

          {/* Copyright overlay on map */}
          <div className="absolute bottom-3 right-3 z-10 hidden md:block bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none pointer-events-none">
            © 2026 Auxilio.AI
          </div>

          {/* FLOATING OPERATIONS CONTROL PANEL (Uber style) */}
          <div 
            className={`z-10 w-full md:w-[400px] fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:top-4 md:left-6 bg-white/95 backdrop-blur-md border-t md:border border-emerald-100/30 shadow-2xl rounded-t-3xl md:rounded-3xl p-5 flex flex-col gap-4 overflow-hidden transition-all duration-300 pointer-events-auto ${
              isPanelCollapsed ? "h-[75px] md:h-[75px]" : "h-[60vh] md:h-[calc(100vh-120px)]"
            }`}
          >
            {/* Drawer Header (Clickable to Toggle Collapse) */}
            <div 
              className="w-full flex items-center justify-between border-b border-slate-100 pb-2.5 cursor-pointer shrink-0 select-none"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectedWorkshop && (
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                    <img src={selectedWorkshop.imagen} alt={selectedWorkshop.nombre} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider truncate leading-tight">
                    {selectedWorkshop ? selectedWorkshop.nombre : "Consola de Taller"}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                    Panel de Despacho
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors border-none bg-transparent cursor-pointer">
                  {isPanelCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded Content Section */}
            {!isPanelCollapsed && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollable animate-fadeIn">

                {/* Taller Dashboard KPIs Block */}
                {dashboardData && (
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-[var(--border)] p-3 rounded-2xl shrink-0 select-none">
                    <div className="text-center space-y-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Ingreso Neto</span>
                      <span className="text-[11px] font-black text-emerald-600 font-mono block">Bs. {dashboardData.kpis.ingresos_netos}</span>
                    </div>
                    <div className="text-center border-x border-slate-200 space-y-0.5 px-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Mecánicos</span>
                      <span className="text-[9px] font-bold text-slate-700 block">
                        {dashboardData.kpis.tecnicos_disponibles} Libres / {dashboardData.kpis.total_tecnicos}
                      </span>
                    </div>
                    <div className="text-center space-y-0.5 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Valoración</span>
                      <div className="flex items-center justify-center gap-0.5 text-[10px] font-black text-amber-500 font-mono mt-0.5">
                        <span>{dashboardData.taller.rating}</span>
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Services List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      Servicios Activos ({activeJobs.length})
                    </h3>
                  </div>

                  {activeJobs.length === 0 ? (
                    <div className="py-5 text-center text-[10px] text-slate-400 italic rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                      Sin incidentes activos en despacho.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeJobs.map(job => (
                        <div 
                          key={job.id} 
                          onClick={() => router.push(`/dashboard/taller/servicio/${job.id}`)}
                          className="p-3 bg-emerald-50/30 border border-emerald-100/40 rounded-xl flex flex-col gap-2 cursor-pointer hover:bg-emerald-50/55 hover:border-emerald-200/50 transition-all text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{job.cliente_nombre}</span>
                            <span className={`text-[7px] py-0.5 px-1.5 rounded-full font-bold uppercase tracking-wider ${
                              job.estado === "atendido" 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200/50" 
                                : "bg-amber-100 text-amber-800 border border-amber-200/50 animate-pulse"
                            }`}>
                              {job.estado === "atendido" ? "En Sitio" : "En Camino"}
                            </span>
                          </div>
                          <p className="text-slate-500 line-clamp-1 leading-normal">Placa: {job.vehiculo_placa} • {job.descripcion}</p>
                          
                          <div className="flex items-center justify-between pt-1.5 border-t border-emerald-100/20 text-[9px] mt-1 gap-2">
                            <span className="text-slate-400 truncate">Técnico: {job.tecnico_asignado || "Asignado"}</span>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Geolocation link */}
                              {(job.estado === "en_camino" || job.estado === "atendido" || job.estado === "en_proceso") && (
                                <a
                                  href={`https://www.google.com/maps?q=${job.latitude ? job.latitude + 0.0025 : -17.783},${job.longitude ? job.longitude - 0.003 : -63.182}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[8px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 font-bold uppercase transition-colors"
                                  title="Ubicación del Técnico"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-red-500" />
                                  <span>Mapa</span>
                                </a>
                              )}

                              {job.estado === "en_camino" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsAttended(job.id);
                                  }}
                                  className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-lg transition-all border-none cursor-pointer"
                                >
                                  <span>Llegué</span>
                                </button>
                              ) : (
                                <span className="text-emerald-600 font-bold uppercase py-1 px-1.5">Ver</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emergency Requests Alert Pool */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Alertas en tu zona ({pendingIncidents.length})
                    </h3>
                  </div>

                  {pendingIncidents.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-slate-400 italic rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                      Esperando nuevas alertas en la zona...
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingIncidents.map(inc => {
                        const isSelected = selectedIncident?.id === inc.id;
                        const isCrit = inc.prioridad_ia === "critica";
                        const isHigh = inc.prioridad_ia === "alta";
                        const pillColor = 
                          isCrit ? "bg-red-50 text-red-700 border border-red-200/50" : 
                          isHigh ? "bg-amber-50 text-amber-700 border border-amber-200/50" : 
                          "bg-slate-50 text-slate-700 border border-slate-200";

                        return (
                          <div
                            key={inc.id}
                            onClick={() => {
                              setSelectedIncident(inc);
                            }}
                            className={`p-3 border rounded-xl flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition-all text-[11px] ${
                              isSelected ? "border-emerald-500 bg-emerald-50/20" : "border-slate-100"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 uppercase tracking-tight">{inc.categoria_ia || "Falla Mecánica"}</span>
                              <span className={`text-[7px] py-0.5 px-1.5 rounded-full font-bold uppercase tracking-wider ${pillColor}`}>
                                {inc.prioridad_ia || "media"}
                              </span>
                            </div>
                            
                            <div className="text-slate-500 line-clamp-2 leading-relaxed text-[10.5px]">
                              {inc.analisis_ia ? (
                                <FormattedText text={inc.analisis_ia} />
                              ) : (
                                "Gemini IA está procesando el informe."
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50 text-[9px] text-slate-400 mt-1">
                              <span>Distancia: ~1.2 km</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/taller/solicitud/${inc.id}`);
                                }}
                                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-lg transition-all border-none cursor-pointer"
                              >
                                <span>Batear / Cotizar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Reviews Feed */}
                {dashboardData && dashboardData.recent_reviews && dashboardData.recent_reviews.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 shrink-0">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                      Opiniones de Clientes ({dashboardData.recent_reviews.length})
                    </h3>
                    <div className="space-y-2">
                      {dashboardData.recent_reviews.map((rev: any) => (
                        <div key={rev.id} className="p-3 bg-slate-50 border border-[var(--border)] rounded-xl space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-2.5 h-2.5 ${i < rev.calificacion ? "fill-amber-500" : "text-slate-200"}`} 
                                />
                              ))}
                            </div>
                            <span className="text-[8px] text-[var(--text-muted)] font-mono">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] italic leading-relaxed">
                            "{rev.comentario}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL: Gestionar Mecánicos */}
      {isTechModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mecánicos del Taller</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Administración de Personal Técnico</p>
                </div>
              </div>
              <button
                onClick={() => setIsTechModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer border-none text-xs font-black"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Form to add new mechanic */}
              <form onSubmit={handleAddTech} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Registrar Nuevo Mecánico
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                      className="glass-input w-full text-xs py-2 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={newTechPhone}
                      onChange={(e) => setNewTechPhone(e.target.value)}
                      className="glass-input w-full text-xs py-2 bg-white"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={techActionLoading}
                  className="btn-primary w-full py-2.5 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none shadow-md transition-all active:scale-95"
                >
                  {techActionLoading ? "Registrando..." : "Agregar Técnico"}
                </button>
              </form>

              {/* List of mechanics */}
              <div className="space-y-3.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Personal Técnico Actual ({techList.length})
                </span>
                
                {techList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80">
                    No hay técnicos registrados en este taller.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {techList.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white border border-slate-100 hover:border-slate-250 shadow-sm rounded-2xl flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="min-w-0">
                          <span className="font-black text-slate-800 text-xs block truncate">
                            {t.nombre}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            Tel: {t.telefono}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Availability Toggle pill button */}
                          <button
                            onClick={() => handleToggleTech(t.id)}
                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider cursor-pointer select-none transition-all hover:scale-105 active:scale-95 ${
                              t.disponible
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                : "bg-amber-50 border-amber-100 text-amber-600"
                            }`}
                          >
                            {t.disponible ? "Disponible" : "Ocupado"}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteTech(t.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border-none"
                            title="Eliminar Técnico"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0 select-none">
              Auxilio.AI • Operaciones del Tenant
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
