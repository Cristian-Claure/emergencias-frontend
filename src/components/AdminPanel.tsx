"use client";

import React, { useState, useEffect } from "react";
import { KPIReport, Workshop, Incidente } from "@/services/mockData";
import { apiService } from "@/services/apiService";
import { 
  BarChart3, 
  AlertOctagon, 
  Wrench,
  Star,
  RefreshCw
} from "lucide-react";

interface AdminPanelProps {
  tenantId: string;
  incidents: Incidente[];
  onRefresh: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  tenantId,
  incidents,
  onRefresh
}) => {
  const [kpis, setKpis] = useState<KPIReport | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAdminData = async () => {
    setRefreshing(true);
    try {
      const data = await apiService.getKPIs(tenantId);
      const tall = await apiService.getTalleres(tenantId);
      setKpis(data);
      setWorkshops(tall);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [tenantId, incidents]);

  if (!kpis) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  const totalStates = Object.values(kpis.distribucion_estados).reduce((a, b) => a + b, 0) || 1;
  const totalPriorities = Object.values(kpis.distribucion_prioridades).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex flex-col gap-4.5 h-full custom-scrollable text-xs">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <span className="label-caps !text-[10px]">Consola Operativa</span>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-semibold">Tenant: {tenantId}</p>
        </div>
        <button
          onClick={loadAdminData}
          disabled={refreshing}
          className="btn-action !p-2"
          title="Recargar KPIs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Stats list */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
          <span className="label-caps !text-[9px]">Total Casos</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{kpis.total_incidentes}</p>
        </div>
        <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
          <span className="label-caps !text-[9px]">Resolucion</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{kpis.tiempo_resolucion_promedio_minutos} min</p>
        </div>
        <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
          <span className="label-caps !text-[9px]">Cancelacion</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{kpis.tasa_cancelacion}%</p>
        </div>
        <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
          <span className="label-caps !text-[9px]">Comisiones (10%)</span>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">Bs. {kpis.comisiones_retenidas}</p>
        </div>
      </div>

      {/* Distributions container */}
      <div className="space-y-4.5 pt-1">
        {/* States distribution */}
        <div>
          <h4 className="label-caps mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Distribucion de Estados
          </h4>
          <div className="space-y-2.5">
            {Object.entries(kpis.distribucion_estados).map(([state, count]) => {
              const pct = totalStates > 0 ? (count / totalStates) * 100 : 0;
              return (
                <div key={state} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
                    <span className="capitalize">{state}</span>
                    <span className="font-bold text-white font-mono">{count}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-white rounded-full transition-all" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity distribution */}
        <div className="border-t border-white/5 pt-4">
          <h4 className="label-caps mb-3 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" />
            Nivel de Gravedad
          </h4>
          <div className="space-y-2.5">
            {Object.entries(kpis.distribucion_prioridades).map(([prio, count]) => {
              const pct = totalPriorities > 0 ? (count / totalPriorities) * 100 : 0;
              const barColor = 
                prio === "critica" ? "bg-red-500" :
                prio === "alta" ? "bg-amber-500" :
                prio === "media" ? "bg-blue-500" :
                "bg-zinc-700";

              return (
                <div key={prio} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
                    <span className="capitalize">{prio}</span>
                    <span className="font-bold text-white font-mono">{count}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table listing workshops */}
      <div className="border-t border-white/5 pt-4 space-y-3">
        <h4 className="label-caps flex items-center gap-1.5">
          <Wrench className="w-4 h-4" />
          Rendimiento de Talleres
        </h4>
        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollable">
          {workshops.map(wk => (
            <div key={wk.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{wk.nombre}</p>
                <p className="text-zinc-500 text-[10px] mt-0.5">{wk.especialidad}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 text-amber-400 font-bold justify-end">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{wk.rating.toFixed(1)}</span>
                </div>
                <p className="text-zinc-600 text-[10px] font-mono mt-0.5">{wk.telefono}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
