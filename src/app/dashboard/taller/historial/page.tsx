"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth, exportUtilities } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import {
  ChevronLeft,
  RefreshCw,
  History,
  Search,
  TrendingUp,
  SlidersHorizontal,
  X,
  FileText,
  DollarSign,
  Coins,
  User,
  Car,
  Wrench,
  Percent,
  Calendar,
  BarChart2,
  Download
} from "lucide-react";

export default function TallerHistorial() {
  const router = useRouter();

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [historial, setHistorial] = useState<Incidente[]>([]);

  // Filters state
  const [filterState, setFilterState] = useState<string>("todos");
  const [filterType, setFilterType] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detailed Modal
  const [selectedInc, setSelectedInc] = useState<Incidente | null>(null);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Fetch historical data
  const fetchHistorialData = async () => {
    if (!activeTenant) return;
    try {
      const historyList = await apiService.getTallerHistorial(activeTenant.id);
      setHistorial(historyList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchHistorialData();
    }
  }, [activeTenant]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setHistorial([]);
      localStorage.setItem("active_tenant_id", tenantId);
      router.push("/dashboard/taller");
    }
  };

  const handleExport = (type: "pdf" | "excel" | "json") => {
    const columns = [
      { header: "Fecha", key: "fecha" },
      { header: "Cliente", key: "cliente" },
      { header: "Teléfono", key: "telefono" },
      { header: "Vehículo", key: "vehiculo" },
      { header: "Placa", key: "placa" },
      { header: "Categoría", key: "categoria" },
      { header: "Costo Bruto", key: "bruto" },
      { header: "Comisión (10%)", key: "comision" },
      { header: "Neto Taller", key: "neto" },
      { header: "Estado", key: "estado" }
    ];

    const dataToExport = filteredHistorial.map(inc => {
      const bruto = inc.costo_final || 150;
      const comision = Math.round(bruto * 0.1 * 100) / 100;
      const neto = Math.round((bruto - comision) * 100) / 100;
      return {
        fecha: new Date(inc.fecha_reporte).toLocaleDateString(),
        cliente: inc.cliente_nombre,
        telefono: inc.cliente_telefono || "Sin Teléfono",
        vehiculo: inc.vehiculo_modelo,
        placa: inc.vehiculo_placa,
        categoria: inc.categoria_ia || "Mecánico",
        bruto: `Bs. ${bruto}`,
        comision: `Bs. ${comision}`,
        neto: `Bs. ${neto}`,
        estado: inc.estado === "pagado" ? "Cobrado" : inc.estado === "atendido" ? "Pendiente" : "Cancelado"
      };
    });

    const filename = `Reporte_Historial_Asistencias_${activeTenant?.id || "taller"}`;

    if (type === "pdf") {
      exportUtilities.exportToPDF(dataToExport, "Reporte de Historial de Asistencias - Taller", columns);
    } else if (type === "excel") {
      exportUtilities.exportToExcel(dataToExport, columns, filename);
    } else if (type === "json") {
      exportUtilities.exportToJSON(dataToExport, filename);
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

  // Filter logic
  const filteredHistorial = historial.filter(inc => {
    const matchSearch =
      inc.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.vehiculo_placa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.vehiculo_modelo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchState = filterState === "todos" || inc.estado === filterState;
    const matchType = filterType === "todos" || inc.categoria_ia === filterType;

    return matchSearch && matchState && matchType;
  });

  // Dynamic totals calculation
  const totalFacturado = filteredHistorial.reduce((acc, inc) => acc + (inc.costo_final || 150), 0);
  const totalComision = Math.round(totalFacturado * 0.1 * 100) / 100;
  const totalGananciaNeta = Math.round((totalFacturado - totalComision) * 100) / 100;

  if (loading || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9] text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cargando Historial...</p>
      </div>
    );
  }

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
        </div>

        {/* Dynamic Details Modal Sheet Overlay */}
        {selectedInc && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white border border-emerald-100/50 p-6 space-y-5 relative rounded-3xl shadow-2xl overflow-hidden animate-scaleUp text-slate-800">
              {/* Top decorative warning line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

              <button
                onClick={() => setSelectedInc(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mt-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                    Detalle del Servicio
                  </h3>
                  <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-0.5">
                    ID: <span className="text-slate-600 select-all">#{selectedInc.id.toString().substring(0, 8)}...</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">

                {/* Client and Vehicle Info Bento Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" /> Cliente
                    </span>
                    <p className="font-extrabold text-slate-800 text-sm leading-tight">{selectedInc.cliente_nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedInc.cliente_telefono || "Sin Teléfono"}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-emerald-600" /> Vehículo
                    </span>
                    <p className="font-extrabold text-slate-800 text-sm leading-tight">{selectedInc.vehiculo_modelo}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Placa: <span className="uppercase font-bold text-slate-700">{selectedInc.vehiculo_placa}</span></p>
                  </div>
                </div>

                {/* Fault diagnosis details */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Diagnóstico Falla
                  </span>
                  <p className="font-medium text-slate-700 leading-relaxed italic">
                    "{selectedInc.descripcion}"
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className={`text-[8px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider ${selectedInc.estado === "pagado" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : selectedInc.estado === "atendido" ? "bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse" : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}>
                      {selectedInc.estado === "pagado" ? "Cobrado" : selectedInc.estado === "atendido" ? "Pendiente de Pago" : "Cancelado"}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-[8px] border border-emerald-200/50 text-emerald-700 font-black uppercase">
                      {selectedInc.categoria_ia || "Auxilio Mecánico"}
                    </span>
                  </div>
                </div>

                {/* Liquidation breakdown details */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3.5">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Resumen de Liquidación</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-slate-400" /> Cobro Bruto
                      </span>
                      <span className="font-bold text-slate-700 font-mono">Bs. {selectedInc.costo_final || 150}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-slate-400" /> Plataforma (10%)
                      </span>
                      <span className="font-bold text-red-500 font-mono">-Bs. {Math.round((selectedInc.costo_final || 150) * 0.1 * 100) / 100}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-1 text-xs">
                      <span className="font-black text-slate-800 uppercase text-[9px] flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500" /> Liquidación Neta (Taller)
                      </span>
                      <span className="font-black text-emerald-600 font-mono text-sm">
                        Bs. {Math.round((selectedInc.costo_final || 150) * 0.9 * 100) / 100}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Secondary Navigation Floating Bar */}
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
                className="px-2.5 sm:px-4 py-2.5 rounded-xl bg-emerald-600 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-white border-none cursor-pointer shadow-md shadow-emerald-600/10"
              >
                <History className="w-3.5 h-3.5" /> <span className="hidden min-[380px]:inline">Historial</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/taller/kpis")}
                className="px-2.5 sm:px-4 py-2.5 rounded-xl hover:bg-slate-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 border-none cursor-pointer transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden min-[380px]:inline">Métricas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Workspace */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 z-10 space-y-6 pt-6">

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
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Liquidación del Taller</p>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-600 shrink-0" /> Historial de Asistencias
            </h2>
          </div>

          {/* Revenue Analytics Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className="bg-white p-5 border border-emerald-100/40 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Monto Facturado Bruto</span>
                <p className="text-xl font-bold text-slate-800 font-mono">Bs. {totalFacturado}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-mono font-bold">Bs.</div>
            </div>

            <div className="bg-white p-5 border border-emerald-100/40 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Comisiones Retenidas</span>
                <p className="text-xl font-bold text-red-600 font-mono">-Bs. {totalComision}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red border border-red-100 flex items-center justify-center text-red-500 font-mono font-bold">%</div>
            </div>

            <div className="bg-white p-5 border border-emerald-100 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Liquidación Neta Recibida</span>
                <p className="text-xl font-black text-emerald-600 font-mono">Bs. {totalGananciaNeta}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
            </div>

          </div>

          {/* Filters & Table Container */}
          <div className="bg-white p-6 border border-emerald-100/40 rounded-3xl space-y-6 shadow-sm flex flex-col">

            {/* Filter controls header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4.5">

              {/* Search query input */}
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Buscar por cliente, placa o modelo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>

              {/* Status and category dropdown filters */}
              <div className="flex flex-wrap items-center gap-3.5 text-xs">

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado:</span>
                  <select
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 font-semibold text-xs cursor-pointer focus:outline-none transition-colors"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="pagado">Cobrados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Problema:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 font-semibold text-xs cursor-pointer focus:outline-none transition-colors"
                  >
                    <option value="todos">Todas las Fallas</option>
                    <option value="bateria">Batería</option>
                    <option value="motor">Motor</option>
                    <option value="llanta">Llanta</option>
                    <option value="choque">Choque</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

              </div>

            </div>

            {/* Export buttons row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100/60 text-xs">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-1">
                Exportación de Datos ({filteredHistorial.length} registros)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport("pdf")}
                  className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <BarChart2 className="w-3.5 h-3.5" /> Excel
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
              </div>
            </div>

            {/* Service history tabular records list */}
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-wider select-none">
                    <th className="py-4.5 px-4.5">Fecha</th>
                    <th className="py-4.5 px-4.5">Cliente</th>
                    <th className="py-4.5 px-4.5">Vehículo</th>
                    <th className="py-4.5 px-4.5">Problema</th>
                    <th className="py-4.5 px-4.5 text-right">Monto</th>
                    <th className="py-4.5 px-4.5 text-right">Comisión (10%)</th>
                    <th className="py-4.5 px-4.5 text-right">Neto Taller</th>
                    <th className="py-4.5 px-4.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistorial.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic bg-white">
                        Ningún servicio encontrado con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistorial.map(inc => {
                      const bruto = inc.costo_final || 150;
                      const comision = Math.round(bruto * 0.1 * 100) / 100;
                      const neto = Math.round((bruto - comision) * 100) / 100;

                      return (
                        <tr
                          key={inc.id}
                          onClick={() => setSelectedInc(inc)}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-4.5 text-slate-500 font-mono text-[10px] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{new Date(inc.fecha_reporte).toLocaleDateString()}</span>
                          </td>
                          <td className="py-4 px-4.5 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {inc.cliente_nombre}
                          </td>
                          <td className="py-4 px-4.5 text-slate-500 font-medium">
                            <span className="block text-slate-700">{inc.vehiculo_modelo}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{inc.vehiculo_placa}</span>
                          </td>
                          <td className="py-4 px-4.5">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[9px] font-black uppercase text-slate-500">
                              {inc.categoria_ia || "batería"}
                            </span>
                          </td>
                          <td className="py-4 px-4.5 text-right font-mono font-extrabold text-slate-600">
                            Bs. {bruto}
                          </td>
                          <td className="py-4 px-4.5 text-right font-mono text-red-500">
                            -Bs. {comision}
                          </td>
                          <td className="py-4 px-4.5 text-right font-mono font-black text-emerald-600">
                            Bs. {neto}
                          </td>
                          <td className="py-4 px-4.5 text-center">
                            <span className={`text-[8px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider ${inc.estado === "pagado" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : inc.estado === "atendido" ? "bg-amber-50 text-amber-700 border border-amber-200/50" : "bg-slate-50 text-slate-700 border border-slate-200"
                              }`}>
                              {inc.estado === "pagado" ? "Cobrado" : inc.estado === "atendido" ? "Pendiente de Pago" : "Cancelado"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
