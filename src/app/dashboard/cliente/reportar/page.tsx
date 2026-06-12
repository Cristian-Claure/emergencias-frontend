"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth, Vehiculo } from "@/services/apiService";
import { Tenant, Workshop, Incidente } from "@/services/mockData";
import { 
  AlertTriangle, 
  Car, 
  MapPin, 
  Camera, 
  Mic, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Plus, 
  Volume2, 
  Sparkles,
  WifiOff,
  Navigation,
  ArrowRight,
  ShieldCheck,
  MessageSquare
} from "lucide-react";

// Dynamic import for DraggableMap to avoid SSR Leaflet window errors
const DraggableLeafletMap = dynamic(
  () => import("./DraggableLeafletMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#f8faf9] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

export default function ReportarEmergencia() {
  const router = useRouter();

  // Step state: 1 | 2 | 3 | 4
  const [step, setStep] = useState<number>(1);

  // App context state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [vehicles, setVehicles] = useState<Vehiculo[]>([]);
  
  // Form fields
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [latitude, setLatitude] = useState<number>(-17.7833); // Default coordinate centered at Santa Cruz, Bolivia
  const [longitude, setLongitude] = useState<number>(-63.1812);
  const [descripcion, setDescripcion] = useState<string>("");
  const [fotoFile, setFotoFile] = useState<File | undefined>(undefined);
  const [audioFile, setAudioFile] = useState<File | undefined>(undefined);
  
  // Media states
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioRecorded, setAudioRecorded] = useState(false);

  // Quick vehicle registration fields
  const [showVForm, setShowVForm] = useState(false);
  const [vMarca, setVMarca] = useState("");
  const [vModelo, setVModelo] = useState("");
  const [vAño, setVAño] = useState("");
  const [vPlaca, setVPlaca] = useState("");
  const [vColor, setVColor] = useState("");
  const [submittingV, setSubmittingV] = useState(false);

  // Active incident state
  const [activeIncidentId, setActiveIncidentId] = useState<string | number | null>(null);
  const [checkingActiveEmergency, setCheckingActiveEmergency] = useState<boolean>(true);

  // Operational states
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [submittingEmergency, setSubmittingEmergency] = useState(false);

  // Error validations states
  const [locationError, setLocationError] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationSuccess, setLocationSuccess] = useState<boolean>(false);
  const [fotoError, setFotoError] = useState<string>("");
  const [audioError, setAudioError] = useState<string>("");

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_PHOTO_EXTS = ["jpg", "jpeg", "png", "webp"];
  const ALLOWED_AUDIO_EXTS = ["mp3", "wav", "ogg", "m4a", "webm"];

  const validateFile = (file: File, allowedExts: string[]): string => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext) || file.size > MAX_SIZE) {
      return `Archivo no permitido. Usa ${allowedExts.join(", ")}. Máximo 10MB.`;
    }
    return "";
  };

  const handleNextStep2 = () => {
    if (latitude === 0 && longitude === 0) {
      setLocationError("No pudimos obtener tu ubicación. Por favor mueve el pin manualmente.");
      return;
    }
    setLocationError("");
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (fotoError || audioError) {
      return;
    }
    setStep(4);
  };

  const fileInputFotoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Initialize Configurations
  useEffect(() => {
    const initApp = async () => {
      const tenantList = apiService.getTenants();
      setTenants(tenantList);

      const savedTenantId = localStorage.getItem("active_tenant_id");
      const matchedTenant = tenantList.find(t => t.id === savedTenantId) || tenantList[0];
      setActiveTenant(matchedTenant);

      const isLive = await checkBackendHealth();
      setIsBackendConnected(isLive);

      if (typeof window !== "undefined") {
        setIsOnline(navigator.onLine);
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);

        const params = new URLSearchParams(window.location.search);
        const descParam = params.get("descripcion");
        if (descParam) {
          setDescripcion(descParam);
        }
      }

      // Check for active emergencies
      try {
        setCheckingActiveEmergency(true);
        const incData = await apiService.getIncidentes(matchedTenant.id);
        const activeInc = incData.find(i => 
          i.tenant_id === matchedTenant.id && 
          i.estado !== "pagado" && 
          i.estado !== "cancelado"
        );
        if (activeInc) {
          setActiveIncidentId(activeInc.id);
        } else {
          setActiveIncidentId(null);
        }
      } catch (e) {
        console.error("Error checking active incidents", e);
      } finally {
        setCheckingActiveEmergency(false);
      }

      setLoading(false);
    };
    initApp();
  }, []);

  // Fetch operational driver vehicles
  const fetchVehicles = async () => {
    if (!activeTenant) return;
    try {
      const vehs = await apiService.getVehiculos(activeTenant.id);
      setVehicles(vehs);
      if (vehs.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vehs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchVehicles();
    }
  }, [activeTenant]);

  const handleTenantChange = async (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setSelectedVehicleId("");
      setVehicles([]);
      localStorage.setItem("active_tenant_id", tenantId);

      // Check for active emergencies
      try {
        setCheckingActiveEmergency(true);
        const incData = await apiService.getIncidentes(tenantId);
        const activeInc = incData.find(i => 
          i.tenant_id === tenantId && 
          i.estado !== "pagado" && 
          i.estado !== "cancelado"
        );
        if (activeInc) {
          setActiveIncidentId(activeInc.id);
        } else {
          setActiveIncidentId(null);
        }
      } catch (e) {
        console.error("Error checking active incidents", e);
      } finally {
        setCheckingActiveEmergency(false);
      }
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

  // Browser Geolocation API Pin locator
  const handleLocateMe = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("La geolocalización no está soportada por tu navegador.");
      return;
    }

    setIsLocating(true);
    setLocationError("");
    setLocationSuccess(false);

    const optionsHigh = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    const optionsCoarse = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setIsLocating(false);
        if (pos.coords.latitude === 0 && pos.coords.longitude === 0) {
          setLocationError("Ubicación nula. Por favor arrastra el pin manualmente.");
        } else {
          setLocationError("");
          setLocationSuccess(true);
          setTimeout(() => setLocationSuccess(false), 4000);
        }
      },
      (err) => {
        console.warn("High accuracy GPS failed, falling back to coarse network position...", err);
        navigator.geolocation.getCurrentPosition(
          (posFallback) => {
            setLatitude(posFallback.coords.latitude);
            setLongitude(posFallback.coords.longitude);
            setIsLocating(false);
            setLocationError("");
            setLocationSuccess(true);
            setTimeout(() => setLocationSuccess(false), 4000);
          },
          (errFallback) => {
            console.error("Fallback coarse position also failed", errFallback);
            setIsLocating(false);
            setLocationError("No pudimos determinar tu posición por GPS ni Red. Por favor mueve el marcador rojo.");
          },
          optionsCoarse
        );
      },
      optionsHigh
    );
  };

  // Draggable pin position change tracker
  const handleMarkerPositionChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    if (lat !== 0 || lng !== 0) {
      setLocationError("");
    }
  };

  // Quick Inline vehicle registration
  const handleQuickRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!vMarca || !vModelo || !vAño || !vPlaca || !vColor) {
      alert("Por favor complete todos los campos del vehículo.");
      return;
    }

    setSubmittingV(true);
    try {
      const payload = {
        marca: vMarca,
        modelo: vModelo,
        año: vAño,
        placa: vPlaca.toUpperCase(),
        color: vColor
      };

      const newV = await apiService.crearVehiculo(activeTenant.id, payload);
      
      setVMarca("");
      setVModelo("");
      setVAño("");
      setVPlaca("");
      setVColor("");
      setShowVForm(false);

      // Refresh and auto-select
      const list = await apiService.getVehiculos(activeTenant.id);
      setVehicles(list);
      setSelectedVehicleId(newV.id);

      alert("Vehículo registrado exitosamente.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al registrar el vehículo.");
    } finally {
      setSubmittingV(false);
    }
  };

  // MediaRecorder audio capture notes
  const startRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tu dispositivo no soporta grabador de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const audioFileObj = new File([audioBlob], "audio_evidencia.wav", { type: "audio/wav" });
        const err = validateFile(audioFileObj, ALLOWED_AUDIO_EXTS);
        setAudioError(err);
        if (!err) {
          setAudioFile(audioFileObj);
          setAudioRecorded(true);
        } else {
          setAudioFile(undefined);
          setAudioRecorded(false);
        }
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      // Start 60s countdown timer
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (e) {
      console.error(e);
      alert("No se pudo iniciar la grabación de voz.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      // Stop media stream tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach((track: any) => track.stop());
    }
  };

  // Submit Emergency Report
  const handleReportSubmit = async () => {
    if (!activeTenant) return;
    if (!selectedVehicleId) {
      alert("Debes seleccionar un vehículo.");
      setStep(1);
      return;
    }

    setSubmittingEmergency(true);
    try {
      const incidentData = {
        vehiculo_id: selectedVehicleId,
        latitud: latitude,
        longitud: longitude,
        descripcion_texto: descripcion
      };

      const newInc = await apiService.createIncidente(
        activeTenant.id, 
        incidentData, 
        fotoFile, 
        audioFile, 
        offlineMode || !isOnline
      );
      
      if (offlineMode || !isOnline) {
        alert("Sin conexión: El auxilio se guardó localmente. Se sincronizará automáticamente cuando vuelva internet.");
        router.push("/dashboard/cliente");
      } else {
        alert("Auxilio declarado exitosamente. La IA de Gemini está analizando tu caso...");
        router.push(`/dashboard/cliente/emergencia/${newInc.id}`);
      }
    } catch (e) {
      console.error(e);
      alert("Fallo al reportar la emergencia.");
    } finally {
      setSubmittingEmergency(false);
    }
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  if (loading || checkingActiveEmergency || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9] text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verificando Estado del Cliente...</p>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["cliente"]}>
      <div className="min-h-screen w-full bg-[#f8faf9] text-slate-800 font-sans antialiased overflow-hidden flex flex-col selection:bg-emerald-600 selection:text-white relative">
        
        {/* Offline global banner indicator */}
        {(!isOnline || offlineMode) && (
          <div className="w-full bg-amber-500 text-zinc-950 px-4 py-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse z-50 sticky top-0 shadow-lg shrink-0">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Sin conexión — tu emergencia se guardará localmente</span>
          </div>
        )}

        {/* Header bar */}
        <div className="w-full z-20 shrink-0">
          <Header
            tenants={tenants}
            activeTenant={activeTenant}
            onTenantChange={handleTenantChange}
            activeRole="cliente"
            isBackendConnected={isBackendConnected}
            offlineMode={offlineMode}
            onOfflineModeToggle={handleOfflineToggle}
          />
        </div>

        {/* Map Workspace (Full Screen Background) */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col">
          
          {/* Draggable Map Canvas in Background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <DraggableLeafletMap
              lat={latitude}
              lng={longitude}
              onMarkerDrag={handleMarkerPositionChange}
            />
          </div>

          {/* Copyright overlay on map */}
          <div className="absolute bottom-3 right-3 z-10 hidden md:block bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none pointer-events-none">
            © 2026 Auxilio.AI
          </div>

          {activeIncidentId !== null ? (
            /* ACTIVE EMERGENCY PANEL OVERLAY */
            <div className="z-10 w-full md:w-[400px] fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:top-6 md:left-6 bg-white/95 backdrop-blur-md border border-emerald-100/50 shadow-2xl rounded-t-3xl md:rounded-3xl p-6 pb-24 md:pb-6 flex flex-col gap-5 text-center animate-scaleUp max-h-[72vh] md:max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex justify-center relative">
                <div className="absolute inset-0 w-16 h-16 bg-amber-500/20 rounded-full blur-xl mx-auto" />
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 relative z-10 animate-pulse">
                  <AlertTriangle className="w-9 h-9" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-amber-600 tracking-widest font-black block uppercase">Servicio en Curso</span>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Emergencia Activa</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para garantizar una asistencia rápida y coordinada, solo se permite una solicitud activa a la vez. Actualmente tienes un reporte en proceso de auxilio.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => router.push(`/dashboard/cliente/emergencia/${activeIncidentId}`)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer transition-all border-none"
                >
                  <span>Monitorear Emergencia</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    sessionStorage.setItem("skip_active_redirect", "true");
                    router.push("/dashboard/cliente");
                  }}
                  className="w-full py-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Ir a Consola Principal</span>
                </button>
              </div>
            </div>
          ) : (
            /* WIZARD DRAWER OVERLAY PANEL */
            <div className="z-10 w-full md:w-[400px] fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:top-6 md:left-6 bg-white/95 backdrop-blur-md border border-emerald-100/30 shadow-2xl rounded-t-3xl md:rounded-3xl p-5 pb-24 md:pb-6 flex flex-col justify-between max-h-[72vh] md:max-h-[calc(100vh-120px)] overflow-y-auto transition-all duration-300">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-xs select-none shrink-0">
                <button
                  onClick={() => router.push("/dashboard/cliente")}
                  className="flex items-center gap-0.5 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase text-[9px] cursor-pointer bg-transparent border-none p-0"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                  <span>Cancelar</span>
                </button>
                <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Paso {step}/4</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(s => (
                    <div 
                      key={s} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        s === step ? "w-6 bg-emerald-600" : s < step ? "w-2 bg-emerald-500" : "w-2 bg-slate-200"
                      }`} 
                    />
                  ))}
                </div>
              </div>

              {/* Wizard steps content router */}
              <div className="flex-1 flex flex-col justify-between">
                
                {/* STEP 1: VEHICLE */}
                {step === 1 && (
                  <div className="space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">Paso 1 — Relación de Coche</span>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Car className="w-5 h-5 text-emerald-500" /> ¿Qué coche utilizas?
                        </h3>
                      </div>

                      {showVForm ? (
                        /* Quick register vehicle inline form */
                        <form onSubmit={handleQuickRegisterVehicle} className="space-y-3.5 text-xs font-semibold animate-scaleUp">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[9px] font-extrabold uppercase text-emerald-600">Registrar mi Vehículo</span>
                            <button
                              type="button"
                              onClick={() => setShowVForm(false)}
                              className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Marca</label>
                              <input
                                type="text"
                                placeholder="Ej. Toyota"
                                value={vMarca}
                                onChange={(e) => setVMarca(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs focus:outline-none transition-colors"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Modelo</label>
                              <input
                                type="text"
                                placeholder="Ej. Hilux"
                                value={vModelo}
                                onChange={(e) => setVModelo(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs focus:outline-none transition-colors"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Año</label>
                              <input
                                type="text"
                                placeholder="Ej. 2022"
                                value={vAño}
                                onChange={(e) => setVAño(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs focus:outline-none transition-colors"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Color</label>
                              <input
                                type="text"
                                placeholder="Blanco"
                                value={vColor}
                                onChange={(e) => setVColor(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs focus:outline-none transition-colors"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Placa</label>
                              <input
                                type="text"
                                placeholder="Placa"
                                value={vPlaca}
                                onChange={(e) => setVPlaca(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs uppercase focus:outline-none transition-colors"
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={submittingV}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl border-none shadow-md cursor-pointer transition-all"
                          >
                            {submittingV ? "Registrando..." : "Guardar Vehículo"}
                          </button>
                        </form>
                      ) : (
                        /* Select vehicle dropdown */
                        <div className="space-y-4 text-xs">
                          {vehicles.length === 0 ? (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-3 animate-fadeIn">
                              <p className="text-xs text-slate-500 italic">No tienes vehículos registrados en este Tenant.</p>
                              <button
                                type="button"
                                onClick={() => setShowVForm(true)}
                                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Registra tu vehículo primero
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 animate-fadeIn">
                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Vehículo para el servicio</label>
                              <select
                                value={selectedVehicleId}
                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-950 font-bold text-xs p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer uppercase"
                                required
                              >
                                {vehicles.map(v => (
                                  <option key={v.id} value={v.id} className="bg-white text-slate-900">
                                    {v.placa} — {v.marca} {v.modelo} ({v.color})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setShowVForm(true)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-500 font-extrabold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 mt-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Registrar Otro Vehículo
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!showVForm && (
                      <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3 mt-6 shrink-0">
                        <button
                          onClick={() => router.push("/dashboard/cliente")}
                          className="px-5 py-3 rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer border-none"
                        >
                          Volver
                        </button>
                        <button
                          onClick={() => setStep(2)}
                          disabled={vehicles.length === 0}
                          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer border-none flex items-center gap-1"
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: LOCATION */}
                {step === 2 && (
                  <div className="space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">Paso 2 — Localización</span>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-500 animate-pulse" /> Indica la Ubicación
                        </h3>
                        <p className="text-xs text-slate-500 leading-normal">
                          Hemos posicionado un pin en tu ubicación actual. Si no es precisa, puedes arrastrar el marcador verde directamente sobre el mapa de fondo para corregirla.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5 shadow-inner">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Coordenadas del incidente</span>
                        <p className="font-mono text-emerald-700 bg-white border border-emerald-100 px-3 py-1.5 rounded-xl text-center text-xs font-bold select-all">
                          {latitude.toFixed(5)}, {longitude.toFixed(5)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleLocateMe}
                          disabled={isLocating}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border-none shadow-md"
                        >
                          {isLocating ? (
                            <>
                              <RefreshCw className="w-4 h-4 text-white animate-spin" />
                              <span>Buscando GPS...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4 text-white animate-pulse" />
                              <span>Centrar en mi ubicación</span>
                            </>
                          )}
                        </button>

                        {locationError && (
                          <p className="text-red-600 font-bold text-[10px] text-center bg-red-50 border border-red-100 py-2.5 rounded-xl shadow-sm animate-fadeIn">
                            {locationError}
                          </p>
                        )}
                        {locationSuccess && (
                          <p className="text-emerald-700 font-bold text-[10px] text-center bg-emerald-50 border border-emerald-100 py-2.5 rounded-xl shadow-sm animate-fadeIn">
                            ¡Ubicación detectada con precisión!
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-6 shrink-0">
                      <button
                        onClick={() => setStep(1)}
                        className="px-5 py-3 rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer border-none"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={handleNextStep2}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer border-none flex items-center gap-1"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: DIAGNOSTIC / DESCRIPTION */}
                {step === 3 && (
                  <div className="space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">Paso 3 — Diagnóstico</span>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-emerald-500" /> Describe la Falla
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-100/50 bg-emerald-50 text-[9px] font-black text-emerald-700 uppercase tracking-wide">
                            <Sparkles className="w-3 h-3 text-emerald-500 shrink-0 animate-pulse" />
                            <span>Gemini IA activo</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Comentario Técnico</label>
                        <textarea
                          placeholder="Describe detalladamente qué sucede (ej. escucho ruidos raros en el motor, el arranque no tiene fuerza, tengo llanta pinchada...)"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          className="w-full h-24 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl py-3 px-4 text-xs focus:outline-none transition-colors resize-none"
                          required
                        />
                      </div>

                      {/* Evidence upload widgets */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-inner">
                        <span className="text-[8px] font-black text-slate-500 block tracking-widest text-center uppercase">
                          Adjuntar Evidencias (Opcional)
                        </span>

                        <div className="grid grid-cols-2 gap-3.5">
                          
                          {/* Photo attachment camera button */}
                          <div className="space-y-1">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              ref={fileInputFotoRef}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const file = e.target.files[0];
                                  const err = validateFile(file, ALLOWED_PHOTO_EXTS);
                                  setFotoError(err);
                                  if (!err) {
                                    setFotoFile(file);
                                    setFotoUrl(URL.createObjectURL(file));
                                  } else {
                                    setFotoFile(undefined);
                                    setFotoUrl("");
                                  }
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputFotoRef.current?.click()}
                              className={`w-full py-3 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                fotoFile 
                                  ? "bg-emerald-50 border-emerald-200/50 text-emerald-700" 
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              <Camera className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[100px]">{fotoFile ? fotoFile.name : "Cámara"}</span>
                            </button>
                            {fotoError && (
                              <p className="text-red-500 font-bold text-[9px] mt-1.5 leading-snug">
                                {fotoError}
                              </p>
                            )}
                          </div>

                          {/* Voice note recorder button */}
                          <div className="space-y-1">
                            {isRecording ? (
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="w-full py-3 px-3 bg-red-600 text-white rounded-xl border border-red-500/30 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                              >
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span>Detener ({60 - recordDuration}s)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={startRecording}
                                className={`w-full py-3 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                  audioRecorded 
                                    ? "bg-emerald-50 border-emerald-200/50 text-emerald-700" 
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                <Mic className="w-4 h-4 shrink-0" />
                                <span>{audioRecorded ? "Nota Grabada" : "Nota de Voz"}</span>
                              </button>
                            )}
                            {audioError && (
                              <p className="text-red-500 font-bold text-[9px] mt-1.5 leading-snug">
                                {audioError}
                              </p>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-6 shrink-0">
                      <button
                        onClick={() => setStep(2)}
                        className="px-5 py-3 rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer border-none"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={handleNextStep3}
                        disabled={!!fotoError || !!audioError}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer border-none flex items-center gap-1"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: AUDIT & CONFIRMATION */}
                {step === 4 && (
                  <div className="space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">Paso 4 — Auditoría</span>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500" /> Confirmar Solicitud
                        </h3>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl text-xs space-y-2.5 text-slate-700 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Vehículo</span>
                          <span className="font-black text-slate-950 uppercase">{currentVehicle ? `${currentVehicle.marca} ${currentVehicle.modelo}` : "Vehículo"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Placa</span>
                          <span className="font-mono text-slate-600 font-bold uppercase">{currentVehicle ? currentVehicle.placa : ""}</span>
                        </div>
                        {descripcion && (
                          <div className="border-t border-slate-200 pt-2 mt-1">
                            <span className="text-slate-500 font-bold uppercase text-[8px] block mb-1">Descripción de Falla</span>
                            <p className="italic text-slate-600 leading-normal">"{descripcion}"</p>
                          </div>
                        )}
                      </div>

                      {/* Location Recap */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                          <div>
                            <span className="font-bold text-slate-800 block">Ubicación Registrada</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Attachments feedback tags */}
                      {(fotoFile || audioFile) && (
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100/50 flex items-center justify-between text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                          <span>Evidencias Adjuntas</span>
                          <div className="flex items-center gap-2">
                            {fotoFile && <Camera className="w-4 h-4" />}
                            {audioFile && <Mic className="w-4 h-4 animate-bounce" />}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-6 shrink-0">
                      <button
                        onClick={() => setStep(3)}
                        className="px-5 py-3 rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer border-none"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={handleReportSubmit}
                        disabled={submittingEmergency}
                        className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/25 border-none"
                      >
                        {submittingEmergency ? (
                          <>
                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                            <span>Declarando Auxilio...</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4.5 h-4.5 text-white shrink-0 animate-pulse" />
                            <span>Reportar Emergencia</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
