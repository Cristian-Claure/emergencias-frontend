"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import { FormattedText } from "@/components/FormattedText";
import { 
  ChevronLeft, 
  MapPin, 
  Car, 
  Mic, 
  Camera, 
  Clock, 
  DollarSign, 
  Coins,
  RefreshCw, 
  Zap, 
  FileText, 
  Sparkles,
  UserCheck,
  CheckCircle2,
  Trash2
} from "lucide-react";

// Dynamic import for SimpleMap to avoid SSR errors
const SimpleMap = dynamic(
  () => import("./SimpleMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center rounded-2xl border border-white/5">
        <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    )
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SolicitudDetalle({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();
  const incidentId = routeParams.id as string;

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const fotoEvidencia = incidente?.evidencias?.find(e => e.tipo === "imagen");
  const audioEvidencia = incidente?.evidencias?.find(e => e.tipo === "audio");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Technicians
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>("");

  // Bid form
  const [costoEstimado, setCostoEstimado] = useState("");
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [descripcionOferta, setDescripcionOferta] = useState("");
  
  // UI States
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isAudioTransOpen, setIsAudioTransOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  
  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSent, setBidSent] = useState(false);

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

  // Fetch incident and technicians list
  const fetchDetails = async () => {
    if (!activeTenant) return;
    try {
      // 1. Fetch incident detail including GCS public links
      const matchInc = await apiService.getIncidente(activeTenant.id, incidentId.toString());
      
      if (!matchInc) {
        alert("Emergencia no encontrada o ya atendida.");
        router.push("/dashboard/taller");
        return;
      }
      setIncidente(matchInc);

      // 2. Fetch workshops and pick active workshop
      const wkList = await apiService.getTalleres(activeTenant.id);
      setWorkshops(wkList);
      if (wkList.length > 0) {
        const userEmail = typeof window !== "undefined" ? localStorage.getItem("user_email") : null;
        const matchByEmail = wkList.find(w => w.email === userEmail);
        setSelectedWorkshop(matchByEmail || wkList[0]);
      }

      // 3. Fetch technicians
      const techList = await apiService.getTecnicos(activeTenant.id);
      setTecnicos(techList);
      const availableTech = techList.find(t => t.disponible);
      if (availableTech) {
        setSelectedTecnicoId(availableTech.id);
      } else if (techList.length > 0) {
        setSelectedTecnicoId(techList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchDetails();
    }
  }, [activeTenant]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setIncidente(null);
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

  // AI suggest quote generator for Santa Cruz in Bs
  const handleAISuggest = () => {
    if (!incidente || !selectedWorkshop) return;
    setIsGeneratingAI(true);
    
    // Simulate premium AI processing feedback with micro-delay
    setTimeout(() => {
      try {
        const suggestion = apiService.getAICotizacionSugerida(incidente, selectedWorkshop);
        setCostoEstimado(suggestion.monto.toString());
        setTiempoEstimado(suggestion.tiempo.toString());
        setDescripcionOferta(suggestion.descripcion);
        setAiSuccessMessage(`¡Tarifa recomendada calculada! Distancia: ${suggestion.distanciaKm} km. Sugerido: Bs. ${suggestion.monto} en ${suggestion.tiempo} minutos.`);
        
        // Auto-clear message after 8 seconds
        setTimeout(() => {
          setAiSuccessMessage("");
        }, 8000);
      } catch (err) {
        console.error(err);
        alert("Error al obtener sugerencia de la IA.");
      } finally {
        setIsGeneratingAI(false);
      }
    }, 1200);
  };

  // Submit Mechanical Bid
  const handleSendBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !incidente || !selectedWorkshop) return;
    if (!costoEstimado || !tiempoEstimado || !descripcionOferta) {
      alert("Por favor rellene todos los campos de cotización.");
      return;
    }

    setSubmittingBid(true);
    try {
      const bidPayload = {
        incidente_id: incidente.id,
        taller_id: selectedWorkshop.id,
        taller_nombre: selectedWorkshop.nombre,
        costo_estimado: parseFloat(costoEstimado),
        tiempo_estimado_minutos: parseInt(tiempoEstimado),
        descripcion: descripcionOferta
      };

      await apiService.crearCotizacion(activeTenant.id, bidPayload);
      
      setBidSent(true);
      setTimeout(() => {
        setBidSent(false);
        router.push("/dashboard/taller");
      }, 2500);
      
    } catch (err) {
      console.error(err);
      alert("Error al registrar cotización. Intente nuevamente.");
    } finally {
      setSubmittingBid(false);
    }
  };

  if (loading || !activeTenant || !incidente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Cargando Solicitud...</p>
      </div>
    );
  }

  const isCrit = incidente.prioridad_ia === "critica";
  const isHigh = incidente.prioridad_ia === "alta";
  const priorityColor = isCrit ? "text-red-600 border-red-500/20 bg-red-500/5" : isHigh ? "text-amber-600 border-amber-500/20 bg-amber-500/5" : "text-slate-500 border-[var(--border)] bg-slate-50";

  return (
    <RoleGuard allowedRoles={["taller"]}>
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] font-sans antialiased flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative">
        
        {/* Glow backgrounds */}
        <div className="absolute top-[-5%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-20">
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

        {/* Dynamic Bid Sent Overlay Toast */}
        {bidSent && (
          <div className="fixed inset-0 z-50 bg-[var(--bg)]/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
            <div className="p-8 rounded-3xl bg-white border border-[var(--border)] text-center space-y-4 max-w-xs shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black uppercase text-[var(--text)] tracking-wider">¡Cotización Enviada!</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                El presupuesto fue cargado en la subasta inversa. Esperando confirmación de asignación...
              </p>
            </div>
          </div>
        )}

        {/* Main Panel Content */}
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 z-10 flex flex-col gap-6 animate-fadeIn">
          
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/taller")}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-xs font-black uppercase tracking-wider border-none bg-transparent cursor-pointer self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>

          {/* SECCIÓN 1: DETALLE DE INCIDENTE */}
          <div className="glass-panel p-6 border border-[var(--border)] rounded-[24px] space-y-6 shadow-2xl relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none blur-xl" />

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <span className="label-caps !text-[9px] text-[var(--text-muted)]">ID Caso #{incidente.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${priorityColor}`}>
                  Prioridad {incidente.prioridad_ia || "media"}
                </span>
              </div>

              {/* Gemini Complete AI summary */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-500/20 rounded-2xl space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" /> Diagnóstico Avanzado de IA
                </span>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {incidente.analisis_ia ? (
                    <FormattedText text={incidente.analisis_ia} />
                  ) : (
                    "Gemini IA ha clasificado esta emergencia vial tras procesar las evidencias suministradas por el conductor."
                  )}
                </div>
              </div>

              {/* Vehicle information sheet */}
              <div className="bg-slate-50 border border-[var(--border)] p-4 rounded-2xl space-y-3.5 text-xs text-[var(--text-secondary)]">
                <h4 className="label-caps !text-[9px] flex items-center gap-1 border-b border-[var(--border)] pb-2 text-[var(--text-muted)]">
                  <Car className="w-3.5 h-3.5" /> Vehículo Afectado
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[var(--text-muted)] font-bold uppercase text-[9px] block">Modelo</span>
                    <span className="font-bold text-[var(--text)] text-[11px] mt-0.5 block">{incidente.vehiculo_modelo}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-bold uppercase text-[9px] block">Placa GPRS</span>
                    <span className="font-mono font-bold text-[var(--text)] text-[11px] mt-0.5 block">{incidente.vehiculo_placa || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Leaflet small map with client pin */}
              <div className="space-y-2">
                <h4 className="label-caps !text-[9px] flex items-center gap-1 text-[var(--text-muted)]">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Ubicación del Chofer
                </h4>
                <div className="w-full h-44 rounded-2xl overflow-hidden border border-[var(--border)] relative pointer-events-none">
                  <SimpleMap lat={incidente.latitude} lng={incidente.longitude} />
                </div>
              </div>

              {/* Evidences (Photo thumbnail & Audio player) */}
              <div className="space-y-3">
                <h4 className="label-caps !text-[9px] text-[var(--text-muted)]">Evidencias Recolectadas</h4>
                <div className="grid grid-cols-1 gap-3.5">
                  
                  {/* Photo thumbnail */}
                  {fotoEvidencia && (
                    <>
                      <div className="bg-slate-50 border border-[var(--border)] p-3.5 rounded-2xl flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="font-bold text-[var(--text)]">Registro Fotográfico</p>
                            <p className="text-[var(--text-muted)] text-[10px]">Capturado desde la cámara móvil</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                          className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-[var(--border)] rounded-xl text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer transition-all"
                        >
                          {isPhotoExpanded ? "Ocultar" : "Ver Foto"}
                        </button>
                      </div>

                      {/* Photo Expand Box */}
                      {isPhotoExpanded && (
                        <div className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-100 flex items-center justify-center p-2 animate-fadeIn relative">
                          <img 
                            src={fotoEvidencia.url_gcs} 
                            alt="Evidencia motor" 
                            className="w-full h-auto object-cover max-h-[300px] rounded-xl shadow-lg"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Audio Element native player */}
                  {audioEvidencia && (
                    <div className="bg-slate-50 border border-[var(--border)] p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="font-bold text-[var(--text)]">Mensaje de Voz</p>
                            <p className="text-[var(--text-muted)] text-[10px]">Detalle de falla (grabado por chofer)</p>
                          </div>
                        </div>
                      </div>

                      <audio 
                        controls 
                        src={audioEvidencia.url_gcs} 
                        className="w-full h-8 opacity-90 custom-audio-player focus:outline-none"
                      />

                      {audioEvidencia.transcripcion && (
                        /* Transcription accordion */
                        <div className="border-t border-[var(--border)] pt-2">
                          <button
                            onClick={() => setIsAudioTransOpen(!isAudioTransOpen)}
                            className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] hover:text-emerald-600 transition-colors bg-transparent border-none cursor-pointer"
                          >
                            <span>Ver transcripción del audio</span>
                            <span>{isAudioTransOpen ? "▼" : "▶"}</span>
                          </button>
                          
                          {isAudioTransOpen && (
                            <p className="text-[10px] text-[var(--text-secondary)] italic leading-relaxed mt-2 p-2 bg-slate-100/50 rounded-lg border border-[var(--border)]">
                              "{audioEvidencia.transcripcion}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!fotoEvidencia && !audioEvidencia && (
                    <p className="text-zinc-500 text-[10px] italic text-center py-4">
                      No se adjuntaron evidencias multimedia para esta solicitud.
                    </p>
                  )}

                </div>
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: SELECCIÓN DE TÉCNICO DISPONIBLE */}
          <div className="glass-panel p-6 border border-[var(--border)] rounded-[24px] space-y-4 shadow-2xl bg-white">
            <h4 className="label-caps !text-[9px] flex items-center gap-1.5 text-[var(--text-secondary)]">
              <UserCheck className="w-4 h-4 text-[var(--primary)]" /> Asignación de Técnico Asistencia
            </h4>
            <div className="space-y-3 text-xs">
              <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                Selecciona al mecánico disponible para despacho:
              </label>
              
              <select
                value={selectedTecnicoId}
                onChange={(e) => setSelectedTecnicoId(e.target.value)}
                className="glass-input w-full cursor-pointer focus:outline-none"
              >
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id} className="bg-white text-[var(--text)]">
                    {t.nombre} ({t.disponible ? "Disponible" : "Ocupado"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECCIÓN 3: FORMULARIO DE COTIZACIÓN */}
          <div className="glass-panel p-6 border-l-[5px] border-l-emerald-500 border border-slate-200/80 rounded-[24px] space-y-5 shadow-2xl relative overflow-hidden bg-white">
            {/* Background ambient light when IA is running */}
            {isGeneratingAI && (
              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="label-caps !text-[9px] flex items-center gap-1.5 m-0 text-slate-500 font-extrabold tracking-widest uppercase">
                <Coins className="w-4 h-4 text-emerald-600 animate-pulse" /> Presupuestar Asistencia (Bs.)
              </h4>
              
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={isGeneratingAI}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/30 rounded-xl text-[9.5px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-103 active:scale-97 border-none"
              >
                {isGeneratingAI ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Sugerir Tarifa</span>
                  </>
                )}
              </button>
            </div>

            {aiSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Propuesta Recomendada</p>
                  <p className="text-[10px] text-slate-700 leading-normal">{aiSuccessMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSendBidSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest block">
                    Monto Presupuesto
                  </label>
                  <div className="relative rounded-2xl transition-all shadow-sm">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-extrabold text-[12px] select-none">Bs.</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={costoEstimado}
                      onChange={(e) => setCostoEstimado(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded-2xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest block">
                    Tiempo Estimado
                  </label>
                  <div className="relative rounded-2xl transition-all shadow-sm">
                    <input
                      type="number"
                      placeholder="15"
                      value={tiempoEstimado}
                      onChange={(e) => setTiempoEstimado(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded-2xl py-3.5 px-4 pr-14 text-xs font-mono font-bold focus:outline-none transition-all"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider select-none">Mins</span>
                  </div>
                </div>

              </div>

              <div className="space-y-1.5">
                <label className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest block">
                  Descripción y Alcance del Servicio
                </label>
                <textarea
                  placeholder="Detalla qué incluye tu asistencia (ej. grúa de remolque, recarga de batería por puente, diagnóstico de fusibles...)"
                  value={descripcionOferta}
                  onChange={(e) => setDescripcionOferta(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded-2xl py-3.5 px-4 h-28 resize-none text-xs font-medium leading-relaxed focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/taller")}
                  className="btn-secondary !px-4 !py-3.5 !text-[10px] flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Ignorar</span>
                </button>
                
                <button
                  type="submit"
                  disabled={submittingBid}
                  className="btn-primary flex-1 !py-3.5 !text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 border-none cursor-pointer hover:scale-102 transition-all animate-none"
                >
                  {submittingBid ? (
                    <span>Registrando Oferta...</span>
                  ) : (
                    <>
                      <span>Enviar Cotización</span>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

        </main>

        {/* Footer info line */}
        <footer className="w-full py-6 text-center text-[10px] text-[var(--text-muted)] z-10 border-t border-[var(--border)] bg-[var(--bg)]/80">
          <p>© 2026 Auxilio.AI</p>
        </footer>

      </div>
    </RoleGuard>
  );
}
