"use client";

import React, { useState, useEffect } from "react";
import { Incidente, Cotizacion, Workshop } from "@/services/mockData";
import { apiService } from "@/services/apiService";
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Star, 
  X,
  User
} from "lucide-react";

interface ActiveCaseConsoleProps {
  tenantId: string;
  incidente: Incidente;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export const ActiveCaseConsole: React.FC<ActiveCaseConsoleProps> = ({
  tenantId,
  incidente,
  onClose,
  onRefresh
}) => {
  const [quotes, setQuotes] = useState<Cotizacion[]>([]);
  const [allTalleres, setAllTalleres] = useState<Workshop[]>([]);
  
  // Review feedback fields
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  // Fetch bids/quotes and workshops
  useEffect(() => {
    const fetchData = async () => {
      const wks = await apiService.getTalleres(tenantId);
      setAllTalleres(wks);

      if (incidente.estado === "cotizado" || incidente.estado === "reportado") {
        const qts = await apiService.getCotizacionesForIncidente(tenantId, incidente.id);
        setQuotes(qts);
      } else {
        setQuotes([]);
      }
    };
    fetchData();
  }, [tenantId, incidente]);

  // Accept Mechanic Quote
  const handleAcceptQuote = async (quoteId: string | number) => {
    if (!confirm("Confirmar presupuesto. El mecanico sera despachado.")) return;
    try {
      const ok = await apiService.aceptarCotizacion(tenantId, quoteId);
      if (ok) {
        await onRefresh();
        alert("Presupuesto aceptado. Mecanico en camino.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct manual dispatch
  const handleSelectWorkshopManually = async (workshopId: string | number, workshopName: string) => {
    if (!confirm(`Confirmar asignacion manual al taller: ${workshopName}`)) return;
    try {
      const ok = await apiService.seleccionarTallerManualmente(tenantId, incidente.id, workshopId, workshopName);
      if (ok) {
        await onRefresh();
        alert("Taller asignado exitosamente.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit service rating review
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidente.taller_asignado_id) return;
    setReviewSubmitting(true);
    try {
      await apiService.crearReview(tenantId, {
        taller_id: incidente.taller_asignado_id,
        rating,
        comentario
      });
      setReviewCompleted(true);
      setTimeout(() => {
        setReviewCompleted(false);
        setComentario("");
        onClose();
        onRefresh();
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-7xl mx-auto p-6 border border-white/5 shadow-2xl relative animate-fadeIn pointer-events-auto">
      
      {/* Absolute Close button */}
      <button 
        onClick={onClose}
        className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/2 hover:bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        title="Ocultar Consola"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Title info bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-0.5 rounded bg-[var(--primary-light)] border border-[var(--border)] text-[var(--primary)] font-bold uppercase tracking-wider">
            Consola de Seguimiento
          </span>
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Caso #{incidente.id.toString().substring(0, 8)}... — {incidente.vehiculo_modelo} ({incidente.vehiculo_placa})
          </h3>
        </div>
        <span className={`status-pill mr-8 ${
          incidente.estado === "pagado" ? "status-pill-success" :
          incidente.estado === "en_camino" ? "status-pill-accent" :
          "status-pill-warning"
        }`}>
          {incidente.estado}
        </span>
      </div>

      {/* Grid columns layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
        
        {/* COL 1: INCIDENT SUMMARY */}
        <div className="space-y-4 border-r border-[var(--border)] pr-8">
          <span className="label-caps text-zinc-500 font-bold">Detalle del Reporte</span>
          <div className="bg-[var(--bg-raised)] border border-[var(--border)] p-4.5 rounded-xl space-y-3 text-zinc-700 leading-relaxed">
            <p className="flex items-center gap-2 font-black text-zinc-800 text-sm">
              <User className="w-4 h-4 text-[var(--primary)]" />
              {incidente.cliente_nombre}
            </p>
            <p className="text-zinc-500 font-mono text-xs font-semibold">{incidente.cliente_telefono}</p>
            <p className="border-t border-[var(--border)] pt-2.5 mt-2.5 text-xs text-zinc-600 italic">
              "{incidente.descripcion}"
            </p>
            <p className="flex items-center gap-1.5 text-[var(--primary)] font-mono text-[10px] pt-2.5 border-t border-[var(--border)] font-bold">
              <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
              {incidente.latitude.toFixed(5)}, {incidente.longitude.toFixed(5)}
            </p>
          </div>
        </div>

        {/* COL 2: OFFERS / REAL-TIME BIDS */}
        <div className="space-y-4 border-r border-[var(--border)] pr-8">
          {incidente.estado === "en_camino" ? (
            <div className="space-y-3">
              <span className="label-caps text-zinc-500 font-bold">Mecanico en Ruta</span>
              <div className="p-4.5 rounded-2xl bg-[var(--primary-light)] border border-[var(--border)] space-y-2.5">
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Taller Despachado</p>
                <h4 className="font-extrabold text-zinc-800 text-sm leading-none">{incidente.taller_nombre}</h4>
                <p className="text-zinc-500 text-xs font-medium">{incidente.tecnico_asignado}</p>
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-3">
                  <span className="text-zinc-400 font-bold uppercase text-[9px]">Presupuesto Acordado</span>
                  <span className="font-black text-emerald-650 font-mono text-base">Bs. {incidente.costo_final}</span>
                </div>
              </div>
            </div>
          ) : incidente.estado === "pagado" ? (
            <div className="space-y-3">
              <span className="label-caps">Calificacion del Servicio</span>
              {reviewCompleted ? (
                <div className="py-8 text-center text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  Calificacion guardada exitosamente.
                </div>
              ) : (
                <form onSubmit={handleSendReview} className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="label-caps !text-[10px]">Puntaje</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-amber-400 hover:scale-110 cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-800"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    placeholder="Escriba su opinion del auxilio mecanico..."
                    rows={2}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="glass-input w-full text-xs"
                    required
                  />
                  <button type="submit" className="btn-secondary w-full !py-2.5">
                    Calificar Servicio
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <span className="label-caps">Propuestas de Talleres ({quotes.length})</span>
              {quotes.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-white/5 bg-white/1 text-zinc-500 text-xs">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-zinc-700 animate-pulse" />
                  Esperando presupuestos de talleres cercanos...
                </div>
              ) : (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollable">
                  {quotes.map(q => (
                    <div key={q.id} className="p-3.5 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-white text-xs">{q.taller_nombre}</h5>
                        <p className="text-xs text-zinc-400 italic mt-1 leading-snug">"{q.descripcion}"</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" /> {q.tiempo_estimado_minutos} mins arribo
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-emerald-400 font-mono text-sm">Bs. {q.costo_estimado}</p>
                        <button
                          onClick={() => handleAcceptQuote(q.id)}
                          className="btn-action mt-2.5 !py-1 !px-3 !bg-emerald-500/10 !border-emerald-500/20 !text-emerald-400 hover:!bg-emerald-500 hover:!text-black"
                        >
                          Aceptar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* COL 3: DIRECT DISPATCH ASIGNACIÓN */}
        <div className="space-y-3">
          <span className="label-caps">Asignar Taller de Forma Directa</span>
          {incidente.estado === "en_camino" || incidente.estado === "pagado" ? (
            <div className="py-10 text-center rounded-xl border border-white/5 bg-white/1 text-zinc-500">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
              Taller ya asignado y despachado.
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollable">
              {allTalleres.map(wk => (
                <div key={wk.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-white leading-tight">{wk.nombre}</h5>
                    <p className="text-zinc-500 text-[10px] mt-0.5">{wk.especialidad}</p>
                    <div className="flex items-center gap-0.5 mt-1 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{wk.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectWorkshopManually(wk.id, wk.nombre)}
                    className="btn-action !py-1 !px-3"
                  >
                    Asignar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
