"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Tenant, Workshop } from "@/services/mockData";
import { 
  ChevronLeft, 
  RefreshCw, 
  BarChart2, 
  History, 
  Wrench, 
  DollarSign, 
  Clock, 
  Star, 
  TrendingUp, 
  Percent, 
  Award,
  SlidersHorizontal,
  Calendar,
  Flame
} from "lucide-react";

// Dynamic import for KPIMap
const KPIMap = dynamic(
  () => import("./KPIMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#f8faf9] flex items-center justify-center rounded-2xl border border-slate-100">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

export default function TallerKPIs() {
  const router = useRouter();

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(60);

  // KPIs data state
  const [kpiResumen, setKpiResumen] = useState<any>({
    total_incidentes: 0,
    incidentes_activos: 0,
    incidentes_completados: 0,
    incidentes_cancelados: 0,
    tiempo_resolucion_promedio_min: 0,
    promedio_rating_talleres: 0
  });
  const [slaPercentage, setSlaPercentage] = useState(0);
  const [byTypeDistribution, setByTypeDistribution] = useState<any>({
    bateria: 0,
    motor: 0,
    llanta: 0,
    choque: 0,
    otro: 0
  });
  const [heatmapHotspots, setHeatmapHotspots] = useState<any[]>([]);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("2026-05-01");
  const [filterEndDate, setFilterEndDate] = useState("2026-06-01");

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

  // Fetch KPI data
  const fetchKPIData = async () => {
    if (!activeTenant) return;
    try {
      // 1. Fetch Summary
      const summary = await apiService.getKPIsResumen(activeTenant.id);
      setKpiResumen(summary);

      // 2. Fetch SLA
      const sla = await apiService.getKPIsSLA(activeTenant.id);
      setSlaPercentage(sla.sla_percentage);

      // 3. Fetch Type Distribution
      const dist = await apiService.getKPIsIncidentesPorTipo(activeTenant.id);
      setByTypeDistribution(dist);

      // 4. Fetch Heatmap hotspots
      const geojson = await apiService.getKPIsZonasCalor(activeTenant.id);
      const spots = (geojson.features || []).map((f: any) => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        weight: f.properties.weight || 1.0
      }));
      
      setHeatmapHotspots(spots);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchKPIData();
    }
  }, [activeTenant]);

  // Auto refresh loop every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchKPIData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTenant]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
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

  if (loading || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9] text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cargando Métricas...</p>
      </div>
    );
  }

  // Calculate gross income (Simulated from completed services)
  const totalFacturadoVal = kpiResumen.total_incidentes * 125;
  const platformFee = Math.round(totalFacturadoVal * 0.1 * 100) / 100;
  const netRevenueVal = Math.round((totalFacturadoVal - platformFee) * 100) / 100;

  // Custom SVG Donut calculation
  const totalTypes = Object.values(byTypeDistribution).reduce((a: any, b: any) => a + b, 0) as number;
  const categories = Object.keys(byTypeDistribution);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  
  let accumulatedAngle = 0;
  const donutSlices = categories.map((cat, i) => {
    const count = byTypeDistribution[cat] || 0;
    const percentage = totalTypes > 0 ? (count / totalTypes) * 100 : 0;
    const strokeDashArray = `${percentage} ${100 - percentage}`;
    const strokeDashOffset = 100 - accumulatedAngle + 25;
    accumulatedAngle += percentage;
    
    return {
      category: cat,
      count,
      percentage,
      color: colors[i % colors.length],
      dashArray: strokeDashArray,
      dashOffset: strokeDashOffset
    };
  });

  return (
    <RoleGuard allowedRoles={["taller"]}>
      <div className="min-h-screen w-full bg-[#f8faf9] text-slate-800 font-sans antialiased flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative">

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
        </div>        {/* Secondary Navigation Floating Bar */}
        <div className="w-full max-w-7xl mx-auto px-4 mt-6 z-20 shrink-0">
          <div className="bg-white border border-emerald-100/40 p-2 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="grid grid-cols-3 sm:flex gap-1.5 w-full sm:w-auto">
              <button 
                onClick={() => router.push("/dashboard/taller")}
                className="px-2.5 sm:px-4 py-2.5 rounded-xl hover:bg-slate-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" /> <span className="hidden min-[380px]:inline">Dashboard</span>
              </button>
              <button 
                onClick={() => router.push("/dashboard/taller/historial")}
                className="px-2.5 sm:px-4 py-2.5 rounded-xl hover:bg-slate-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <History className="w-3.5 h-3.5" /> <span className="hidden min-[380px]:inline">Historial</span>
              </button>
              <button 
                onClick={() => router.push("/dashboard/taller/kpis")}
                className="px-2.5 sm:px-4 py-2.5 rounded-xl bg-emerald-600 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-white border-none cursor-pointer shadow-md shadow-emerald-600/10"
              >
                <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden min-[380px]:inline">Métricas</span>
              </button>
            </div>
            
            {/* Auto refresh countdown */}
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pr-3 flex items-center justify-center sm:justify-end gap-1.5 shrink-0 py-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>Sincronizando en {refreshCountdown}s</span>
            </span>
          </div>
        </div>
        {/* Main Content Workspace */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 z-10 space-y-6 pt-6 animate-fadeIn">
          
          {/* Back link */}
          <button
            onClick={() => router.push("/dashboard/taller")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-black uppercase tracking-wider border-none bg-transparent cursor-pointer self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>

          {/* Heading */}
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Dashboard Analítico</p>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-emerald-600 shrink-0" /> Rendimiento Técnico y Negocio
            </h2>
          </div>

          {/* Metrics summary widget cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="stat-card stat-emerald p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Incidentes Atendidos</span>
                <p className="text-xl font-black text-slate-800 font-mono">{kpiResumen.incidentes_completados || 20}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500"><Wrench className="w-4 h-4" /></div>
            </div>

            <div className="stat-card stat-zinc p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Tiempo Respuesta Promedio</span>
                <p className="text-xl font-black text-slate-800 font-mono">{kpiResumen.tiempo_resolucion_promedio_min || 25.4} min</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600"><Clock className="w-4 h-4" /></div>
            </div>

            <div className="stat-card stat-amber p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Calificación Promedio</span>
                <p className="text-xl font-black text-amber-600 font-mono flex items-center gap-1">
                  <span>{kpiResumen.promedio_rating_talleres || 4.8}</span>
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500"><Star className="w-4 h-4 fill-amber-450" /></div>
            </div>

            <div className="stat-card stat-emerald p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Ganancia Neta Mensual</span>
                <p className="text-xl font-black text-emerald-600 font-mono">Bs. {netRevenueVal}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
            </div>

          </div>

          {/* SLA, Period Filters and Zonas-Calor Heatmap Grid (3 Cols vs 9 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Donut, SLA, and Date Period Sheet (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Date Filters Card */}
              <div className="bg-white border border-emerald-100/40 p-6 rounded-3xl space-y-4 shadow-sm">
                <h4 className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-400 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Rango de Análisis
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Desde</span>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Hasta</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SLA compliance card */}
              <div className="bg-white border border-emerald-100/40 p-6 rounded-3xl space-y-4 shadow-sm">
                <h4 className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-400 font-bold">
                  <Award className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Cumplimiento de SLA
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <span>Servicios a tiempo</span>
                    <span className="font-mono text-emerald-600">{slaPercentage}%</span>
                  </div>
                  
                  {/* Progress bar with meta indicator */}
                  <div className="relative pt-1">
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${slaPercentage}%` }}
                      />
                    </div>
                    {/* 90% threshold marker */}
                    <div className="absolute top-0 bottom-0 left-[90%] w-0.5 border-l border-dashed border-slate-400/50 flex flex-col justify-between" title="Meta: 90%">
                      <span className="text-[7.5px] text-slate-400 font-extrabold bg-white px-0.5 rounded -mt-3 shadow-xs">90%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal font-medium">
                    Meta de la plataforma: mantener el arribo del auxilio bajo los 30 minutos asignados (SLA estándar {">"}90%).
                  </p>
                </div>
              </div>

              {/* Pie/Donut Chart: Incidentes por Tipo (Battery, engine, tires...) */}
              <div className="bg-white border border-emerald-100/40 p-6 rounded-3xl space-y-5 shadow-sm flex flex-col justify-between">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">Distribución de Solicitudes</h4>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                  
                  {/* SVG Donut */}
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0 animate-scaleUp">
                    <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="4.5" />
                      {donutSlices.map((slice, sIdx) => (
                        <circle
                          key={sIdx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="5.2"
                          strokeDasharray={slice.dashArray}
                          strokeDashoffset={slice.dashOffset}
                          className="transition-all duration-1000 ease-out"
                        />
                      ))}
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Total</span>
                      <span className="text-lg font-black text-slate-800 font-mono mt-1 leading-none">{totalTypes}</span>
                    </div>
                  </div>

                  {/* Donut Legend with Progress Bars */}
                  <div className="flex-1 space-y-3 text-xs w-full">
                    {donutSlices.map((slice, sIdx) => (
                      <div key={sIdx} className="space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: slice.color }} />
                            <span className="text-slate-700 capitalize tracking-tight">{slice.category}</span>
                          </div>
                          <span className="font-mono text-slate-500">{slice.count} <span className="text-[10px] text-slate-400 font-medium">({Math.round(slice.percentage)}%)</span></span>
                        </div>
                        {/* Mini progress bar for this category */}
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${slice.percentage}%`,
                              backgroundColor: slice.color 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>

            {/* Right Side: Curved Line Trend & Map Operativo (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Daily Trend Line Chart (Curved curve SVG with gradient) */}
              <div className="bg-white border border-emerald-100/40 p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">Tendencia Diaria de Servicios</h4>
                
                <div className="w-full h-44 relative bg-slate-50 rounded-2xl border border-slate-200/60 p-2">
                  
                  {/* Custom SVG line chart */}
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#10b981" floodOpacity="0.3" />
                      </filter>
                    </defs>
                    
                    {/* Horizontal Gridlines */}
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#e2e8f0" strokeOpacity="0.6" strokeWidth="0.15" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeOpacity="0.6" strokeWidth="0.15" />
                    <line x1="0" y1="30" x2="100" y2="30" stroke="#e2e8f0" strokeOpacity="0.6" strokeWidth="0.15" />

                    {/* Dotted Average Line */}
                    <line x1="0" y1="22" x2="100" y2="22" stroke="#10b981" strokeOpacity="0.3" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
                    <text x="2" y="21.2" fill="#94a3b8" fontSize="1.8" fontWeight="bold" fontFamily="monospace" opacity="0.75">PROM: 16</text>

                    {/* Dotted Vertical Drop lines */}
                    <line x1="40" y1="18" x2="40" y2="40" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1 1" />
                    <line x1="70" y1="5" x2="70" y2="40" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1 1" />
                    <line x1="85" y1="12" x2="85" y2="40" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1 1" />

                    {kpiResumen.total_incidentes > 0 ? (
                      <>
                        {/* Smooth curve gradient area */}
                        <path
                          d="M 0 40 C 15 30, 25 10, 40 18 C 55 25, 70 5, 85 12 C 95 15, 100 20, 100 20 L 100 40 Z"
                          fill="url(#areaGradient)"
                          className="transition-all duration-1000"
                        />

                        {/* Glowing curve stroke line */}
                        <path
                          d="M 0 40 C 15 30, 25 10, 40 18 C 55 25, 70 5, 85 12 C 95 15, 100 20, 100 20"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          filter="url(#glow)"
                          className="transition-all duration-1000"
                        />

                        {/* Glow joints dots */}
                        <g className="cursor-pointer transition-transform duration-300 hover:scale-125 origin-center">
                          <circle cx="40" cy="18" r="2.2" fill="#10b981" fillOpacity="0.2" />
                          <circle cx="40" cy="18" r="1.1" fill="#ffffff" stroke="#10b981" strokeWidth="0.6" />
                        </g>
                        <g className="cursor-pointer transition-transform duration-300 hover:scale-125 origin-center">
                          <circle cx="70" cy="5" r="2.2" fill="#10b981" fillOpacity="0.2" />
                          <circle cx="70" cy="5" r="1.1" fill="#ffffff" stroke="#10b981" strokeWidth="0.6" />
                        </g>
                        <g className="cursor-pointer transition-transform duration-300 hover:scale-125 origin-center">
                          <circle cx="85" cy="12" r="2.2" fill="#10b981" fillOpacity="0.2" />
                          <circle cx="85" cy="12" r="1.1" fill="#ffffff" stroke="#10b981" strokeWidth="0.6" />
                        </g>

                        {/* Value labels for points */}
                        <text x="43" y="19" fill="#64748b" fontSize="2" fontWeight="bold" fontFamily="monospace">18 Serv.</text>
                        <text x="73" y="6" fill="#10b981" fontSize="2" fontWeight="black" fontFamily="monospace">28 Serv. (Pico)</text>
                        <text x="88" y="13" fill="#64748b" fontSize="2" fontWeight="bold" fontFamily="monospace">20 Serv.</text>
                      </>
                    ) : (
                      <text x="50" y="20" fill="#94a3b8" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                        Sin datos de servicios en este período
                      </text>
                    )}
                  </svg>
                  
                  {/* Axis indicators */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[8px] font-mono text-slate-400 font-bold uppercase select-none">
                    <span>Día 01</span>
                    <span>Día 10</span>
                    <span>Día 20</span>
                    <span>Día 30</span>
                  </div>

                </div>
              </div>

              {/* Leaflet Heatmap Layer showing hot zones with higher requests */}
              <div className="bg-white border border-emerald-100/40 p-4 rounded-3xl shadow-sm flex flex-col gap-4">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-500 animate-pulse" /> Mapa de Calor — Zonas Críticas
                </h4>
                <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-100 relative z-0">
                  <KPIMap hotspots={heatmapHotspots} />
                </div>
              </div>

            </div>

          </div>

        </main>

        {/* Footer info line */}
        <footer className="w-full py-6 text-center text-[10px] text-slate-400 z-10 border-t border-slate-100 bg-[#f8faf9]">
          <p>© 2026 Auxilio.AI</p>
        </footer>

      </div>
    </RoleGuard>
  );
}
