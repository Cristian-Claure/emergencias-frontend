"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Tenant, Workshop, Incidente } from "@/services/mockData";
import { 
  ChevronLeft, 
  Star, 
  RefreshCw, 
  User, 
  History, 
  Coins,
  TrendingUp, 
  Power,
  Check,
  Copy
} from "lucide-react";

export default function AdminTallerDetalle() {
  const router = useRouter();
  const routeParams = useParams();
  const tallerId = routeParams.id as string;

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [historial, setHistorial] = useState<Incidente[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  // UI States
  const [isActivo, setIsActivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Fetch detailed data
  const fetchWorkshopData = async () => {
    if (!activeTenant) return;
    try {
      // 1. Fetch workshops in tenant
      const wkList = await apiService.getTalleres(activeTenant.id);
      const matchWk = wkList.find(w => w.id.toString() === tallerId.toString());
      if (!matchWk) {
        alert("Taller no encontrado.");
        router.push("/dashboard/admin");
        return;
      }
      setWorkshop(matchWk);
      setIsActivo(matchWk.activo);

      // 2. Fetch completed incident logs for this workshop
      const allIncidents = await apiService.getIncidentes(activeTenant.id);
      const matchIncidents = allIncidents.filter(i => i.taller_asignado_id && i.taller_asignado_id.toString() === matchWk.id.toString());
      setHistorial(matchIncidents);

      // 3. Fetch technicians list
      const techList = await apiService.getTecnicos(activeTenant.id);
      const matchTechs = techList.filter(t => t.taller_id === matchWk.id || t.id.startsWith("tech"));
      setTecnicos(matchTechs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchWorkshopData();
    }
  }, [activeTenant]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setWorkshop(null);
      localStorage.setItem("active_tenant_id", tenantId);
      router.push("/dashboard/admin");
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

  // Toggle workshop status
  const handleToggleWorkshop = async () => {
    if (!activeTenant || !workshop) return;
    setUpdatingAvailability(true);
    const nextState = !isActivo;
    setIsActivo(nextState);
    
    try {
      await apiService.updateAdminTallerDisponibilidad(activeTenant.id, tallerId, nextState);
      alert(`Estado del taller ${workshop.nombre} establecido a: ${nextState ? "Activo" : "Inactivo"}`);
      await fetchWorkshopData();
    } catch (e) {
      alert("Error al actualizar la disponibilidad.");
      setIsActivo(!nextState);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  if (loading || !activeTenant || !workshop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando Taller...</p>
      </div>
    );
  }

  // Financial aggregates
  const completedJobsCount = historial.filter(i => i.estado === "pagado").length;
  const grossIncome = completedJobsCount * 125;
  const commissionPaid = Math.round(grossIncome * 0.1 * 100) / 100;
  const netEarnings = Math.round((grossIncome - commissionPaid) * 100) / 100;

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen w-full bg-slate-50/50 text-slate-800 font-sans antialiased overflow-y-auto flex flex-col justify-between relative">
        
        {/* Glow backgrounds */}
        <div className="absolute top-[-5%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-20">
          <Header
            tenants={tenants}
            activeTenant={activeTenant}
            onTenantChange={handleTenantChange}
            activeRole="admin"
            isBackendConnected={isBackendConnected}
            offlineMode={offlineMode}
            onOfflineModeToggle={handleOfflineToggle}
          />
        </div>

        {/* Main Panel Content */}
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 z-10 flex flex-col gap-6 animate-fadeIn font-semibold">
          
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/admin")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors text-xs font-black uppercase tracking-wider border-none bg-transparent cursor-pointer self-start"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
            <span>Consola de Admin</span>
          </button>

          {/* Workshop profile general header */}
          <div className="glass-panel p-6 border border-slate-200 rounded-3xl flex items-center justify-between gap-4 relative overflow-hidden shadow-sm bg-white">
            <div className="absolute top-0 right-0 w-[30%] h-full bg-gradient-to-l from-emerald-500/[0.015] to-transparent pointer-events-none blur-xl" />
            
            <div className="flex items-center gap-4.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 shadow-sm">
                <img src={workshop.imagen} alt={workshop.nombre} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 truncate text-base uppercase tracking-wide leading-none">{workshop.nombre}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase mt-1.5 tracking-wider flex-wrap">
                  <span>{workshop.especialidad}</span>
                  <div className="flex items-center text-amber-550 font-extrabold gap-0.5 border-l border-slate-200 pl-3">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{workshop.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workshop Status Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider select-none shrink-0 ${
              workshop.activo 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                : "bg-rose-50 border-rose-100 text-rose-600"
            }`}>
              {workshop.activo ? "Activo" : "Inactivo"}
            </div>
          </div>

          {/* KPIs specific workshop summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4.5 text-xs space-y-1 bg-white">
              <span className="text-slate-400 font-bold uppercase text-[8px] flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-slate-400" /> Servicios Totales</span>
              <p className="text-xl font-bold text-slate-900 font-mono">{completedJobsCount}</p>
            </div>
            <div className="glass-panel p-4.5 text-xs space-y-1 bg-white">
              <span className="text-slate-400 font-bold uppercase text-[8px] flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-emerald-500" /> Comisiones Pagadas</span>
              <p className="text-xl font-bold text-emerald-600 font-mono">Bs. {commissionPaid}</p>
            </div>
          </div>

          {/* Dynamic Workshop Performance Financial Summary */}
          <div className="glass-panel p-5 space-y-4 bg-slate-50/50 border border-slate-200/80 rounded-3xl shadow-inner">
            <h4 className="label-caps !text-[9px] border-b border-slate-200/80 pb-2 text-slate-450 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Desempeño Financiero
            </h4>
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-bold uppercase text-[9px]">Ingresos Históricos Brutos</span>
                <span className="font-extrabold text-slate-800 font-mono text-[13px]">Bs. {grossIncome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-bold uppercase text-[9px]">Comisiones Plataforma (10%)</span>
                <span className="font-bold text-rose-600 font-mono">-Bs. {commissionPaid}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                <span className="font-black text-slate-800 uppercase text-[9px]">Ganancia Neta Retenida</span>
                <span className="font-black text-emerald-600 font-mono text-sm">Bs. {netEarnings}</span>
              </div>
            </div>
          </div>

          {/* Active Technicians log list */}
          <div className="glass-panel p-5 border border-slate-200 rounded-3xl space-y-4 shadow-sm bg-white">
            <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2 text-slate-450 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Técnicos de Servicio ({tecnicos.length})
            </h4>
            
            {tecnicos.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-4 text-center rounded-xl bg-slate-50 border border-slate-200">
                Ningún mecánico registrado en el taller.
              </p>
            ) : (
              <div className="space-y-2.5">
                {tecnicos.map(tech => (
                  <div key={tech.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs font-semibold">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{tech.nombre}</p>
                      <p className="text-[9px] text-slate-450 font-mono">{tech.telefono}</p>
                    </div>
                    <span className={`status-pill !text-[8px] !py-0.5 !px-2.5 ${
                      tech.disponible ? "status-pill-success" : "status-pill-neutral"
                    }`}>
                      {tech.disponible ? "Disponible" : "Ocupado"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services history lists logs */}
          <div className="glass-panel p-5 border border-slate-200 rounded-3xl space-y-4 shadow-sm bg-white">
            <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2.5 text-slate-455 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-slate-550 shrink-0" /> Registro de Auxilios Completados ({completedJobsCount})
            </h4>

            {completedJobsCount === 0 ? (
              <p className="text-[10px] text-slate-450 italic py-4 text-center rounded-xl bg-slate-50 border border-slate-200">
                Sin registros de servicios finalizados.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollable">
                {historial.map(job => (
                  <div key={job.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs hover:border-emerald-200 transition-colors">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">{job.vehiculo_modelo}</p>
                      <p className="text-[9px] text-slate-450 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
                        <span 
                          onClick={(e) => handleCopyId(job.id.toString(), e)} 
                          className="bg-slate-200/50 hover:bg-slate-200 px-1 py-0.5 rounded cursor-copy text-[8px] font-bold"
                          title="Copiar ID"
                        >
                          ID: #{job.id.toString().substring(0, 8)}
                          {copiedId === job.id.toString() && <Check className="w-2 h-2 text-emerald-500 inline ml-1" />}
                        </span>
                        <span>• Cliente: {job.cliente_nombre}</span>
                      </p>
                    </div>
                    <span className="font-black text-emerald-600 font-mono shrink-0">Bs. {job.costo_final || 125}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>

        {/* Footer info line */}
        <footer className="w-full py-6 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white/80 mt-12">
          <p>© 2026 Auxilio.AI</p>
        </footer>

      </div>
    </RoleGuard>
  );
}
