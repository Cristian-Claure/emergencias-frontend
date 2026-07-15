"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Incidente, Cotizacion, Workshop } from "@/services/mockData";
import { 
  X, 
  Wrench, 
  MapPin, 
  Car, 
  Phone, 
  DollarSign, 
  Coins,
  Clock, 
  Star, 
  TrendingUp, 
  Percent, 
  Zap, 
  Mic, 
  Camera, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  CheckCircle,
  FileText,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface IncidentePanelProps {
  incidenteId: string | number | null;
  tenantId: string;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}

interface TecnicoCandidato {
  id: string;
  nombre: string;
  telefono: string;
  taller_id: string;
  taller_nombre: string;
  latitud: number;
  longitud: number;
  distancia_km: number;
  eta_minutos: number;
  mismo_taller: boolean;
}

export const IncidentePanel: React.FC<IncidentePanelProps> = ({
  incidenteId,
  tenantId,
  onClose,
  onUpdate
}) => {
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isAudioTransOpen, setIsAudioTransOpen] = useState(false);
  const [selectedTallerId, setSelectedTallerId] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });
  const [showReassignment, setShowReassignment] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [technicianCandidates, setTechnicianCandidates] = useState<TecnicoCandidato[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, msg });
    setTimeout(() => setToastMsg({ type: "", msg: "" }), 4500);
  };

  useEffect(() => {
    if (!incidenteId) {
      setIncidente(null);
      setCotizaciones([]);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch incident details including evidences
        const match = await apiService.getIncidente(tenantId, incidenteId);
        if (match) {
          setIncidente(match);
        }

        // Fetch bids
        const bids = await apiService.getCotizacionesForIncidente(tenantId, incidenteId);
        setCotizaciones(bids);

        // Fetch workshops list
        const wkList = await apiService.getTalleres(tenantId);
        setWorkshops(wkList);
        if (wkList.length > 0) {
          setSelectedTallerId(wkList[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to fetch detailed incident logs", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setIsPhotoExpanded(false);
    setIsAudioTransOpen(false);
    setShowReassignment(false);
    setTechnicianCandidates([]);
    setSelectedTechnicianId("");
    setReassignmentReason("");
  }, [incidenteId, tenantId]);

  // Cancel Incident
  const handleCancelIncident = async () => {
    if (!incidente) return;
    if (!confirm("¿Seguro que deseas cancelar esta emergencia? Esta acción no se puede revertir.")) return;

    setSubmittingAction(true);
    try {
      await apiService.updateServicioEstado(tenantId, incidente.id, "cancelado");
      showToast("Emergencia cancelada exitosamente.", "success");
      await onUpdate();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      showToast("Error al cancelar la emergencia.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Assign Workshop Manually
  const handleAssignWorkshop = async () => {
    if (!incidente || !selectedTallerId) return;
    if (!confirm("¿Confirmar asignación manual del taller a este incidente?")) return;

    setSubmittingAction(true);
    try {
      const wkMatch = workshops.find(w => w.id.toString() === selectedTallerId);
      const name = wkMatch ? wkMatch.nombre : "Taller Autorizado";
      await apiService.seleccionarTallerManualmente(tenantId, incidente.id, selectedTallerId, name);
      showToast("Taller asignado correctamente. Servicio en despacho.", "success");
      await onUpdate();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      showToast("Error al asignar taller.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleLoadReassignmentCandidates = async () => {
    if (!incidente) return;

    setLoadingCandidates(true);
    try {
      const candidates = await apiService.getTecnicosDisponiblesParaIncidente(
        tenantId,
        incidente.id
      );
      setTechnicianCandidates(candidates);
      setSelectedTechnicianId(candidates[0]?.id || "");
      setShowReassignment(true);

      if (candidates.length === 0) {
        showToast("No existen técnicos disponibles para reemplazo.", "error");
      }
    } catch (error: any) {
      showToast(error?.message || "No se pudieron consultar reemplazos.", "error");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleReassignTechnician = async () => {
    if (!incidente || !selectedTechnicianId) return;

    const normalizedReason = reassignmentReason.trim();
    if (normalizedReason.length < 8) {
      showToast("Registra un motivo operativo de al menos 8 caracteres.", "error");
      return;
    }

    const candidate = technicianCandidates.find(
      technician => technician.id === selectedTechnicianId
    );
    const candidateName = candidate?.nombre || "el técnico seleccionado";

    if (
      !confirm(
        `¿Reasignar el caso a ${candidateName}? El técnico anterior quedará disponible.`
      )
    ) {
      return;
    }

    setSubmittingAction(true);
    try {
      await apiService.reasignarTecnico(
        tenantId,
        incidente.id,
        selectedTechnicianId,
        normalizedReason
      );

      const updatedIncident = await apiService.getIncidente(tenantId, incidente.id);
      setIncidente(updatedIncident);
      await onUpdate();

      setShowReassignment(false);
      setTechnicianCandidates([]);
      setSelectedTechnicianId("");
      setReassignmentReason("");
      showToast("Técnico reasignado y contingencia registrada.", "success");
    } catch (error: any) {
      showToast(error?.message || "No se pudo reasignar al técnico.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!incidenteId) return null;

  const fotoEvidencia = incidente?.evidencias?.find(e => e.tipo === "imagen");
  const audioEvidencia = incidente?.evidencias?.find(e => e.tipo === "audio");
  const canReassignTechnician = Boolean(
    incidente &&
    ["en_camino", "en_proceso", "en_sitio", "sin_tecnico"].includes(incidente.estado)
  );

  return (
    <>
      {/* Backdrop overlay clickable to close drawer */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 animate-fadeIn"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-900 border-l border-white/5 z-40 flex flex-col shadow-2xl animate-slideIn">
        
        {/* Header Panel */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-950/40">
        <div>
          <span className="label-caps !text-[9px] text-zinc-500">Expediente de Asistencia</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">Caso #{incidenteId}</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading || !incidente ? (
        <div className="flex-1 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
          <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
          <span>Cargando expediente...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollable">
          
          {/* Metadata Grid */}
          <div className="bg-white/2 border border-white/5 p-4 rounded-2xl text-xs space-y-3.5 text-zinc-300">
            <h4 className="label-caps !text-[9px] flex items-center gap-1 border-b border-white/5 pb-2 text-zinc-500">
              <Car className="w-3.5 h-3.5" /> Datos Generales
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <span className="text-zinc-600 font-bold uppercase text-[8px] block">Cliente</span>
                <span className="font-extrabold text-white mt-0.5 block">{incidente.cliente_nombre}</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">{incidente.cliente_telefono}</span>
              </div>
              <div>
                <span className="text-zinc-600 font-bold uppercase text-[8px] block">Vehículo</span>
                <span className="font-bold text-white mt-0.5 block">{incidente.vehiculo_modelo}</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">Placa: {incidente.vehiculo_placa}</span>
              </div>
              {incidente.tecnico_asignado && (
                <div className="col-span-2 pt-2 border-t border-white/5">
                  <span className="text-zinc-600 font-bold uppercase text-[8px] block">Despacho actual</span>
                  <span className="font-bold text-white mt-0.5 block">{incidente.tecnico_asignado}</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    {incidente.taller_nombre || "Taller afiliado"} · {incidente.tecnico_telefono || "Sin teléfono"}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-zinc-500 uppercase font-bold">Estado Actual:</span>
              <span className={`status-pill !text-[8px] !py-0.5 !px-2 ${
                incidente.estado === "pagado" ? "status-pill-success" : incidente.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning animate-pulse"
              }`}>{incidente.estado}</span>
            </div>
          </div>

          {/* Gemini IA complete analysis */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-xs space-y-1.5 shadow-md">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Diagnóstico Avanzado Gemini IA
            </span>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              {incidente.analisis_ia || "Nuestra inteligencia artificial analizó las evidencias aportadas y priorizó el reclamo."}
            </p>
          </div>

          {/* Chronological logs Stepper Log timeline */}
          <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-3.5 text-xs">
            <h4 className="label-caps !text-[9px] border-b border-white/5 pb-2 text-zinc-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-500" /> Línea de Tiempo del Evento
            </h4>
            <div className="space-y-3 font-medium">
              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-white text-[11px]">Caso Reportado</p>
                  <p className="text-[9px] text-zinc-500">Registrado por chofer via GPS móvil</p>
                </div>
              </div>
              
              {incidente.estado !== "pendiente" && incidente.estado !== "cancelado" && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-white text-[11px]">Presupuestos Recibidos</p>
                    <p className="text-[9px] text-zinc-500">Talleres ofertando en subasta inversa</p>
                  </div>
                </div>
              )}

              {incidente.estado === "en_camino" && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping mt-1 shrink-0" />
                  <div>
                    <p className="text-indigo-400 text-[11px]">Técnico en Camino</p>
                    <p className="text-[9px] text-zinc-500">GPS telemetría transmitiendo en vivo</p>
                  </div>
                </div>
              )}

              {incidente.estado === "pagado" && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-emerald-400 text-[11px]">Atendido y Cobrado</p>
                    <p className="text-[9px] text-zinc-500">Transacción Stripe aprobada con éxito</p>
                  </div>
                </div>
              )}

              {incidente.estado === "cancelado" && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-zinc-400 text-[11px]">Emergencia Cancelada</p>
                    <p className="text-[9px] text-zinc-500">El incidente fue cerrado sin atención</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evidences Section */}
          <div className="space-y-3">
            <h4 className="label-caps !text-[9px]">Evidencias Registradas</h4>
            <div className="grid grid-cols-1 gap-3 text-xs">
              
              {/* Photo component */}
              {fotoEvidencia && (
                <>
                  <div className="bg-white/2 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="font-bold text-white text-[11px]">Foto de Evidencia</p>
                        <p className="text-[9px] text-zinc-500">Detalle visual reportado por el chofer</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                      className="py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-black uppercase text-zinc-300 cursor-pointer transition-colors"
                    >
                      {isPhotoExpanded ? "Ocultar" : "Ampliar"}
                    </button>
                  </div>

                  {isPhotoExpanded && (
                    <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-950 flex items-center justify-center p-1.5 animate-fadeIn">
                      <img 
                        src={fotoEvidencia.url_gcs} 
                        alt="Evidencia motor" 
                        className="w-full h-auto object-cover max-h-[220px] rounded-xl shadow-lg"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Audio component */}
              {audioEvidencia && (
                <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Mic className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white text-[11px]">Audio de Emergencia</p>
                      <p className="text-[9px] text-zinc-500">Grabado en campo por el chofer</p>
                    </div>
                  </div>

                  <audio 
                    controls 
                    src={audioEvidencia.url_gcs} 
                    className="w-full h-7 opacity-85 custom-audio-player"
                  />

                  {audioEvidencia.transcripcion && (
                    <div className="border-t border-white/5 pt-2">
                      <button
                        onClick={() => setIsAudioTransOpen(!isAudioTransOpen)}
                        className="w-full flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <span>Transcripción del audio</span>
                        <span>{isAudioTransOpen ? "▼" : "▶"}</span>
                      </button>
                      
                      {isAudioTransOpen && (
                        <p className="text-[10px] text-zinc-400 italic leading-relaxed mt-2 p-2 bg-zinc-950/40 rounded-lg border border-white/2">
                          "{audioEvidencia.transcripcion}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!fotoEvidencia && !audioEvidencia && (
                <p className="text-zinc-500 text-[10px] italic text-center py-2">
                  No se adjuntaron evidencias multimedia para esta emergencia.
                </p>
              )}

            </div>
          </div>

          {/* Reverse Auction Bids list */}
          <div className="space-y-3">
            <h4 className="label-caps !text-[9px]">Licitación: Cotizaciones Recibidas ({cotizaciones.length})</h4>
            {cotizaciones.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic py-4 text-center rounded-xl bg-white/1 border border-white/2">
                Esperando cotizaciones de los talleres afiliados...
              </p>
            ) : (
              <div className="space-y-2">
                {cotizaciones.map(cot => (
                  <div key={cot.id} className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="font-bold text-white">{cot.taller_nombre}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Llegada: {cot.tiempo_estimado_minutos} Mins • {cot.descripcion}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-400 font-mono">Bs. {cot.costo_estimado}</span>
                      <span className={`block text-[7px] font-black uppercase mt-0.5 tracking-wider ${
                        cot.estado === "aceptado" ? "text-emerald-400" : cot.estado === "rechazado" ? "text-red-400" : "text-zinc-500"
                      }`}>{cot.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liquidación / Payment Summary */}
          {incidente.estado === "pagado" && (
            <div className="bg-zinc-950/80 border border-white/5 p-4 rounded-2xl space-y-3.5 text-zinc-300 font-semibold shadow-inner">
              <h4 className="label-caps !text-[9px] border-b border-white/5 pb-2 text-zinc-500">Liquidación de Cobro</h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase text-[9px] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-zinc-500 font-mono" /> Cobro Bruto
                </span>
                <span className="font-extrabold text-white font-mono">Bs. {incidente.costo_final}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase text-[9px] flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-zinc-500" /> Plataforma Cut (10%)
                </span>
                <span className="font-bold text-red-400 font-mono">-Bs. {Math.round((incidente.costo_final || 150) * 0.1 * 100) / 100}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3">
                <span className="font-black text-white uppercase text-[9px] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Liquidación Taller
                </span>
                <span className="font-black text-emerald-400 font-mono text-[13px]">
                  Bs. {Math.round((incidente.costo_final || 150) * 0.9 * 100) / 100}
                </span>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/5 space-y-4">
            <h4 className="label-caps !text-[9px] flex items-center gap-1 text-red-400">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Panel de Control de Supervisor
            </h4>

            {canReassignTechnician && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block">
                      CU46 · Contingencia Operativa
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Reemplaza al técnico por demora, avería, falta de respuesta o saturación.
                    </p>
                  </div>
                  {!showReassignment && (
                    <button
                      onClick={handleLoadReassignmentCandidates}
                      disabled={loadingCandidates || submittingAction}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer text-[9px] shrink-0 disabled:opacity-50"
                    >
                      {loadingCandidates ? "Buscando..." : "Buscar reemplazo"}
                    </button>
                  )}
                </div>

                {showReassignment && (
                  <div className="space-y-3 pt-2 border-t border-amber-500/10">
                    {technicianCandidates.length > 0 ? (
                      <>
                        <label className="block">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                            Técnico disponible
                          </span>
                          <select
                            value={selectedTechnicianId}
                            onChange={(event) => setSelectedTechnicianId(event.target.value)}
                            className="glass-input w-full mt-1.5 cursor-pointer focus:outline-none"
                          >
                            {technicianCandidates.map(candidate => (
                              <option
                                key={candidate.id}
                                value={candidate.id}
                                className="bg-zinc-950 text-white"
                              >
                                {candidate.nombre} · {candidate.taller_nombre} · {candidate.distancia_km} km · ETA {candidate.eta_minutos} min
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedTechnicianId && (() => {
                          const selected = technicianCandidates.find(
                            candidate => candidate.id === selectedTechnicianId
                          );
                          if (!selected) return null;

                          return (
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-zinc-950/40 border border-white/5 rounded-xl text-center">
                              <div>
                                <span className="text-[8px] text-zinc-600 font-bold uppercase block">Distancia</span>
                                <strong className="text-[10px] text-white">{selected.distancia_km} km</strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-600 font-bold uppercase block">ETA</span>
                                <strong className="text-[10px] text-white">{selected.eta_minutos} min</strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-600 font-bold uppercase block">Red</span>
                                <strong className="text-[10px] text-white">
                                  {selected.mismo_taller ? "Mismo taller" : "Otro taller"}
                                </strong>
                              </div>
                            </div>
                          );
                        })()}

                        <label className="block">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                            Motivo de contingencia
                          </span>
                          <textarea
                            value={reassignmentReason}
                            onChange={(event) => setReassignmentReason(event.target.value)}
                            maxLength={240}
                            placeholder="Ej.: técnico sin respuesta durante 15 minutos."
                            className="glass-input w-full min-h-20 mt-1.5 resize-none focus:outline-none"
                          />
                        </label>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowReassignment(false);
                              setTechnicianCandidates([]);
                              setSelectedTechnicianId("");
                              setReassignmentReason("");
                            }}
                            disabled={submittingAction}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-[9px] font-black uppercase cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleReassignTechnician}
                            disabled={
                              submittingAction ||
                              !selectedTechnicianId ||
                              reassignmentReason.trim().length < 8
                            }
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-[9px] font-black uppercase cursor-pointer disabled:opacity-40"
                          >
                            {submittingAction ? "Reasignando..." : "Confirmar reasignación"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-zinc-950/40 rounded-xl text-[10px] text-zinc-400">
                        No hay técnicos disponibles en la red del tenant.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(incidente.estado === "pendiente" || incidente.estado === "clasificado" || incidente.estado === "cotizado" || incidente.estado === "sin_tecnico") && (
              <div className="p-4 bg-white/2 border border-white/5 rounded-2xl space-y-3 text-xs">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Asignar taller de forma manual:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTallerId}
                    onChange={(e) => setSelectedTallerId(e.target.value)}
                    className="glass-input flex-1 cursor-pointer focus:outline-none"
                  >
                    {workshops.map(w => (
                      <option key={w.id} value={w.id} className="bg-zinc-950 text-white">
                        {w.nombre} ({w.especialidad})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleAssignWorkshop}
                    disabled={submittingAction || !selectedTallerId}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer text-[10px] flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/10"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}



          </div>

        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg.msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xs w-11/12 animate-fadeIn">
          <div className={`p-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider shadow-2xl flex items-center justify-center text-center ${
            toastMsg.type === "success" 
              ? "bg-emerald-500/90 border-emerald-500 text-zinc-950 backdrop-blur-md" 
              : "bg-red-500/90 border-red-500 text-white backdrop-blur-md"
          }`}>
            <span>{toastMsg.msg}</span>
          </div>
        </div>
      )}

      </div>
    </>
  );
};
