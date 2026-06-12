"use client";

import React, { useState, useEffect } from "react";
import { Incidente, Workshop } from "@/services/mockData";
import { apiService } from "@/services/apiService";
import { 
  Wrench, 
  MapPin, 
  DollarSign, 
  Coins,
  Star,
  Send
} from "lucide-react";

interface WorkshopPanelProps {
  tenantId: string;
  incidents: Incidente[];
  onRefresh: () => Promise<void>;
}

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({
  tenantId,
  incidents,
  onRefresh
}) => {
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [workshopsList, setWorkshopsList] = useState<Workshop[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string | number | null>(null);
  
  // Bid form fields
  const [costoEstimado, setCostoEstimado] = useState("");
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  // Load workshops list inside the tenant
  useEffect(() => {
    const loadWorkshops = async () => {
      const data = await apiService.getTalleres(tenantId);
      setWorkshopsList(data);
      if (data.length > 0) {
        setSelectedWorkshop(data[0]);
      } else {
        setSelectedWorkshop(null);
      }
    };
    loadWorkshops();
  }, [tenantId]);

  const handleSendBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop || !activeIncidentId || !costoEstimado || !tiempoEstimado || !descripcion) {
      alert("Por favor completa los campos del presupuesto.");
      return;
    }

    setSubmittingBid(true);
    try {
      const bidData = {
        incidente_id: activeIncidentId,
        taller_id: selectedWorkshop.id,
        taller_nombre: selectedWorkshop.nombre,
        costo_estimado: parseFloat(costoEstimado),
        tiempo_estimado_minutos: parseInt(tiempoEstimado),
        descripcion
      };

      await apiService.crearCotizacion(tenantId, bidData);
      
      setCostoEstimado("");
      setTiempoEstimado("");
      setDescripcion("");
      setActiveIncidentId(null);
      
      await onRefresh();
      alert("Presupuesto enviado exitosamente.");
    } catch (err) {
      console.error(err);
      alert("Error al enviar presupuesto.");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleCompleteJob = async (incidenteId: string | number) => {
    if (!confirm("Confirmar finalizacion del servicio mecanico.")) return;
    try {
      const ok = await apiService.completarServicio(tenantId, incidenteId);
      if (ok) {
        await onRefresh();
        alert("Servicio finalizado correctamente.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter incidents for this tenant
  const tenantIncidents = incidents.filter(i => i.tenant_id === tenantId);
  
  // Queued incidents that need cotización
  const pendingIncidents = tenantIncidents.filter(i => 
    i.estado === "reportado" || i.estado === "clasificado" || i.estado === "cotizado"
  );

  // Active jobs assigned to the selected workshop
  const activeJobs = tenantIncidents.filter(i => 
    i.taller_asignado_id === selectedWorkshop?.id && i.estado === "en_camino"
  );

  // Solved jobs by the selected workshop
  const solvedJobs = tenantIncidents.filter(i => 
    i.taller_asignado_id === selectedWorkshop?.id && i.estado === "pagado"
  );

  if (!selectedWorkshop) {
    return (
      <div className="py-8 text-center bg-white/1 rounded-xl border border-white/5">
        <Wrench className="w-7 h-7 text-zinc-700 mx-auto mb-2.5" />
        <p className="label-caps !text-[10px]">Sin talleres</p>
        <p className="text-xs text-zinc-500 mt-1.5">No se encontraron talleres en el inquilino.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5 h-full custom-scrollable text-xs">
      {/* Profile Selector Card */}
      <div className="space-y-3.5">
        <span className="label-caps">Taller Activo</span>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
            <img src={selectedWorkshop.imagen} alt={selectedWorkshop.nombre} className="w-full h-full object-cover" />
          </div>
          <div>
            <select
              value={selectedWorkshop.id}
              onChange={(e) => {
                const target = workshopsList.find(w => w.id === parseInt(e.target.value));
                if (target) setSelectedWorkshop(target);
              }}
              className="bg-transparent font-bold text-xs text-white focus:outline-none cursor-pointer border-b border-white/10 uppercase tracking-wide py-0.5"
            >
              {workshopsList.map(w => (
                <option key={w.id} value={w.id} className="bg-zinc-950 text-white">
                  {w.nombre}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-amber-400 font-bold uppercase">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{selectedWorkshop.rating} Rating</span>
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400 leading-snug">
          <p><span className="text-zinc-600 font-bold uppercase text-[10px] mr-1">Especialidad:</span> {selectedWorkshop.especialidad}</p>
          <p className="truncate"><span className="text-zinc-600 font-bold uppercase text-[10px] mr-1">Contacto:</span> {selectedWorkshop.telefono}</p>
        </div>
      </div>

      {/* Queued Emergency Incidents */}
      <div className="space-y-3">
        <h4 className="label-caps flex items-center justify-between">
          <span>Alertas Pendientes ({pendingIncidents.length})</span>
          <span className="status-pill status-pill-accent !text-[9px]">Cola</span>
        </h4>

        {pendingIncidents.length === 0 ? (
          <div className="py-5 text-center rounded-xl border border-white/5 bg-white/1 text-xs text-zinc-500">
            No hay emergencias registradas en la zona
          </div>
        ) : (
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollable">
            {pendingIncidents.map(inc => {
              const isSelected = activeIncidentId !== null && activeIncidentId.toString() === inc.id.toString();
              const pillType = 
                inc.prioridad_ia === "critica" ? "status-pill-danger" :
                inc.prioridad_ia === "alta" ? "status-pill-warning" :
                "status-pill-neutral";

              return (
                <button
                  key={inc.id}
                  onClick={() => setActiveIncidentId(inc.id)}
                  className={`list-item-link ${isSelected ? "list-item-link-active" : ""}`}
                >
                  <span className={`text-xs font-bold truncate max-w-[170px] ${isSelected ? "text-[var(--primary)]" : "text-zinc-700"}`}>{inc.vehiculo_modelo}</span>
                  <span className={`status-pill ${pillType} !text-[9px]`}>
                    {inc.prioridad_ia || "media"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected incident details bid proposal input form */}
      {activeIncidentId && (
        (() => {
          const inc = pendingIncidents.find(i => activeIncidentId !== null && i.id.toString() === activeIncidentId.toString());
          if (!inc) return null;
          return (
            <div className="border-t border-white/5 pt-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label-caps !text-[10px]">Propuesta para caso #{inc.id}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{inc.vehiculo_placa} - {inc.vehiculo_modelo}</h3>
                </div>
                <button 
                  onClick={() => setActiveIncidentId(null)}
                  className="btn-action !py-1 !px-3"
                >
                  Cerrar
                </button>
              </div>

              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl text-xs space-y-1.5 text-zinc-300">
                <p><span className="text-zinc-500 font-bold uppercase text-[10px] mr-1">Cliente:</span> {inc.cliente_nombre}</p>
                <p><span className="text-zinc-500 font-bold uppercase text-[10px] mr-1">Incidente:</span> "{inc.descripcion}"</p>
                <p className="flex items-center gap-1.5 text-indigo-400 font-mono text-[9px] pt-1.5 border-t border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}</span>
                </p>
              </div>

              {/* Bidding submission inputs form */}
              <form onSubmit={handleSendBid} className="space-y-3">
                <h4 className="label-caps flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Presupuesto
                </h4>

                <div className="grid grid-cols-2 gap-3.5">
                  <input
                    type="number"
                    placeholder="Costo (Bs.)"
                    value={costoEstimado}
                    onChange={(e) => setCostoEstimado(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Arribo (Mins)"
                    value={tiempoEstimado}
                    onChange={(e) => setTiempoEstimado(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Detalles de la solucion a brindar..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="glass-input w-full"
                  required
                />

                <button
                  type="submit"
                  disabled={submittingBid}
                  className="btn-primary w-full py-3"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Oferta</span>
                </button>
              </form>
            </div>
          );
        })()
      )}

      {/* Assigned active mechanical cases list */}
      <div className="space-y-3">
        <h4 className="label-caps flex items-center justify-between">
          <span>Servicios en Curso ({activeJobs.length})</span>
          <span className="status-pill status-pill-accent !text-[9px]">Ruta</span>
        </h4>

        {activeJobs.length === 0 ? (
          <div className="py-5 text-center rounded-xl border border-white/5 bg-white/1 text-xs text-zinc-500">
            Ningun trabajo asignado
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeJobs.map(job => (
              <div key={job.id} className="p-3.5 bg-white/2 border border-white/5 rounded-xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white">{job.vehiculo_modelo}</span>
                    <span className="text-zinc-500 ml-2 font-mono">({job.vehiculo_placa})</span>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono text-sm">Bs. {job.costo_final}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px]">
                  <span className="text-zinc-500">Tecnico: {job.tecnico_asignado}</span>
                  <button
                    onClick={() => handleCompleteJob(job.id)}
                    className="btn-action !bg-emerald-500/10 !border-emerald-500/20 !text-emerald-400 hover:!bg-emerald-500 hover:!text-black !py-1 !px-3"
                  >
                    Completar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mechanics logged completed solutions list */}
      <div className="space-y-3">
        <h4 className="label-caps">Servicios Cobrados ({solvedJobs.length})</h4>
        {solvedJobs.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-2 bg-white/1 rounded-lg border border-white/5">Sin servicios completados.</p>
        ) : (
          <div className="space-y-2 max-h-[110px] overflow-y-auto custom-scrollable">
            {solvedJobs.map(job => (
              <div key={job.id} className="p-2.5 bg-white/1 rounded-lg border border-white/5 flex justify-between items-center text-xs">
                <span className="font-medium text-zinc-400">{job.vehiculo_placa} - {job.vehiculo_modelo}</span>
                <span className="font-bold text-emerald-400 font-mono">+Bs. {job.costo_final}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
