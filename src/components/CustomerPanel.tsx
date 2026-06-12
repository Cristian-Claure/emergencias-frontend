"use client";

import React, { useState, useEffect } from "react";
import { Incidente } from "@/services/mockData";
import { apiService } from "@/services/apiService";
import { 
  AlertTriangle, 
  RefreshCw, 
  X, 
  History,
  User,
  Phone,
  Tag,
  Car,
  FileText
} from "lucide-react";

interface CustomerPanelProps {
  tenantId: string;
  incidents: Incidente[];
  onRefresh: () => Promise<void>;
  offlineMode: boolean;
  selectedIncident: Incidente | null;
  onSelectIncident: (inc: Incidente) => void;
}

export const CustomerPanel: React.FC<CustomerPanelProps> = ({
  tenantId,
  incidents,
  onRefresh,
  offlineMode,
  selectedIncident,
  onSelectIncident
}) => {
  // Form modal visibility (Default: false)
  const [showForm, setShowForm] = useState(false);
  
  // History popover visibility (Default: false)
  const [showHistory, setShowHistory] = useState(false);

  // Form fields
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [vehiculoPlaca, setVehiculoPlaca] = useState("");
  const [vehiculoModelo, setVehiculoModelo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  // Sync state counting
  useEffect(() => {
    setOfflineCount(apiService.getOfflineQueueCount(tenantId));
  }, [incidents, tenantId]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre || !clienteTelefono || !vehiculoPlaca || !vehiculoModelo || !descripcion) {
      alert("Por favor completa todos los campos.");
      return;
    }

    setSubmitting(true);
    try {
      const baseLat = -17.783300;
      const baseLng = -63.182100;
      const latitude = baseLat + (Math.random() - 0.5) * 0.12;
      const longitude = baseLng + (Math.random() - 0.5) * 0.12;

      const incidentData = {
        tenant_id: tenantId,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        vehiculo_placa: vehiculoPlaca.toUpperCase(),
        vehiculo_modelo: vehiculoModelo,
        descripcion,
        latitude,
        longitude
      };

      const newInc = await apiService.createIncidente(tenantId, incidentData, offlineMode);
      
      setDescripcion("");
      setVehiculoPlaca("");
      setVehiculoModelo("");
      setShowForm(false); // Close modal on success
      
      await onRefresh();
      setOfflineCount(apiService.getOfflineQueueCount(tenantId));

      // Instantly focus and open the active case overlay bottom panel if not offline
      if (!offlineMode && newInc) {
        onSelectIncident(newInc);
      }
      
      if (offlineMode) {
        alert("Modo offline: Emergencia guardada localmente en dispositivo.");
      } else {
        alert("Emergencia reportada exitosamente. Los talleres estan analizando su caso.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al reportar su emergencia.");
    } finally {
      setSubmitting(false);
    }
  };

  // Sync offline queue
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await apiService.syncOfflineIncidentes(tenantId);
      await onRefresh();
      setOfflineCount(apiService.getOfflineQueueCount(tenantId));
      alert(`Sincronizacion completa: ${result.synced} incidentes cargados.`);
    } catch (e) {
      console.error(e);
      alert("Error al sincronizar datos.");
    } finally {
      setSyncing(false);
    }
  };

  const activeIncidents = incidents.filter(i => i.tenant_id === tenantId);

  return (
    <div className="absolute left-0 top-0 flex flex-col gap-3.5 pointer-events-auto z-30">
      
      {/* 1. FLOATING CONTROL BAR (HORIZONTALLY ALIGNED ON TOP-LEFT OF MAP) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary shadow-2xl flex items-center gap-2.5 !py-3 !px-4.5"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reportar Emergencia</span>
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`btn-secondary shadow-2xl flex items-center gap-2.5 !py-3 !px-4.5 ${showHistory ? "bg-white/10" : ""}`}
        >
          <History className="w-4 h-4 text-zinc-400" />
          <span>Historial ({activeIncidents.length})</span>
        </button>

        {offlineCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-3 bg-amber-500 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400 cursor-pointer shadow-2xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync ({offlineCount})
          </button>
        )}
      </div>

      {/* 2. HISTORY DROP-DOWN POPOVER PANEL (FLOATS UNDERNEATH THE BUTTONS) */}
      {showHistory && (
        <div className="w-80 glass-panel p-4.5 border border-[var(--border)] shadow-2xl animate-fadeIn mt-1.5 max-h-80 overflow-y-auto custom-scrollable flex flex-col gap-2.5 z-40">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-1">
            <span className="label-caps !text-xs text-zinc-500 font-bold">Incidentes Recientes</span>
            <button 
              onClick={() => setShowHistory(false)} 
              className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 p-1 rounded-md transition-colors border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {activeIncidents.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-3 text-center">Ningun incidente registrado.</p>
          ) : (
            <div className="space-y-2">
              {activeIncidents.map(inc => {
                const isActive = selectedIncident?.id === inc.id;
                const pillType = 
                  inc.estado === "pagado" ? "status-pill-success" :
                  inc.estado === "en_camino" ? "status-pill-accent" :
                  "status-pill-warning";

                return (
                  <button
                    key={inc.id}
                    onClick={() => {
                      onSelectIncident(inc);
                      setShowHistory(false);
                    }}
                    className={`list-item-link ${isActive ? "list-item-link-active" : ""}`}
                  >
                    <span className={`text-xs font-bold truncate max-w-[170px] ${isActive ? "text-[var(--primary)]" : "text-zinc-700"}`}>
                      {inc.vehiculo_placa} - {inc.vehiculo_modelo}
                    </span>
                    <span className={`status-pill ${pillType} !text-[9px]`}>
                      {inc.estado}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SYMMETRICALLY CENTERED GLASSMODAL FOR NEW EMERGENCY REGISTRATION */}
      {showForm && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto animate-fadeIn px-4">
          <div className="w-full max-w-lg glass-panel p-8 border border-white/10 shadow-2xl relative space-y-6 overflow-hidden rounded-3xl">
            {/* Top decorative warning line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
            
            {/* Dismiss trigger */}
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              type="button"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Header branding */}
            <div className="text-center space-y-1 pt-2">
              <span className="label-caps flex items-center gap-2 justify-center !text-red-500 !text-xs font-black tracking-widest animate-pulse">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                Auxilio Vehicular GPRS
              </span>
              <h3 className="text-lg font-black text-zinc-800 uppercase tracking-wide">Reportar Emergencia</h3>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Reporte de auxilio mecánico inmediato georreferenciado en Santa Cruz
              </p>
            </div>

            {/* Form grid */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] text-zinc-500 font-bold block">Nombre del Chofer</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ej. Roberto Carlos"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="glass-input w-full pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] text-zinc-500 font-bold block">Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="Ej. 78012345"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="glass-input w-full pl-10 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] text-zinc-500 font-bold block">Placa del Vehículo</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ej. 4839-XYZ"
                      value={vehiculoPlaca}
                      onChange={(e) => setVehiculoPlaca(e.target.value)}
                      className="glass-input w-full pl-10 uppercase font-mono tracking-wider"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] text-zinc-500 font-bold block">Marca y Modelo</label>
                  <div className="relative">
                    <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ej. Suzuki Vitara Azul"
                      value={vehiculoModelo}
                      onChange={(e) => setVehiculoModelo(e.target.value)}
                      className="glass-input w-full pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-caps !text-[10px] text-zinc-500 font-bold block">Detalles de la Falla / Incidente</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <textarea
                    placeholder="Describe el problema (ej. motor no enciende, llanta pinchada en Av. Busch...)"
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="glass-input w-full pl-10 pt-2.5"
                    required
                  />
                </div>
              </div>

              {offlineMode && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-normal flex items-start gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo Sin Conexión:</strong> Tu reporte se guardará localmente en este dispositivo y se sincronizará automáticamente cuando recuperes la señal.
                  </span>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2.5 text-white font-black uppercase tracking-wider text-xs shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>{submitting ? "Enviando Reporte..." : "Solicitar Auxilio GPRS"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
