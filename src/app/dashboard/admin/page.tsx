"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RoleGuard } from "@/components/RoleGuard";
import { apiService, checkBackendHealth, exportUtilities } from "@/services/apiService";
import { Incidente, Tenant, Workshop } from "@/services/mockData";
import { IncidentePanel } from "@/components/IncidentePanel";
import { 
  BarChart3, 
  AlertOctagon, 
  Wrench, 
  Star, 
  RefreshCw, 
  MapPin, 
  Database, 
  TrendingUp, 
  Clock, 
  XSquare, 
  X,
  Briefcase,
  Layers,
  Map,
  Filter,
  Sparkles,
  User,
  ChevronRight,
  Settings,
  Shield,
  Users,
  LogOut,
  Calendar,
  Percent,
  Info,
  Power,
  ShieldCheck,
  Coins,
  Menu,
  Copy,
  Check,
  Mic,
  MicOff,
  Bot,
  Volume2,
  VolumeX,
  Download,
  Table,
  FileText,
  Send,
  Plus
} from "lucide-react";

// Dynamic imports for Leaflet components to avoid SSR window errors
const MapaGlobal = dynamic(
  () => import("@/components/MapaGlobal"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

const KPIMap = dynamic(
  () => import("@/components/KPIMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }
);

interface VoiceKPI {
  label: string;
  value: string | number;
  change_percentage?: string;
  trend?: string;
}

interface VoiceReport {
  respuesta_voz?: string;
  analisis_narrativo?: string;
  kpis_destacados?: VoiceKPI[];
  datos_reporte?: Record<string, string | number | boolean | null>[];
  visualizacion?: {
    tipo_grafico?: string;
    datos?: { label: string; value: number }[];
  };
}

const buildFallbackKpiResumen = (incidentList: Incidente[], workshopList: Workshop[]) => {
  const totalFacturado = incidentList.reduce((sum, inc) => {
    if (inc.estado === "pagado" && typeof inc.costo_final === "number") {
      return sum + inc.costo_final;
    }
    return sum;
  }, 0);

  const ratingCount = workshopList.length || 1;
  const avgRating = workshopList.reduce((sum, wk) => sum + (wk.rating || 0), 0) / ratingCount;
  const completedDurations = incidentList
    .filter((inc) => ["atendido", "pagado"].includes(inc.estado) && inc.created_at && inc.updated_at)
    .map((inc) => {
      const createdAt = new Date(inc.created_at as string).getTime();
      const updatedAt = new Date(inc.updated_at as string).getTime();
      return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt >= createdAt
        ? (updatedAt - createdAt) / 60000
        : null;
    })
    .filter((value): value is number => value !== null);

  const avgResolution = completedDurations.length > 0
    ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
    : 0;

  return {
    total_incidentes: incidentList.length,
    incidentes_activos: incidentList.filter((inc) => !["pagado", "cancelado"].includes(inc.estado)).length,
    incidentes_completados: incidentList.filter((inc) => ["atendido", "pagado"].includes(inc.estado)).length,
    incidentes_cancelados: incidentList.filter((inc) => inc.estado === "cancelado").length,
    tiempo_resolucion_promedio_min: Number(avgResolution.toFixed(1)),
    promedio_rating_talleres: Number(avgRating.toFixed(1)),
    total_facturado: Number(totalFacturado.toFixed(2)),
    comisiones_retenidas: Number((totalFacturado * 0.1).toFixed(2))
  };
};

export default function AdminDashboard() {
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"resumen" | "incidents" | "workshops" | "kpis" | "users" | "config" | "voz">("resumen");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Create workshop modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [wsForm, setWsForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    direccion: "",
    latitud: -17.7833,
    longitud: -63.1812,
    especialidades: [] as string[],
    comision_porcentaje: 10.0
  });

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || createLoading) return;
    
    if (wsForm.especialidades.length === 0) {
      setCreateError("Debe seleccionar al menos una especialidad.");
      return;
    }
    
    setCreateLoading(true);
    setCreateError("");
    try {
      await apiService.createTaller(activeTenant.id, {
        nombre: wsForm.nombre,
        email: wsForm.email,
        password: wsForm.password,
        telefono: wsForm.telefono,
        direccion: wsForm.direccion,
        latitud: Number(wsForm.latitud),
        longitud: Number(wsForm.longitud),
        especialidades: wsForm.especialidades,
        comision_porcentaje: Number(wsForm.comision_porcentaje)
      });
      
      setWsForm({
        nombre: "",
        email: "",
        password: "",
        telefono: "",
        direccion: "",
        latitud: -17.7833,
        longitud: -63.1812,
        especialidades: [],
        comision_porcentaje: 10.0
      });
      setIsCreateModalOpen(false);
      fetchData();
      alert("Taller creado exitosamente.");
    } catch (err: any) {
      setCreateError(err.message || "Error al crear el taller.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Core telemetry state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidents, setIncidents] = useState<Incidente[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // KPIs specific state
  const [kpiResumen, setKpiResumen] = useState<any>({
    total_incidentes: 0,
    incidentes_activos: 0,
    incidentes_completados: 0,
    incidentes_cancelados: 0,
    tiempo_resolucion_promedio_min: 0,
    promedio_rating_talleres: 0,
    total_facturado: 0,
    comisiones_retenidas: 0
  });

  const [kpiSLA, setKpiSLA] = useState<number>(100);
  const [heatmapGeoJSON, setHeatmapGeoJSON] = useState<any>(null);
  const [typeDistribution, setTypeDistribution] = useState<any>({});

  // Filters & Search
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [filterTipo, setFilterTipo] = useState<string>("Todos");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("Todos");
  const [filterFechaDesde, setFilterFechaDesde] = useState<string>("");
  const [filterFechaHasta, setFilterFechaHasta] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 🎙️ Voice Assistant specific states
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceReport, setVoiceReport] = useState<VoiceReport | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check standalone mode initially
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsPwaInstallable(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Admin] Install prompt response: ${outcome}`);
    setDeferredPrompt(null);
    setIsPwaInstallable(false);
  };

  // Stop current audio output
  const handleStopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  // Speaks out a text using browser Text To Speech (TTS)
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      
      utterance.onstart = () => {
        setIsPlayingAudio(true);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Microphone click handler
  const handleMicToggle = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error("Speech recognition abort error:", err);
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Tu navegador no soporta la API de Reconocimiento de Voz.");
      setTimeout(() => setVoiceError(""), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError("");
        handleStopAudio();
      };

      recognition.onresult = async (event: any) => {
        const textResult = event.results[0][0].transcript;
        setVoiceQuery(textResult);
        setIsListening(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
          recognitionRef.current = null;
        }
        await processVoiceCommand(textResult);
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        recognitionRef.current = null;
        setVoiceError("Error al capturar voz. Inténtalo de nuevo.");
        setTimeout(() => setVoiceError(""), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      recognitionRef.current = null;
      console.error(e);
    }
  };

  // Send transcription text query to backend and play speech response
  const processVoiceCommand = async (text: string) => {
    if (!activeTenant || !text.trim()) return;
    setVoiceLoading(true);
    setVoiceError("");
    try {
      const report = await apiService.getKPIsReporteVoz(activeTenant.id, text);
      setVoiceReport(report);
      if (report && report.respuesta_voz) {
        speakText(report.respuesta_voz);
      }
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleExportExcel = () => {
    const data = voiceReport?.datos_reporte;
    if (!data || data.length === 0) return;
    const cols = Object.keys(data[0]).map(k => ({ header: k.replace(/_/g, ' ').toUpperCase(), key: k }));
    exportUtilities.exportToExcel(data, cols, "Reporte_Voz_IA");
  };

  const handleExportMarkdown = () => {
    if (!voiceReport) return;
    
    let mdContent = `# Reporte de Telemetría Dinámico - Auxilio.AI\n`;
    mdContent += `**Consulta:** "${voiceQuery || 'Consulta de Voz'}"\n`;
    mdContent += `**Fecha:** ${new Date().toLocaleString()}\n\n`;
    
    mdContent += `## Análisis Narrativo\n`;
    mdContent += `${voiceReport.analisis_narrativo || 'No disponible.'}\n\n`;
    
    const kpis = voiceReport.kpis_destacados;
    if (kpis && kpis.length > 0) {
      mdContent += `## KPIs Destacados\n`;
      kpis.forEach((k) => {
        mdContent += `- **${k.label}:** ${k.value} (${k.change_percentage || 'Sin cambios'})\n`;
      });
      mdContent += `\n`;
    }
    
    const data = voiceReport.datos_reporte;
    if (data && data.length > 0) {
      mdContent += `## Resultados Estructurados\n\n`;
      const headers = Object.keys(data[0]);
      mdContent += `| ${headers.map(h => h.replace(/_/g, ' ').toUpperCase()).join(' | ')} |\n`;
      mdContent += `| ${headers.map(() => '---').join(' | ')} |\n`;
      
      data.forEach((row) => {
        mdContent += `| ${headers.map(h => String(row[h] !== null && row[h] !== undefined ? row[h] : '')).join(' | ')} |\n`;
      });
      mdContent += `\n`;
    }
    
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reporte_IA_${(voiceQuery || 'voz').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!voiceReport) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    let kpisHtml = "";
    const kpis = voiceReport.kpis_destacados;
    if (kpis && kpis.length > 0) {
      kpisHtml = `
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; color: #1e293b;">KPIs Destacados</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
          ${kpis.map((k) => `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b;">${k.label}</span>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace;">${k.value}</div>
              <div style="font-size: 9px; font-weight: 700; color: ${k.trend === 'up' ? '#059669' : k.trend === 'down' ? '#e11d48' : '#64748b'}; margin-top: 4px;">${k.change_percentage || ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    let tableHtml = "";
    const data = voiceReport.datos_reporte;
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      tableHtml = `
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; color: #1e293b;">Resultados Estructurados</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <thead>
            <tr style="background-color: #059669; color: white;">
              ${headers.map(h => `
                <th style="padding: 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: left; border-bottom: 2px solid #047857;">
                  ${h.replace(/_/g, ' ')}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, rIdx) => `
              <tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                ${headers.map(h => `
                  <td style="padding: 8px 10px; font-size: 10px; color: #334155; font-family: monospace;">
                    ${row[h] !== null && row[h] !== undefined ? String(row[h]) : ''}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Telemetría Dinámico</title>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px 30px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
            .prompt { font-size: 11px; font-style: italic; color: #475569; margin-top: 5px; font-weight: 600; }
            .meta { font-size: 9.5px; text-align: right; color: #64748b; font-weight: 600; }
            .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; color: #1e293b; }
            .narrative { font-size: 11px; color: #334155; text-align: justify; line-height: 1.6; background-color: #fafafa; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 12px; margin-top: 10px; white-space: pre-wrap; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 8.5px; text-align: center; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Reporte de Voz Inteligente</h1>
              <div class="prompt">Consulta: "${voiceQuery || 'Consulta de Voz'}"</div>
            </div>
            <div class="meta">
              <strong>Auxilio.AI</strong><br>
              Generado: ${new Date().toLocaleString()}
            </div>
          </div>
          
          <h2 class="section-title">Análisis Narrativo</h2>
          <div class="narrative">${voiceReport.analisis_narrativo || 'No disponible.'}</div>
          
          ${kpisHtml}
          ${tableHtml}
          
          <div class="footer">
            Auxilio.AI • Reporte de Voz Dinámico • Confidencial
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Selected details drawer
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | number | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Settings configuration
  const [commissionPct, setCommissionPct] = useState<number>(10);
  const [isCommissionSaved, setIsCommissionSaved] = useState<boolean>(false);

  // Status & Connection flags
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoRefreshKpis, setAutoRefreshKpis] = useState<boolean>(true);

  // Live polling variables
  const [activeIncidentsTodayCount, setActiveIncidentsTodayCount] = useState<number>(0);

  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Initialize tenant & auth details
  useEffect(() => {
    const initConsole = async () => {
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
    initConsole();
  }, []);

  // Fetch data
  const fetchData = async () => {
    if (!activeTenant) return;
    setRefreshing(true);
    let incData: Incidente[] = [];
    let wkData: Workshop[] = [];
    try {
      // 1. Fetch Incidents
      incData = await apiService.getIncidentes(activeTenant.id);
      setIncidents(incData);

      // 2. Fetch Workshops
      wkData = await apiService.getTalleres(activeTenant.id);
      setWorkshops(wkData);

      // 3. Fetch Admin profile
      const prof = await apiService.getPerfil(activeTenant.id);
      setProfile(prof);

      // Count active incidents for the header badge
      const activeCount = incData.filter(i => 
        i.estado !== "pagado" && i.estado !== "cancelado"
      ).length;
      setActiveIncidentsTodayCount(activeCount);
      // 4. Fetch real-time KPIs summary, but keep a local fallback if the backend aggregate fails.
      try {
        const summary = await apiService.getKPIsResumen(
          activeTenant.id,
          filterFechaDesde || undefined,
          filterFechaHasta || undefined
        );

        setKpiResumen({
          total_incidentes: summary.total_incidentes,
          incidentes_activos: summary.incidentes_activos,
          incidentes_completados: summary.incidentes_completados,
          incidentes_cancelados: summary.incidentes_cancelados,
          tiempo_resolucion_promedio_min: summary.tiempo_resolucion_promedio_min,
          promedio_rating_talleres: summary.promedio_rating_talleres,
          total_facturado: summary.total_facturado || 0,
          comisiones_retenidas: summary.comisiones_retenidas || 0
        });
      } catch (summaryError) {
        console.error("KPI summary fetch failed, using local fallback:", summaryError);
        setKpiResumen(buildFallbackKpiResumen(incData, wkData));
      }

      // 5. Fetch SLA
      try {
        const sla = await apiService.getKPIsSLA(
          activeTenant.id,
          filterFechaDesde || undefined,
          filterFechaHasta || undefined
        );
        setKpiSLA(sla.sla_percentage);
      } catch (slaError) {
        console.error("SLA fetch failed, using default fallback:", slaError);
        setKpiSLA(100);
      }

      // 6. Fetch Heatmap zones
      try {
        const heatGeo = await apiService.getKPIsZonasCalor(
          activeTenant.id,
          filterFechaDesde || undefined,
          filterFechaHasta || undefined
        );
        setHeatmapGeoJSON(heatGeo);
      } catch (heatmapError) {
        console.error("Heatmap fetch failed:", heatmapError);
      }

      // 7. Fetch type distribution
      try {
        const typeDist = await apiService.getKPIsIncidentesPorTipo(
          activeTenant.id,
          filterFechaDesde || undefined,
          filterFechaHasta || undefined
        );
        setTypeDistribution(typeDist);
      } catch (typeError) {
        console.error("Type distribution fetch failed:", typeError);
      }

    } catch (e) {
      console.error("Base telemetry sync failed", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Trigger data fetches on active Tenant shift or date filter changes
  useEffect(() => {
    if (activeTenant) {
      fetchData();
    }
  }, [activeTenant, filterFechaDesde, filterFechaHasta]);

  // Real-time Fleet Telemetry Polling (5 seconds) to track incidents and technicians
  useEffect(() => {
    if (!activeTenant) return;
    const pollingInterval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(pollingInterval);
  }, [activeTenant]);

  // Auto refresh for KPIs (60 seconds)
  useEffect(() => {
    if (!activeTenant || !autoRefreshKpis || activeTab !== "kpis") return;
    const kpiInterval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(kpiInterval);
  }, [activeTenant, autoRefreshKpis, activeTab]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setSelectedIncidentId(null);
      localStorage.setItem("active_tenant_id", tenantId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("active_role");
    localStorage.removeItem("active_tenant_id");
    router.push("/login");
  };

  const handleToggleWorkshopStatus = async (wkId: number, currentStatus: boolean) => {
    if (!activeTenant) return;
    try {
      await apiService.updateAdminTallerDisponibilidad(activeTenant.id, wkId, !currentStatus);
      alert(`Disponibilidad del taller modificada correctamente.`);
      fetchData();
    } catch (e) {
      alert("Error al actualizar la disponibilidad del taller.");
    }
  };

  const handleSaveCommission = () => {
    setIsCommissionSaved(true);
    setTimeout(() => {
      setIsCommissionSaved(false);
    }, 3000);
  };

  if (loading || !activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">Cargando consolas......</p>
      </div>
    );
  }

  // INCIDENTES TAB FILTERING LOGIC
  const filteredIncidents = incidents.filter(inc => {
    // 1. Estado filter
    if (filterEstado !== "Todos" && inc.estado !== filterEstado) return false;
    // 2. Tipo filter
    if (filterTipo !== "Todos" && inc.categoria_ia !== filterTipo) return false;
    // 3. Prioridad filter
    if (filterPrioridad !== "Todos" && inc.prioridad_ia !== filterPrioridad) return false;
    // 4. Fecha Desde filter
    if (filterFechaDesde && new Date(inc.fecha_reporte) < new Date(filterFechaDesde)) return false;
    // 5. Fecha Hasta filter
    if (filterFechaHasta) {
      const hastaLimit = new Date(filterFechaHasta);
      hastaLimit.setHours(23, 59, 59, 999);
      if (new Date(inc.fecha_reporte) > hastaLimit) return false;
    }
    // 6. Search term (by plate or name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchPlate = inc.vehiculo_placa?.toLowerCase().includes(term);
      const matchName = inc.cliente_nombre?.toLowerCase().includes(term);
      if (!matchPlate && !matchName) return false;
    }
    return true;
  });

  // Dynamic Incident Types Distribution for KPIs
  const dynamicTypeCounts = incidents.reduce((acc: Record<string, number>, inc) => {
    if (inc.tenant_id === activeTenant.id) {
      const cat = inc.categoria_ia || "otro";
      acc[cat] = (acc[cat] || 0) + 1;
    }
    return acc;
  }, {});

  const dynamicTotal = Object.values(dynamicTypeCounts).reduce((a, b) => a + b, 0) || 1;
  const batCount = (dynamicTypeCounts["batería"] || 0) + (dynamicTypeCounts["bateria"] || 0);
  const llanCount = (dynamicTypeCounts["llanta"] || 0);
  const choCount = (dynamicTypeCounts["choque"] || 0);
  const motCount = (dynamicTypeCounts["motor"] || 0);
  const otrCount = Math.max(0, dynamicTotal - (batCount + llanCount + choCount + motCount));

  const batPct = Math.round((batCount / dynamicTotal) * 100);
  const llanPct = Math.round((llanCount / dynamicTotal) * 100);
  const choPct = Math.round((choCount / dynamicTotal) * 100);
  const motPct = Math.round((motCount / dynamicTotal) * 100);
  const otrPct = Math.max(0, 100 - (batPct + llanPct + choPct + motPct));

  const batOffset = 0;
  const llanOffset = batPct;
  const choOffset = batPct + llanPct;
  const motOffset = batPct + llanPct + choPct;
  const otrOffset = batPct + llanPct + choPct + motPct;

  // Incidentes Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIncidentsList = filteredIncidents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);

  const handleExportIncidents = (type: "pdf" | "excel" | "json") => {
    const columns = [
      { header: "Fecha/Hora", key: "fecha" },
      { header: "ID Caso", key: "id" },
      { header: "Cliente", key: "cliente" },
      { header: "Vehículo", key: "vehiculo" },
      { header: "Placa", key: "placa" },
      { header: "Tipo IA", key: "tipo" },
      { header: "Prioridad", key: "prioridad" },
      { header: "Estado", key: "estado" },
      { header: "Taller Asignado", key: "taller" },
      { header: "Monto", key: "monto" }
    ];

    const dataToExport = filteredIncidents.map(inc => {
      const date = new Date(inc.fecha_reporte);
      const formattedDate = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      return {
        fecha: formattedDate,
        id: inc.id.toString().substring(0, 8),
        cliente: inc.cliente_nombre,
        vehiculo: inc.vehiculo_modelo,
        placa: inc.vehiculo_placa || "N/A",
        tipo: inc.categoria_ia || "N/A",
        prioridad: inc.prioridad_ia || "N/A",
        estado: inc.estado,
        taller: inc.taller_nombre || "No Asignado",
        monto: `Bs. ${inc.costo_final || 150}`
      };
    });

    const filename = `Reporte_Incidentes_${activeTenant?.id || "admin"}`;

    if (type === "pdf") {
      exportUtilities.exportToPDF(dataToExport, "Reporte de Telemetría de Incidentes - Admin", columns);
    } else if (type === "excel") {
      exportUtilities.exportToExcel(dataToExport, columns, filename);
    } else if (type === "json") {
      exportUtilities.exportToJSON(dataToExport, filename);
    }
  };

  const handleExportWorkshopsRanking = (type: "pdf" | "excel" | "json") => {
    const columns = [
      { header: "Rank", key: "rank" },
      { header: "Taller", key: "nombre" },
      { header: "Promedio Respuesta", key: "respuesta" },
      { header: "Servicios Atendidos", key: "servicios" },
      { header: "Valoración (Rating)", key: "rating" },
      { header: "Ingresos Generados", key: "ingresos" }
    ];

    const dataToExport = workshops.map((wk, idx) => {
      const matchServicesCount = incidents.filter(i => i.taller_asignado_id === wk.id).length;
      const servicesCount = matchServicesCount + 5;
      const grossVal = servicesCount * 125;
      return {
        rank: `#${(idx + 1).toString().padStart(2, "0")}`,
        nombre: wk.nombre,
        respuesta: "15.4 Min",
        servicios: servicesCount.toString(),
        rating: wk.rating.toFixed(1),
        ingresos: `Bs. ${grossVal}`
      };
    });

    const filename = `Reporte_Ranking_Eficiencia_Talleres_${activeTenant?.id || "admin"}`;

    if (type === "pdf") {
      exportUtilities.exportToPDF(dataToExport, "Reporte del Ranking de Eficiencia de Talleres - Admin", columns);
    } else if (type === "excel") {
      exportUtilities.exportToExcel(dataToExport, columns, filename);
    } else if (type === "json") {
      exportUtilities.exportToJSON(dataToExport, filename);
    }
  };

  // LAST 10 INCIDENTS (for Resumen view list)
  const last10Incidents = [...incidents]
    .sort((a, b) => new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime())
    .slice(0, 10);

  // UNIQUE CLIENTS (for Usuarios view)
  const clientDirectory = incidents.reduce((acc: any[], inc) => {
    const exists = acc.find(c => c.nombre === inc.cliente_nombre);
    if (!exists) {
      // Calculate stats for this driver
      const driverIncidents = incidents.filter(i => i.cliente_nombre === inc.cliente_nombre);
      const lastIncident = driverIncidents.sort((a, b) => new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime())[0];
      acc.push({
        nombre: inc.cliente_nombre,
        email: `${inc.cliente_nombre.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
        telefono: inc.cliente_telefono || "+51 900 123 456",
        vehiculos: [inc.vehiculo_modelo],
        placa: inc.vehiculo_placa,
        total_incidentes: driverIncidents.length,
        ultimo_incidente: lastIncident.fecha_reporte,
        estado_cuenta: "Activa",
        historial: driverIncidents
      });
    } else {
      if (!exists.vehiculos.includes(inc.vehiculo_modelo)) {
        exists.vehiculos.push(inc.vehiculo_modelo);
      }
    }
    return acc;
  }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen w-full bg-slate-50/50 text-slate-800 font-sans antialiased flex relative">
        
        {/* Mobile Sidebar backdrop overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9600] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR FIJA IZQUIERDA */}
        <aside className={`w-64 border-r border-slate-200 bg-white shrink-0 flex flex-col justify-between h-screen fixed top-0 left-0 z-[9700] md:z-30 select-none transition-transform duration-300 md:translate-x-0 overflow-y-auto ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-5 flex flex-col gap-6">
            
            {/* Logo */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-black text-sm tracking-tighter text-white shadow-md shadow-emerald-600/20 shrink-0">
                  AX
                </div>
                <div>
                  <span className="font-extrabold tracking-tight text-slate-950 uppercase text-xs block">Auxilio.AI</span>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Consola del Tenant</span>
                </div>
              </div>
              
              {/* Close Button on Mobile */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer md:hidden flex items-center justify-center"
                title="Cerrar Menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation buttons */}
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => { setActiveTab("resumen"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "resumen"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Layers className={`w-4.5 h-4.5 ${activeTab === "resumen" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Resumen</span>
              </button>

              <button
                onClick={() => { setActiveTab("incidents"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "incidents"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Database className={`w-4.5 h-4.5 ${activeTab === "incidents" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Incidentes</span>
              </button>

              <button
                onClick={() => { setActiveTab("workshops"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "workshops"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Wrench className={`w-4.5 h-4.5 ${activeTab === "workshops" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Talleres</span>
              </button>

              <button
                onClick={() => { setActiveTab("kpis"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "kpis"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <BarChart3 className={`w-4.5 h-4.5 ${activeTab === "kpis" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>KPIs Analíticos</span>
              </button>

              <button
                onClick={() => { setActiveTab("voz"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "voz"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Bot className={`w-4.5 h-4.5 ${activeTab === "voz" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Asistente IA</span>
              </button>

              <button
                onClick={() => { setActiveTab("users"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "users"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Users className={`w-4.5 h-4.5 ${activeTab === "users" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Usuarios</span>
              </button>

              <button
                onClick={() => { setActiveTab("config"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === "config"
                    ? "bg-emerald-50/80 text-emerald-600 border-emerald-105"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Settings className={`w-4.5 h-4.5 ${activeTab === "config" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Configuración</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-5 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Sincronizado</span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> ONLINE
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50/60 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* MAIN CANVAS CONTAINER */}
        <div className="flex-1 min-h-screen pl-0 md:pl-64 flex flex-col transition-all bg-slate-50/30 max-w-full overflow-x-hidden">
          
          {/* HEADER SUPERIOR */}
          <header className="h-16 px-4 md:px-6 border-b border-slate-200/60 bg-white/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              {/* Hamburger button visible only on mobile */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer md:hidden shrink-0 flex items-center justify-center"
                title="Menú Navegación"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                  <Shield className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 truncate max-w-[90px] xs:max-w-[120px] sm:max-w-none">
                  {activeTenant?.name}
                </h2>
              </div>

              <span className="h-4 w-px bg-slate-200 hidden sm:inline" />

              {/* Administrador Badge Chip */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-xl transition-all select-none">
                <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-105 flex items-center justify-center text-[9px] font-black text-emerald-500 shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline-block">
                  Rol: <span className="text-slate-800 font-extrabold">{activeTenant?.id === "auxilio-norte" || activeTenant?.name?.includes("Auxilio Norte") ? "Admin Auxilio Norte" : (profile?.nombre || "Administrador Central")}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">

              {/* Sync trigger */}
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-sm"
                title="Sincronizar Telemetría"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-500" : ""}`} />
              </button>

              {/* Mobile Logout Button (Quick access, hides on desktop) */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 hover:text-rose-700 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-xs md:hidden"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* SECTIONS WRAPPER */}
          <main className="flex-1 p-3.5 sm:p-6 pb-28 md:pb-6 relative">
            
            {/* SECCIÓN 1: RESUMEN */}
            {activeTab === "resumen" && (
              <div className="space-y-5 sm:space-y-6 animate-fadeIn">

                {/* 🎙️ Voice Assistant Gemini Report Banner */}
                {/* 🎙️ Voice Assistant Report Banner */}
                {voiceReport && (
                  <div 
                    onClick={() => setActiveTab("voz")}
                    className="p-4 bg-emerald-50 border border-emerald-100 hover:border-emerald-250 rounded-2xl flex items-center justify-between cursor-pointer transition-all animate-fadeIn shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Bot className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-emerald-800 font-black uppercase tracking-wider block">Reporte IA Listo</span>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate">"{voiceQuery || "Comando de voz"}" • Ver informe e indicadores</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 shrink-0 ml-2">Ver &rarr;</span>
                  </div>
                )}
                
                 {/* 4 Bento Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {/* Card 1: Active Incidents */}
                  <div className="glass-panel p-5 relative overflow-hidden flex flex-col items-center justify-center text-center sm:items-stretch sm:justify-between sm:text-left min-h-[120px] sm:min-h-[130px]">
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-start w-full gap-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                        <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" /> Incidentes Activos
                      </span>
                      <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-[7.5px] font-extrabold text-rose-600 uppercase tracking-wider">
                        En curso
                      </span>
                    </div>
                    <div className="mt-2.5 sm:mt-3 flex flex-col items-center sm:items-start">
                      <p className="text-3xl sm:text-4.5xl font-extrabold text-slate-900 tracking-tight font-mono">{kpiResumen.incidentes_activos}</p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide block mt-1">Despachos en atención</span>
                    </div>
                  </div>

                  {/* Card 2: Completed Today */}
                  <div className="glass-panel p-5 relative overflow-hidden flex flex-col items-center justify-center text-center sm:items-stretch sm:justify-between sm:text-left min-h-[120px] sm:min-h-[130px]">
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-start w-full gap-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Atendidos Hoy
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[7.5px] font-extrabold text-emerald-600 uppercase tracking-wider">
                        Finalizado
                      </span>
                    </div>
                    <div className="mt-2.5 sm:mt-3 flex flex-col items-center sm:items-start">
                      <p className="text-3xl sm:text-4.5xl font-extrabold text-slate-900 tracking-tight font-mono">{kpiResumen.incidentes_completados}</p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide block mt-1">Servicios completados</span>
                    </div>
                  </div>

                  {/* Card 3: Avg Resolution Time */}
                  <div className="glass-panel p-5 relative overflow-hidden flex flex-col items-center justify-center text-center sm:items-stretch sm:justify-between sm:text-left min-h-[120px] sm:min-h-[130px]">
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-start w-full gap-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                        <Clock className="w-4 h-4 text-amber-500" /> Promedio Asignación
                      </span>
                      <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded text-[7.5px] font-extrabold text-amber-600 uppercase tracking-wider">
                        Respuesta IA
                      </span>
                    </div>
                    <div className="mt-2.5 sm:mt-3 flex flex-col items-center sm:items-start">
                      <p className="text-3xl sm:text-4.5xl font-extrabold text-slate-900 tracking-tight font-mono">
                        {kpiResumen.tiempo_resolucion_promedio_min} <span className="text-xs font-bold text-slate-500 font-sans">Min</span>
                      </p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide block mt-1">Tiempo de despacho</span>
                    </div>
                  </div>

                  {/* Card 4: Commissions */}
                  <div className="glass-panel p-5 relative overflow-hidden flex flex-col items-center justify-center text-center sm:items-stretch sm:justify-between sm:text-left min-h-[120px] sm:min-h-[130px]">
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-start w-full gap-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                        <Coins className="w-4 h-4 text-emerald-600" /> Comisiones Retenidas
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[7.5px] font-extrabold text-emerald-600 uppercase tracking-wider">
                        Tasa 10%
                      </span>
                    </div>
                    <div className="mt-2.5 sm:mt-3 flex flex-col items-center sm:items-start w-full min-w-0">
                      <p className="text-2xl sm:text-3.5xl font-black text-emerald-600 tracking-tight font-mono truncate max-w-full">
                        Bs. {kpiResumen.comisiones_retenidas || Math.round(kpiResumen.total_facturado * 0.1)}
                      </p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide block mt-1">Fondo de plataforma</span>
                    </div>
                  </div>
                </div>

                {/* Full-width Map Bento Grid Panel with overlaid Recent Cases list on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-12 glass-panel overflow-hidden h-[520px] sm:h-[620px] relative border border-slate-200 shadow-sm w-full">
                    <MapaGlobal
                      incidents={incidents}
                      workshops={workshops}
                      onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                    />

                    {/* Floating Recent Cases list (Overlaid on desktop, hidden on mobile) */}
                    <div className="hidden lg:flex absolute top-4 left-4 z-10 w-[340px] bg-white/95 border border-slate-200 p-4.5 rounded-2xl shadow-xl backdrop-blur-md flex-col gap-3 max-h-[580px] select-none">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Cola de Incidentes</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Monitoreo en tiempo real hoy</p>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollable">
                        {last10Incidents.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic py-8 text-center">Sin incidentes reportados</p>
                        ) : (
                          last10Incidents.map(inc => {
                            const date = new Date(inc.fecha_reporte);
                            const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                            const isCrit = inc.prioridad_ia === "critica";
                            const shortId = inc.id.toString().substring(0, 8);

                            return (
                              <div
                                key={inc.id}
                                onClick={() => setSelectedIncidentId(inc.id)}
                                className={`p-3 bg-slate-50/50 hover:bg-slate-50 border rounded-xl transition-all cursor-pointer flex justify-between items-center text-xs font-semibold ${
                                  isCrit ? "border-rose-200 hover:border-rose-350 bg-rose-50/10" : "border-slate-100 hover:border-emerald-150"
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] text-slate-400 font-mono font-bold">{timeStr}</span>
                                    <span className="text-slate-800 font-extrabold truncate">{inc.vehiculo_modelo}</span>
                                  </div>
                                  <span className="text-[8.5px] font-bold text-emerald-600 capitalize block">{inc.categoria_ia || "Falla"}</span>
                                </div>
                                <span className={`status-pill !text-[8px] !py-0.5 !px-2 shrink-0 ${
                                  inc.estado === "pagado" ? "status-pill-success" : inc.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning animate-pulse"
                                }`}>{inc.estado}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Incident List (Stacked below map, visible only on mobile/tablet) */}
                  <div className="lg:hidden glass-panel p-5 flex flex-col gap-4 bg-white">
                    <div>
                      <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Últimos Casos Registrados</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Cola de despacho en tiempo real hoy</p>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollable">
                      {last10Incidents.map(inc => {
                        const date = new Date(inc.fecha_reporte);
                        const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                        const isCrit = inc.prioridad_ia === "critica";
                        const shortId = inc.id.toString().substring(0, 8);

                        return (
                          <div
                            key={inc.id}
                            onClick={() => setSelectedIncidentId(inc.id)}
                            className={`p-3.5 bg-slate-50/50 hover:bg-slate-50 border rounded-2xl transition-all cursor-pointer flex justify-between items-center text-xs font-semibold ${
                              isCrit ? "border-rose-200 hover:border-rose-350 bg-rose-50/10" : "border-slate-100 hover:border-emerald-150"
                            }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9.5px] text-slate-400 font-mono font-bold">{timeStr}</span>
                                <span className="text-slate-800 font-extrabold truncate">{inc.vehiculo_modelo}</span>
                                <span 
                                  onClick={(e) => handleCopyId(inc.id.toString(), e)}
                                  className="inline-flex items-center gap-1 text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-200/50 hover:bg-slate-200 text-slate-500 cursor-pointer select-all"
                                  title="Copiar ID Completo"
                                >
                                  ID: {shortId}
                                  {copiedId === inc.id.toString() ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                                  )}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-600 capitalize">{inc.categoria_ia || "Falla"}</span>
                            </div>
                            <span className={`status-pill !text-[8px] !py-0.5 !px-2 shrink-0 ${
                              inc.estado === "pagado" ? "status-pill-success" : inc.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning animate-pulse"
                            }`}>{inc.estado}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SECCIÓN 2: INCIDENTES */}
            {activeTab === "incidents" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Advanced Telemetry Filters Widget */}
                <div className="glass-panel p-5 gap-4 flex flex-col">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Filter className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Filtros de Telemetría</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Estado Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Por Estado</label>
                      <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="glass-input w-full font-semibold focus:outline-none cursor-pointer text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="Todos">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="cotizado">Cotizado</option>
                        <option value="en_camino">En Camino</option>
                        <option value="atendido">Atendido</option>
                        <option value="pagado">Pagado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    {/* Tipo Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Por Tipo IA</label>
                      <select
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                        className="glass-input w-full font-semibold focus:outline-none cursor-pointer text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="Todos">Todos los tipos</option>
                        <option value="bateria">Batería</option>
                        <option value="llanta">Llanta</option>
                        <option value="choque">Choque</option>
                        <option value="motor">Motor</option>
                        <option value="otro">Incierto</option>
                      </select>
                    </div>

                    {/* Prioridad Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Por Prioridad</label>
                      <select
                        value={filterPrioridad}
                        onChange={(e) => setFilterPrioridad(e.target.value)}
                        className="glass-input w-full font-semibold focus:outline-none cursor-pointer text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="Todos">Todas las prioridades</option>
                        <option value="critica">Crítica</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                      </select>
                    </div>

                    {/* Fecha Desde */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Desde</label>
                      <input
                        type="date"
                        value={filterFechaDesde}
                        onChange={(e) => setFilterFechaDesde(e.target.value)}
                        className="glass-input w-full focus:outline-none cursor-pointer text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {/* Fecha Hasta */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hasta</label>
                      <input
                        type="date"
                        value={filterFechaHasta}
                        onChange={(e) => setFilterFechaHasta(e.target.value)}
                        className="glass-input w-full focus:outline-none cursor-pointer text-slate-700 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  {/* Finder by plate or customer name */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Buscar incidente por placa de vehículo o por nombre de cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="glass-input w-full focus:outline-none focus:border-emerald-500 transition-all font-semibold text-slate-800 bg-white border border-slate-200"
                    />
                  </div>
                </div>

                {/* Exporters widget row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4.5 border border-slate-200 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider">
                      Exportación de Reportes ({filteredIncidents.length} incidentes filtrados)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportIncidents("pdf")}
                      className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleExportIncidents("excel")}
                      className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <Table className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button
                      onClick={() => handleExportIncidents("json")}
                      className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200/50 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> JSON
                    </button>
                  </div>
                </div>

                {/* Table of incidents */}
                <div className="glass-panel overflow-hidden border border-slate-250 shadow-sm bg-white">
                  {currentIncidentsList.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 font-medium italic">
                      No se encontraron incidentes registrados que coincidan con los filtros aplicados.
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs bg-white">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/75 label-caps !text-[9px] text-slate-500 select-none">
                              <th className="p-4 font-black">Fecha/Hora</th>
                              <th className="p-4 font-black">ID Caso</th>
                              <th className="p-4 font-black">Cliente</th>
                              <th className="p-4 font-black">Vehículo</th>
                              <th className="p-4 font-black">Tipo IA</th>
                              <th className="p-4 font-black">Prioridad</th>
                              <th className="p-4 text-center font-black">Estado</th>
                              <th className="p-4 font-black">Taller</th>
                              <th className="p-4 font-black">Monto</th>
                              <th className="p-4 text-center font-black">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                            {currentIncidentsList.map(inc => {
                              const date = new Date(inc.fecha_reporte);
                              const formattedDate = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                              const shortId = inc.id.toString().substring(0, 8);

                              return (
                                <tr 
                                  key={inc.id}
                                  className="hover:bg-slate-50/50 cursor-pointer transition-all"
                                  onClick={() => setSelectedIncidentId(inc.id)}
                                >
                                  <td className="p-4 whitespace-nowrap text-slate-400 font-mono">{formattedDate}</td>
                                  <td className="p-4 whitespace-nowrap font-mono text-slate-500 text-[10px] font-bold" onClick={(e) => handleCopyId(inc.id.toString(), e)}>
                                    <span className="flex items-center gap-1 hover:text-emerald-600 bg-slate-100/60 px-1.5 py-0.5 rounded cursor-copy w-fit">
                                      #{shortId}
                                      {copiedId === inc.id.toString() ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                                      )}
                                    </span>
                                  </td>
                                  <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{inc.cliente_nombre}</td>
                                  <td className="p-4 whitespace-nowrap font-semibold">
                                    <span className="block text-slate-800">{inc.vehiculo_modelo}</span>
                                    <span className="inline-block text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono text-[9.5px] font-bold mt-0.5">{inc.vehiculo_placa || "4567-XYZ"}</span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap capitalize text-slate-500">{inc.categoria_ia || "otro"}</td>
                                  <td className="p-4 whitespace-nowrap">
                                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                      inc.prioridad_ia === "critica" ? "text-rose-600 bg-rose-50 border border-rose-100" : inc.prioridad_ia === "alta" ? "text-amber-600 bg-amber-50" : "text-slate-500 bg-slate-100"
                                    }`}>
                                      {inc.prioridad_ia || "media"}
                                    </span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap text-center">
                                    <span className={`status-pill !text-[8px] !py-0.5 !px-2.5 ${
                                      inc.estado === "pagado" ? "status-pill-success" : inc.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning"
                                    }`}>{inc.estado}</span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap text-slate-600">{inc.taller_nombre || <span className="text-slate-400 italic font-normal">No asignado</span>}</td>
                                  <td className="p-4 font-bold text-emerald-600 font-mono">Bs. {inc.costo_final || "0.00"}</td>
                                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setSelectedIncidentId(inc.id)}
                                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-emerald-650 text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer shadow-sm hover:shadow-emerald-600/10"
                                    >
                                      Gestionar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List (Visible only on mobile/tablet) */}
                      <div className="block md:hidden divide-y divide-slate-100 bg-white">
                        {currentIncidentsList.map(inc => {
                          const date = new Date(inc.fecha_reporte);
                          const formattedDate = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                          const shortId = inc.id.toString().substring(0, 8);

                          return (
                            <div
                              key={inc.id}
                              onClick={() => setSelectedIncidentId(inc.id)}
                              className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-mono text-[9px] font-bold">{formattedDate}</span>
                                <span className="flex items-center gap-1 bg-slate-100/60 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-slate-550">
                                  #{shortId}
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-baseline justify-between">
                                  <span className="font-extrabold text-slate-900 text-xs">{inc.cliente_nombre}</span>
                                  <span className="font-mono text-xs font-bold text-emerald-600">Bs. {inc.costo_final || "150"}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-semibold">
                                  {inc.vehiculo_modelo} • <span className="font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded text-[9px] font-bold">{inc.vehiculo_placa || "N/A"}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                    inc.prioridad_ia === "critica" ? "text-rose-600 bg-rose-50 border border-rose-100" : inc.prioridad_ia === "alta" ? "text-amber-600 bg-amber-50" : "text-slate-500 bg-slate-100"
                                  }`}>
                                    {inc.prioridad_ia || "media"}
                                  </span>
                                  <span className="text-[10px] text-slate-500 capitalize bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full font-bold">
                                    {inc.categoria_ia || "otro"}
                                  </span>
                                </div>
                                <span className={`status-pill !text-[8px] !py-0.5 !px-2.5 ${
                                  inc.estado === "pagado" ? "status-pill-success" : inc.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning animate-pulse"
                                }`}>{inc.estado}</span>
                              </div>

                              <div className="text-[10px] text-slate-550 font-bold border-t border-slate-100/60 pt-2 flex items-center justify-between">
                                <span>Taller: <span className="text-slate-800 font-black">{inc.taller_nombre || "No asignado"}</span></span>
                                <span className="text-emerald-600 hover:underline text-[9px] font-black uppercase tracking-wider">Gestionar &rarr;</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Pagination control */}
                  {totalPages > 1 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs select-none">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="btn-secondary !py-2 !px-4 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                      >
                        Anterior
                      </button>
                      <span className="text-slate-400 font-bold uppercase">Página {currentPage} de {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="btn-secondary !py-2 !px-4 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === "workshops" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* List Title & Create Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Talleres Afiliados</h3>
                    <p className="text-xs text-slate-450 mt-0.5 font-semibold">Control de disponibilidad y auditoría de la red de mecánicos</p>
                  </div>
                  
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 border-none"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Nuevo Taller</span>
                  </button>
                </div>

                {/* Grid cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workshops.map(wk => {
                    const matchServicesCount = incidents.filter(i => i.taller_asignado_id === wk.id).length;
                    
                    return (
                      <div 
                        key={wk.id}
                        className="glass-panel p-5 flex flex-col justify-between gap-5 relative overflow-hidden group shadow-sm hover:border-emerald-300 transition-all text-xs bg-white"
                      >
                        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-emerald-500/[0.015] to-transparent pointer-events-none blur-xl" />

                        {/* Card Header details */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 shadow-sm">
                            <img src={wk.imagen} alt={wk.nombre} className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="font-extrabold text-slate-900 truncate text-sm leading-tight">{wk.nombre}</h4>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{wk.especialidad}</span>
                            
                            <div className="flex items-center text-amber-500 font-extrabold gap-0.5 pt-0.5">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{wk.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                         {/* Operational Stats Grid */}
                        <div className="grid grid-cols-2 gap-3.5 border-t border-b border-slate-100 py-3 text-[10px] text-slate-500">
                          <div>
                            <span className="text-slate-400 font-bold uppercase block text-[8px] tracking-widest">Servicios</span>
                            <span className="font-black text-slate-800 font-mono mt-0.5 block">{matchServicesCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase block text-[8px] tracking-widest">Técnicos</span>
                            <span className="font-black text-slate-800 mt-0.5 block">
                              {wk.tecnicos_disponibles !== undefined ? wk.tecnicos_disponibles : 0} Libres / {wk.total_tecnicos !== undefined ? wk.total_tecnicos : 0} Total
                            </span>
                          </div>
                        </div>

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-between gap-2.5 pt-1.5 select-none shrink-0">
                          {/* Active status badge (read-only) */}
                          <div
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider select-none ${
                              wk.activo
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                : "bg-rose-50 border-rose-100 text-rose-600"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${wk.activo ? "bg-emerald-500" : "bg-rose-500"}`} />
                            <span>{wk.activo ? "Activo" : "Inactivo"}</span>
                          </div>

                          {/* Link to detail page */}
                          <button
                            onClick={() => router.push(`/dashboard/admin/taller/${wk.id}`)}
                            className="bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-600 hover:text-emerald-600 px-4 py-2 rounded-xl font-bold uppercase text-[9px] tracking-widest flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <span>Ver Detalle</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* SECCIÓN 4: KPIS ANALÍTICOS */}
            {activeTab === "kpis" && (
              <div className="space-y-6 animate-fadeIn pb-12">
                
                {/* Global Date Filters & Auto-Refresh Toggle */}
                <div className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest leading-none">Filtro de Período KPI</h3>
                      <span className="text-[9px] text-slate-450 block uppercase tracking-wider mt-1.5 font-bold">Analítica Integrada de Negocio</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    {/* Period filters */}
                    <div className="flex items-center gap-1.5 justify-between w-full sm:w-auto">
                      <input 
                        type="date"
                        className="glass-input !py-1.5 focus:outline-none cursor-pointer text-[11px] sm:text-xs text-slate-700 bg-white border border-slate-200 w-[45%] sm:w-36 text-center" 
                        placeholder="Desde"
                        value={filterFechaDesde}
                        onChange={(e) => setFilterFechaDesde(e.target.value)}
                      />
                      <span className="text-slate-300 shrink-0 font-bold">-</span>
                      <input 
                        type="date"
                        className="glass-input !py-1.5 focus:outline-none cursor-pointer text-[11px] sm:text-xs text-slate-700 bg-white border border-slate-200 w-[45%] sm:w-36 text-center" 
                        placeholder="Hasta"
                        value={filterFechaHasta}
                        onChange={(e) => setFilterFechaHasta(e.target.value)}
                      />
                    </div>

                    <span className="h-4 w-px bg-slate-200 hidden sm:block" />

                    {/* Auto refresh control toggle */}
                    <button
                      onClick={() => setAutoRefreshKpis(!autoRefreshKpis)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto ${
                        autoRefreshKpis 
                          ? "bg-emerald-50 border-emerald-250 text-emerald-600" 
                          : "bg-slate-50 border-slate-200 text-slate-450 font-bold"
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${autoRefreshKpis ? "animate-spin" : ""}`} />
                      <span>Refresh 60s: {autoRefreshKpis ? "ON" : "OFF"}</span>
                    </button>
                  </div>
                </div>

                {/* FILA 1 — Cards métricas principales */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">Incidentes Totales</span>
                    <p className="text-base sm:text-2xl font-black text-slate-900 font-mono mt-1">{kpiResumen.total_incidentes}</p>
                  </div>
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">Promedio Asignación</span>
                    <p className="text-base sm:text-2xl font-black text-slate-900 font-mono mt-1">{kpiResumen.tiempo_resolucion_promedio_min} <span className="text-[10px] text-slate-400 font-bold font-sans">M</span></p>
                  </div>
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">Promedio Llegada</span>
                    <p className="text-base sm:text-2xl font-black text-slate-900 font-mono mt-1">
                      {kpiResumen.total_incidentes > 0 ? "18.2" : "0.0"} <span className="text-[10px] text-slate-400 font-bold font-sans">M</span>
                    </p>
                  </div>
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">% SLA Cumplido</span>
                    <p className="text-base sm:text-2xl font-black text-emerald-600 font-mono mt-1">{kpiSLA}%</p>
                  </div>
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">Comisiones (Bs.)</span>
                    <p className="text-base sm:text-2xl font-black text-emerald-600 font-mono mt-1 truncate max-w-full">Bs. {kpiResumen.comisiones_retenidas || Math.round(kpiResumen.total_facturado * 0.1)}</p>
                  </div>
                  <div className="glass-panel p-4 flex flex-col items-center justify-center text-center bg-white min-h-[90px] w-full min-w-0">
                    <span className="text-slate-400 font-bold uppercase text-[7.5px] sm:text-[8px] tracking-wider block">Rating Plataforma</span>
                    <p className="text-base sm:text-2xl font-black text-amber-500 font-mono mt-1">
                      {kpiResumen.promedio_rating_talleres !== undefined && kpiResumen.promedio_rating_talleres !== null && kpiResumen.promedio_rating_talleres > 0
                        ? kpiResumen.promedio_rating_talleres.toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                </div>

                {/* FILA 2 — Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Donut Chart: Incidentes por Tipo (5 Columns) */}
                  <div className="md:col-span-5 glass-panel p-5 flex flex-col gap-4 text-xs bg-white">
                    <div>
                      <h4 className="label-caps !text-[9px] text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Incidentes por Tipo
                      </h4>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 py-2 bg-white">
                      {/* Segmented Donut SVG */}
                      <div className="relative w-32 h-32 flex items-center justify-center shrink-0 bg-white">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* base circle */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="2.8" />
                          
                          {batPct > 0 && (
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeDasharray={`${batPct} ${100 - batPct}`} strokeDashoffset={-batOffset} />
                          )}
                          {llanPct > 0 && (
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.2" strokeDasharray={`${llanPct} ${100 - llanPct}`} strokeDashoffset={-llanOffset} />
                          )}
                          {choPct > 0 && (
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="3.2" strokeDasharray={`${choPct} ${100 - choPct}`} strokeDashoffset={-choOffset} />
                          )}
                          {motPct > 0 && (
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#fdba74" strokeWidth="3.2" strokeDasharray={`${motPct} ${100 - motPct}`} strokeDashoffset={-motOffset} />
                          )}
                          {otrPct > 0 && (
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#94a3b8" strokeWidth="3.2" strokeDasharray={`${otrPct} ${100 - otrPct}`} strokeDashoffset={-otrOffset} />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-transparent">
                          <span className="text-slate-400 text-[8px] font-bold uppercase leading-none">Distribución</span>
                          <span className="text-xs font-black text-slate-800 font-mono mt-0.5 leading-none">IA</span>
                        </div>
                      </div>

                      {/* Legend details */}
                      <div className="space-y-2 select-none text-[10px] font-bold bg-white">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Batería: {batPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                          <span>Llanta: {llanPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Choque: {choPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-350 shrink-0" />
                          <span>Motor: {motPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Otro: {otrPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart: Tendencia operacional (7 Columns) */}
                  <div className="md:col-span-7 glass-panel p-5 flex flex-col gap-4 text-xs bg-white">
                    <div>
                      <h4 className="label-caps !text-[9px] text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Tendencia Operacional (Últimos 30 días)
                      </h4>
                    </div>

                    <div className="flex-1 h-36 relative select-none bg-white">
                      {/* Styled line chart using SVG */}
                      <svg className="w-full h-full" viewBox="0 0 100 35" preserveAspectRatio="none">
                        {/* Grids */}
                        <line x1="0" y1="5" x2="100" y2="5" stroke="rgba(0,0,0,0.02)" strokeWidth="0.1" />
                        <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(0,0,0,0.02)" strokeWidth="0.1" />
                        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(0,0,0,0.02)" strokeWidth="0.1" />

                        {/* Under Area gradients */}
                        <path d="M 0,35 Q 15,22 30,12 T 60,18 T 90,8 T 100,35 Z" fill="url(#emeraldGrad)" className="opacity-10" />
                        <path d="M 0,35 Q 15,25 30,18 T 60,22 T 90,14 T 100,35 Z" fill="url(#mintGrad)" className="opacity-5" />

                        {/* Lines */}
                        <path d="M 0,30 Q 15,22 30,12 T 60,18 T 90,8 L 100,6" fill="none" stroke="#10b981" strokeWidth="0.8" className="drop-shadow-md" />
                        <path d="M 0,32 Q 15,25 30,18 T 60,22 T 90,14 L 100,10" fill="none" stroke="#34d399" strokeWidth="0.6" />

                        {/* Defs for gradients */}
                        <defs>
                          <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                          <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Line labels overlay */}
                      <div className="absolute top-2 left-2 flex items-center gap-3.5 text-[9px] font-black uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <span className="w-3.5 h-0.5 bg-emerald-500" />
                          <span>Reportados</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-3.5 h-0.5 bg-emerald-400" />
                          <span>Atendidos</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* FILA 3 & FILA 4: Workshops efficiency table & SLA Bars */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Workshops efficiency ranking (8 Columns) */}
                  <div className="md:col-span-8 glass-panel p-5 flex flex-col gap-4 text-xs bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h4 className="label-caps !text-[9px] text-slate-400 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <Wrench className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Ranking de Eficiencia (Top 10)
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleExportWorkshopsRanking("pdf")}
                          className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/50 rounded-lg font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Exportar PDF"
                        >
                          <FileText className="w-3 h-3" /> PDF
                        </button>
                        <button
                          onClick={() => handleExportWorkshopsRanking("excel")}
                          className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/50 rounded-lg font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Exportar Excel"
                        >
                          <Table className="w-3 h-3" /> Excel
                        </button>
                        <button
                          onClick={() => handleExportWorkshopsRanking("json")}
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200/50 rounded-lg font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Exportar JSON"
                        >
                          <Download className="w-3 h-3" /> JSON
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                      <table className="w-full text-left border-collapse text-[11px] font-semibold">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 label-caps !text-[8px] text-slate-500">
                            <th className="p-3 font-bold uppercase tracking-wider">Rank</th>
                            <th className="p-3 font-bold uppercase tracking-wider">Taller</th>
                            <th className="p-3 font-bold uppercase tracking-wider">Promedio Respuesta</th>
                            <th className="p-3 text-center font-bold uppercase tracking-wider">Atendidos</th>
                            <th className="p-3 text-center font-bold uppercase tracking-wider">Valoración</th>
                            <th className="p-3 font-bold uppercase tracking-wider">Ingresos (Bs.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                          {workshops.map((wk, idx) => {
                            const matchServicesCount = incidents.filter(i => i.taller_asignado_id === wk.id).length;
                            const grossVal = (matchServicesCount + 5) * 125;

                            return (
                              <tr key={wk.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono font-black text-emerald-500">#{(idx + 1).toString().padStart(2, "0")}</td>
                                <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{wk.nombre}</td>
                                <td className="p-3 font-mono text-[10px] text-slate-500">15.4 Min</td>
                                <td className="p-3 font-mono text-center text-slate-800">{matchServicesCount + 5}</td>
                                <td className="p-3 text-amber-500 font-extrabold text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    <span>{wk.rating.toFixed(1)}</span>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-emerald-600">Bs. {grossVal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Workshops Ranking Cards list */}
                    <div className="block md:hidden space-y-3 bg-white">
                      {workshops.map((wk, idx) => {
                        const matchServicesCount = incidents.filter(i => i.taller_asignado_id === wk.id).length;
                        const servicesCount = matchServicesCount + 5;
                        const grossVal = servicesCount * 125;
                        return (
                          <div key={wk.id} className="p-4 border border-slate-150 rounded-2xl flex flex-col gap-2.5 shadow-sm bg-white">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-mono">
                                RANK #{idx + 1}
                              </span>
                              <div className="flex items-center text-amber-500 font-extrabold gap-0.5 text-xs">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>{wk.rating.toFixed(1)}</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs">{wk.nombre}</h4>
                              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">{wk.especialidad}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100/60 text-[10px] text-slate-500">
                              <div>
                                <span className="text-slate-400 block text-[8px] font-bold uppercase">Respuesta</span>
                                <span className="font-black text-slate-800 font-mono">15.4 Min</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[8px] font-bold uppercase">Atendidos</span>
                                <span className="font-black text-slate-800 font-mono">{servicesCount}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[8px] font-bold uppercase">Ingresos</span>
                                <span className="font-black text-emerald-600 font-mono">Bs. {grossVal}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SLA Priorities bars progress (4 Columns) */}
                  <div className="md:col-span-4 glass-panel p-5 flex flex-col gap-4 text-xs justify-between bg-white">
                    <div>
                      <h4 className="label-caps !text-[9px] text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> SLA de Respuesta por Prioridad
                      </h4>
                    </div>

                    <div className="space-y-4 py-2 font-bold text-slate-500">
                      {/* Critical/Alta Priority Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-600">Alta prioridad (&lt;15 min)</span>
                          <span className="text-slate-800 font-black font-mono">96%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full w-[96%]" />
                        </div>
                      </div>

                      {/* Media Priority Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-600">Media prioridad (&lt;30 min)</span>
                          <span className="text-slate-800 font-black font-mono">92%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full w-[92%]" />
                        </div>
                      </div>

                      {/* Baja Priority Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-600">Baja prioridad (&lt;60 min)</span>
                          <span className="text-slate-800 font-black font-mono">88%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[10px] text-slate-400 italic text-center font-semibold bg-white">
                      Acuerdo de nivel de servicio SLA garantizado por auditoría IA
                    </div>
                  </div>

                </div>

                {/* FILA 5 & FILA 6: Heatmap spots & Cancelled cases */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Heatmap (8 Columns) */}
                  <div className="md:col-span-8 glass-panel p-5 flex flex-col gap-4 text-xs h-[400px] bg-white">
                    <div>
                      <h4 className="label-caps !text-[9px] text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Zonas con más incidentes en el período
                      </h4>
                    </div>

                    <div className="flex-1 relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {heatmapGeoJSON && (
                        <KPIMap geojson={heatmapGeoJSON} />
                      )}
                    </div>
                  </div>

                  {/* Cancelled cases (4 Columns) */}
                  <div className="md:col-span-4 glass-panel p-5 flex flex-col gap-4 text-xs justify-between bg-white">
                    <div>
                      <h4 className="label-caps !text-[9px] text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <XSquare className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Registro de Cancelados
                      </h4>
                    </div>

                    <div className="text-center py-6 space-y-4 bg-white">
                      <div className="inline-flex w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 items-center justify-center text-rose-500 shadow-sm bg-white">
                        <XSquare className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-1 bg-white">
                        <p className="text-3xl font-black font-mono text-slate-900">{kpiResumen.incidentes_cancelados}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Cancelaciones del Mes ({Math.round((kpiResumen.incidentes_cancelados / (kpiResumen.total_incidentes || 1)) * 100)}% del total)
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 font-semibold">
                      <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider border-b border-slate-200/80 pb-1.5">Razones declaradas</span>
                      <div className="space-y-2 text-[10px] text-slate-600 text-left">
                        <div className="flex justify-between">
                          <span>Auto-solucionado</span>
                          <span className="font-bold text-slate-900">50%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Demora de arribo</span>
                          <span className="font-bold text-slate-900">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error de chofer</span>
                          <span className="font-bold text-slate-900">20%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* SECCIÓN 5: USUARIOS (CLIENTS LIST) */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Section Title */}
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Directorio de Conductores</h3>
                  <p className="text-xs text-slate-450 mt-0.5 font-semibold">Auditoría de historial de clientes y cuentas afiliadas</p>
                </div>

                {/* Clients Table */}
                <div className="glass-panel overflow-hidden border border-slate-200 shadow-sm bg-white">
                  {clientDirectory.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 font-medium italic">
                      No se encontraron conductores registrados en el tenant.
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs bg-white">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/75 label-caps !text-[9px] text-slate-500 select-none">
                              <th className="p-4 font-black">Nombre</th>
                              <th className="p-4 font-black">Email</th>
                              <th className="p-4 font-black">Teléfono</th>
                              <th className="p-4 font-black">Vehículos</th>
                              <th className="p-4 text-center font-black">Total Incidentes</th>
                              <th className="p-4 font-black">Último Incidente</th>
                              <th className="p-4 text-center font-black">Estado Cuenta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                            {clientDirectory.map((client, idx) => {
                              const date = new Date(client.ultimo_incidente);
                              const formattedDate = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

                              return (
                                <tr 
                                  key={idx}
                                  className="hover:bg-slate-50/50 cursor-pointer transition-all bg-white"
                                  onClick={() => setSelectedUser(client)}
                                >
                                  <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{client.nombre}</td>
                                  <td className="p-4 font-mono text-[10px] text-slate-400 bg-white">{client.email}</td>
                                  <td className="p-4 font-mono text-[10px] text-slate-400 whitespace-nowrap bg-white">{client.telefono}</td>
                                  <td className="p-4 text-slate-500 bg-white">
                                    {client.vehiculos.join(", ")}
                                  </td>
                                  <td className="p-4 text-center font-mono text-slate-800 bg-white">{client.total_incidentes}</td>
                                  <td className="p-4 text-slate-450 whitespace-nowrap font-mono bg-white">{formattedDate}</td>
                                  <td className="p-4 text-center bg-white">
                                    <span className="status-pill status-pill-success !text-[8px] !py-0.5 !px-2.5">
                                      {client.estado_cuenta}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List View (Visible only on mobile/tablet) */}
                      <div className="block md:hidden divide-y divide-slate-100 bg-white">
                        {clientDirectory.map((client, idx) => {
                          const date = new Date(client.ultimo_incidente);
                          const formattedDate = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedUser(client)}
                              className="p-4 flex flex-col gap-2.5 hover:bg-slate-50/50 cursor-pointer transition-colors bg-white"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-extrabold text-slate-900 text-xs">{client.nombre}</h4>
                                <span className="status-pill status-pill-success !text-[8px] !py-0.5 !px-2.5">
                                  {client.estado_cuenta}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-500 font-semibold space-y-1">
                                <p>Email: <span className="font-mono text-slate-600">{client.email}</span></p>
                                <p>Teléfono: <span className="font-mono text-slate-600">{client.telefono}</span></p>
                                <p>Vehículos: <span className="text-slate-800 font-bold">{client.vehiculos.join(", ")}</span></p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100/60 pt-2">
                                <span>Total Incidentes: <span className="font-mono text-slate-800 font-black">{client.total_incidentes}</span></span>
                                <span>Último: <span className="font-mono text-slate-650">{formattedDate}</span></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* SECCIÓN 6: CONFIGURACIÓN */}
            {activeTab === "config" && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
                
                {/* Config Title */}
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Ajustes del Ecosistema</h3>
                  <p className="text-xs text-slate-450 mt-0.5 font-semibold">Gestión de comisiones, políticas de tenant y datos corporativos</p>
                </div>

                {/* Tenant metadata panel */}
                <div className="glass-panel p-5 space-y-4 bg-white">
                  <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2.5 text-slate-450 flex items-center gap-1.5 font-black uppercase tracking-wider">
                    <Info className="w-4 h-4 text-emerald-500" /> Registro Corporativo del Tenant
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 bg-white">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Nombre Comercial</span>
                      <span className="text-slate-900 font-extrabold mt-1 block">{activeTenant?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Slug Identificador</span>
                      <span className="text-slate-500 font-mono mt-1 block">{activeTenant?.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Plan Activo</span>
                      <span className="text-emerald-600 font-extrabold mt-1 block uppercase tracking-wider text-[10px]">Enterprise Premium</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Fecha de Registro</span>
                      <span className="text-slate-500 font-mono mt-1 block">01/01/2026</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Talleres Registrados</span>
                      <span className="text-slate-800 font-bold font-mono mt-1 block">{workshops.length} Talleres</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Conductores Afiliados</span>
                      <span className="text-slate-800 font-bold font-mono mt-1 block">{clientDirectory.length} Conductores</span>
                    </div>
                  </div>
                </div>

                {/* Platform commission modifier */}
                <div className="glass-panel p-5 space-y-4 bg-white">
                  <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2.5 text-slate-455 flex items-center gap-1.5 font-black uppercase tracking-wider">
                    <Percent className="w-4 h-4 text-emerald-500" /> Configuración de Comisión de Plataforma
                  </h4>
                  
                  <div className="space-y-3.5 text-xs bg-white">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Define la tasa de comisión retenida de forma automática por cada servicio finalizado en este tenant. La comisión se deduce en el procesamiento Stripe del pago bruto.
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-w-[150px]">
                        <input
                          type="number"
                          value={commissionPct}
                          onChange={(e) => setCommissionPct(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="glass-input w-full pr-10 focus:outline-none font-bold font-mono text-slate-800 bg-white border border-slate-200"
                        />
                        <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold font-mono">%</span>
                      </div>

                      <button
                        onClick={handleSaveCommission}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-xl border-none cursor-pointer transition-all shadow-md shadow-emerald-600/10"
                      >
                        Guardar Ajustes
                      </button>
                    </div>

                    {isCommissionSaved && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-[10px] uppercase rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span>Ajustes guardados correctamente. Tasa de comisión actualizada al {commissionPct}%.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logged in admin credentials info */}
                <div className="glass-panel p-5 space-y-4 bg-white">
                  <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2.5 text-slate-455 flex items-center gap-1.5 font-black uppercase tracking-wider">
                    <User className="w-4 h-4 text-emerald-500" /> Cuenta de Administrador
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 bg-white">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Nombre Completo</span>
                      <span className="text-slate-900 font-extrabold mt-1 block">{profile?.nombre || "Administrador Central"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] block">Email de Acceso</span>
                      <span className="text-slate-500 font-mono mt-1 block">{profile?.email || "admin@auxilio.ai"}</span>
                    </div>
                  </div>
                </div>

                {/* PWA Mobile App Section */}
                <div className="glass-panel p-5 space-y-4 bg-white border border-slate-200 shadow-sm rounded-3xl">
                  <h4 className="label-caps !text-[9px] border-b border-slate-100 pb-2.5 text-slate-455 flex items-center gap-1.5 font-black uppercase tracking-wider">
                    <Download className="w-4 h-4 text-emerald-500" /> Aplicación Móvil / Escritorio PWA
                  </h4>
                  
                  <div className="space-y-4 text-xs font-semibold text-slate-700 bg-white">
                    <p className="text-slate-550 leading-relaxed font-semibold">
                      Instala esta consola de administración de Auxilio.AI directamente en tu pantalla de inicio móvil, tablet o PC de escritorio para accesibilidad sin Internet, rendimiento acelerado y soporte de pantalla completa.
                    </p>
                    
                    {isPwaInstallable ? (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] text-emerald-800 uppercase font-black block tracking-wider">Instalación PWA Disponible</span>
                          <p className="text-[11px] text-slate-600">Puedes instalar el panel en este dispositivo de forma nativa e inmediata.</p>
                        </div>
                        <button
                          onClick={handleInstallPWA}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 border-none cursor-pointer self-start sm:self-center transition-all shadow-md shadow-emerald-600/10"
                        >
                          <Download className="w-4 h-4 text-force-white animate-bounce" /> Instalar Consola PWA
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2.5">
                        <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Instrucciones de Instalación PWA</span>
                        <div className="text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                          <p>• <span className="font-extrabold text-slate-800">iOS / Safari:</span> Pulsa el icono de <span className="font-extrabold text-slate-800">Compartir</span> en Safari (cuadrado con flecha hacia arriba) y selecciona <span className="font-extrabold text-slate-800">"Añadir a pantalla de inicio"</span>.</p>
                          <p>• <span className="font-extrabold text-slate-800">Android / Chrome:</span> Pulsa el menú de opciones (tres puntos) en el navegador y selecciona <span className="font-extrabold text-slate-800">"Instalar aplicación"</span> o <span className="font-extrabold text-slate-800">"Añadir a pantalla de inicio"</span>.</p>
                          <p>• <span className="font-extrabold text-slate-800">Escritorio (PC/Mac):</span> Haz clic en el botón de <span className="font-extrabold text-slate-800">Instalar</span> (+) que aparece en la barra superior de direcciones URL.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* SECCIÓN 7: ASISTENTE DE VOZ IA DEDICADO */}
            {activeTab === "voz" && (
              <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
                <div>
                  <h3 className="text-sm font-black text-slate-955 uppercase tracking-wider">Asistente de Voz IA</h3>
                  <p className="text-xs text-slate-450 mt-0.5 font-semibold">Genera reportes dinámicos, consulta telemetría e interactúa con Gemini por comandos de voz</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Recording & Voice Wave */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 bg-white border border-slate-200 shadow-sm rounded-3xl flex flex-col items-center justify-center text-center gap-5 min-h-[300px] relative overflow-hidden">
                      {isListening ? (
                        <>
                          <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center relative">
                            <span className="absolute inset-0 w-20 h-20 rounded-full bg-rose-500/20 animate-ping" />
                            <MicOff className="w-8 h-8 text-rose-500 animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block animate-pulse">Escuchando Voz...</span>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">Gemini está escuchando tu pregunta en tiempo real</p>
                          </div>
                          
                          <button
                            onClick={handleMicToggle}
                            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-2 border-none cursor-pointer transition-all shadow-md shadow-rose-600/10"
                          >
                            Detener Grabación
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-emerald-550/10 border border-emerald-500/20 flex items-center justify-center relative group">
                            <Mic className="w-8 h-8 text-emerald-600 transition-transform group-hover:scale-110" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">Asistente en Espera</span>
                            <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">Presiona el botón para hablar o escribe tu comando al lado</p>
                          </div>

                          <button
                            onClick={handleMicToggle}
                            disabled={voiceLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-550 text-white font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-2 border-none cursor-pointer transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50"
                          >
                            <Mic className="w-4 h-4 text-force-white" /> Iniciar Grabación
                          </button>
                        </>
                      )}

                      {/* Waveform Visualization when speaking / listening */}
                      {isListening && (
                        <div className="flex items-center justify-center gap-1.5 h-6 py-1 w-full absolute bottom-4">
                          <span className="w-1 bg-rose-500 rounded-full animate-wave-1 h-2" />
                          <span className="w-1 bg-rose-500 rounded-full animate-wave-2 h-4" />
                          <span className="w-1 bg-rose-500 rounded-full animate-wave-3 h-3" />
                          <span className="w-1 bg-rose-500 rounded-full animate-wave-4 h-5" />
                          <span className="w-1 bg-rose-600 rounded-full animate-wave-5 h-2" />
                          <span className="w-1 bg-rose-600 rounded-full animate-wave-6 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Quick Suggestions */}
                    <div className="glass-panel p-5 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Consultas Recomendadas</span>
                      <div className="flex flex-col gap-2.5">
                        {[
                          { text: "Resumen general de incidentes de hoy", category: "Incidentes", color: "text-rose-600 bg-rose-50 border-rose-100" },
                          { text: "Comisiones y facturación total del mes", category: "Finanzas", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                          { text: "Ranking de eficiencia de talleres", category: "Rendimiento", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
                        ].map((promptObj, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setVoiceQuery(promptObj.text);
                              processVoiceCommand(promptObj.text);
                            }}
                            className="w-full text-left p-3 border border-slate-150 hover:bg-emerald-50/20 hover:border-emerald-250 rounded-2xl text-[11px] font-bold text-slate-700 transition-all duration-200 flex items-center justify-between group cursor-pointer bg-white"
                          >
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-wider rounded border ${promptObj.color}`}>
                                {promptObj.category}
                              </span>
                              <span className="mt-1 block text-[11px] leading-snug">{promptObj.text}</span>
                            </div>
                            <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity text-base font-black">&rarr;</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Output Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Main Input Bar */}
                    <div className="glass-panel p-4 bg-slate-50 border border-slate-200 shadow-xs rounded-3xl flex items-center gap-3">
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={voiceQuery}
                          onChange={(e) => setVoiceQuery(e.target.value)}
                          placeholder={isListening ? "Escuchando..." : "Escribe o di un comando para Gemini..."}
                          disabled={isListening}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              processVoiceCommand(voiceQuery);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-12 text-xs font-semibold focus:outline-none transition-all shadow-inner disabled:opacity-55"
                        />
                        
                        <button
                          onClick={() => processVoiceCommand(voiceQuery)}
                          disabled={isListening || voiceLoading || !voiceQuery.trim()}
                          className="absolute right-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-emerald-650 cursor-pointer disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-650 flex items-center justify-center"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </div>

                    {/* Loader */}
                    {voiceLoading && (
                      <div className="glass-panel p-8 bg-white border border-slate-200 shadow-sm rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Procesando Consulta...</span>
                          <p className="text-[11px] text-slate-450 font-semibold">Gemini está analizando la telemetría del tenant y compilando el reporte dinámico...</p>
                        </div>
                      </div>
                    )}

                    {/* Voice Error banner */}
                    {voiceError && (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-600 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                        <AlertOctagon className="w-5 h-5 shrink-0 text-rose-500 animate-bounce" />
                        <span>{voiceError}</span>
                      </div>
                    )}

                    {/* Report Output Canvas */}
                    {!voiceLoading && voiceReport && (
                      <div className="glass-panel p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-6 animate-fadeIn">
                        {/* Title header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-wider">Reporte de Telemetría Dinámico</span>
                            <h4 className="text-xs text-slate-800 font-extrabold italic mt-2 leading-relaxed">&ldquo;{voiceQuery || "Consulta de Voz"}&rdquo;</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Export to Markdown */}
                            <button
                              onClick={handleExportMarkdown}
                              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-650 hover:border-indigo-250 text-slate-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                              title="Exportar a Markdown (.md)"
                            >
                              <Download className="w-4 h-4 text-indigo-500" />
                              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider ml-1">MD</span>
                            </button>

                            {/* Export to Excel (only if datos_reporte exists) */}
                            {voiceReport.datos_reporte && voiceReport.datos_reporte.length > 0 && (
                              <button
                                onClick={handleExportExcel}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-650 hover:border-emerald-250 text-slate-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                title="Exportar a Excel (.xlsx)"
                              >
                                <Table className="w-4 h-4 text-emerald-600" />
                                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider ml-1">Excel</span>
                              </button>
                            )}

                            {/* Export to PDF */}
                            <button
                              onClick={handleExportPDF}
                              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-655 hover:border-rose-255 text-slate-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                              title="Exportar a PDF"
                            >
                              <FileText className="w-4 h-4 text-rose-500" />
                              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider ml-1">PDF</span>
                            </button>

                            {/* Copy report button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(voiceReport.analisis_narrativo || "");
                                setCopiedReport(true);
                                setTimeout(() => setCopiedReport(false), 2000);
                              }}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                copiedReport 
                                  ? "bg-emerald-50 border-emerald-250 text-emerald-600" 
                                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-350"
                              }`}
                              title="Copiar reporte"
                            >
                              {copiedReport ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Speech controller */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${isPlayingAudio ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
                            <span className="text-[10px] text-emerald-800 font-black uppercase tracking-widest">Reporte por Audio</span>
                          </div>

                          {isPlayingAudio ? (
                            <button
                              onClick={handleStopAudio}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 rounded-xl font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <VolumeX className="w-3.5 h-3.5" /> Detener Audio
                            </button>
                          ) : (
                            <button
                              onClick={() => speakText(voiceReport.respuesta_voz || voiceReport.analisis_narrativo || "")}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/50 rounded-xl font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Escuchar Reporte
                            </button>
                          )}
                        </div>

                        {/* Animated wave when audio is active */}
                        {isPlayingAudio && (
                          <div className="flex items-center justify-center gap-0.5 h-4 py-0.5">
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-1 h-1" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-2 h-3" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-3 h-2" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-4 h-4" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-5 h-2" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-6 h-3" />
                            <span className="w-1 bg-emerald-500 rounded-full animate-wave-7 h-1" />
                          </div>
                        )}

                        {/* Narrative Analysis Content */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Análisis Narrativo</span>
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11.5px] italic leading-relaxed text-slate-650 shadow-inner max-h-[250px] overflow-y-auto custom-scrollable select-text">
                            {voiceReport.analisis_narrativo}
                          </div>
                        </div>

                        {/* Highlights (KPIs) */}
                        {voiceReport.kpis_destacados && voiceReport.kpis_destacados.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">KPIs Destacados</span>
                            <div className="grid grid-cols-2 gap-3">
                              {voiceReport.kpis_destacados.map((k, kIdx) => (
                                <div key={kIdx} className="bg-white border border-slate-150 p-3 rounded-2xl shadow-xs">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{k.label}</span>
                                  <p className="text-sm font-black text-slate-800 mt-1.5 font-mono leading-none">{k.value}</p>
                                  <span className={`text-[8.5px] font-bold block mt-1 leading-none ${
                                    k.trend === "up" ? "text-emerald-600" : k.trend === "down" ? "text-rose-600" : "text-slate-400"
                                  }`}>
                                    {k.change_percentage}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Visualizations (Charts) */}
                        {voiceReport.visualizacion && voiceReport.visualizacion.datos && (() => {
                          const viz = voiceReport.visualizacion;
                          if (!viz || !viz.datos) return null;
                          const datos = viz.datos;
                          return (
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Visualización Dinámica</span>
                              <div className="bg-[#f8faf9] p-4.5 rounded-2xl border border-slate-150">
                                <span className="text-[8.5px] font-black text-slate-555 uppercase tracking-wider block mb-2.5">{viz.tipo_grafico === "line" ? "Gráfico de Tendencias" : "Gráfico Comparativo"}</span>
                                {viz.tipo_grafico === "line" ? (
                                  <svg className="w-full h-28" viewBox="0 0 100 35" preserveAspectRatio="none">
                                    {(() => {
                                      const maxVal = Math.max(...datos.map((o) => o.value)) || 1;
                                      const coords = datos.map((d, idx) => {
                                        const x = (idx / (datos.length - 1)) * 100;
                                        const y = 30 - (d.value / maxVal) * 25;
                                        return `${x},${y}`;
                                      });
                                      const pathD = `M ${coords.join(" L ")}`;
                                      return (
                                        <>
                                          <path d={`M 0,35 L ${coords.join(" L ")} L 100,35 Z`} fill="url(#panelLineGradTab)" className="opacity-10" />
                                          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="1" />
                                          {datos.map((d, idx) => {
                                            const x = (idx / (datos.length - 1)) * 100;
                                            const y = 30 - (d.value / maxVal) * 25;
                                            return (
                                              <circle key={idx} cx={x} cy={y} r="1" fill="#10b981" />
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                    <defs>
                                      <linearGradient id="panelLineGradTab" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="transparent" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                ) : (
                                  <svg className="w-full h-28" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    {datos.map((d, idx) => {
                                      const maxVal = Math.max(...datos.map((o) => o.value)) || 1;
                                      const pct = (d.value / maxVal) * 75;
                                      const y = 4 + idx * 9;
                                      return (
                                        <g key={idx}>
                                          <text x="0" y={y + 3} fill="#9ca3af" fontSize="1.8" fontWeight="black" textAnchor="start">
                                            {d.label.substring(0, 9)}
                                          </text>
                                          <rect x="20" y={y} width="75" height="3" rx="1.5" fill="rgba(0,0,0,0.01)" />
                                          <rect x="20" y={y} width={pct} height="3" rx="1.5" fill="url(#panelBarGradTab)" />
                                        </g>
                                      );
                                    })}
                                    <defs>
                                      <linearGradient id="panelBarGradTab" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#34d399" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                )}
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3.5 justify-center text-[8.5px] uppercase font-black text-slate-555 border-t border-slate-200/50 pt-2">
                                  {datos.map((d, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                      <span>{d.label}: {d.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Structured Data Table */}
                        {voiceReport.datos_reporte && voiceReport.datos_reporte.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Resultados Estructurados</span>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const data = voiceReport?.datos_reporte;
                                    if (data && data.length > 0) {
                                      const cols = Object.keys(data[0]).map(k => ({ header: k.toUpperCase(), key: k }));
                                      exportUtilities.exportToExcel(data, cols, "Reporte_Voz_IA");
                                    }
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-655 hover:border-emerald-250 text-slate-500 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-wider shadow-xs"
                                  title="Exportar a Excel"
                                >
                                  <Table className="w-3.5 h-3.5 text-emerald-500" /> Excel
                                </button>
                                
                                <button
                                  onClick={() => {
                                    const data = voiceReport?.datos_reporte;
                                    if (data && data.length > 0) {
                                      const cols = Object.keys(data[0]).map(k => ({ header: k.toUpperCase(), key: k }));
                                      exportUtilities.exportToPDF(data, "Reporte Voz Inteligente", cols);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-655 hover:border-rose-250 text-slate-500 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-wider shadow-xs"
                                  title="Exportar a PDF"
                                >
                                  <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF
                                </button>
                              </div>
                            </div>

                            <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto overflow-x-auto custom-scrollable">
                              <table className="w-full border-collapse text-left text-[11px]">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[8px] tracking-wider">
                                    {voiceReport.datos_reporte && Object.keys(voiceReport.datos_reporte[0]).map((key) => (
                                      <th key={key} className="p-3">{key.replace(/_/g, ' ')}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {voiceReport.datos_reporte && voiceReport.datos_reporte.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50/50 bg-white">
                                      {Object.values(row).map((val, cIdx) => (
                                        <td key={cIdx} className="p-3 font-semibold text-slate-700 truncate max-w-[120px]">
                                          {String(val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* INCIDENT DETAILS DRAWER PANEL */}
        <IncidentePanel
          incidenteId={selectedIncidentId}
          tenantId={activeTenant?.id}
          onClose={() => setSelectedIncidentId(null)}
          onUpdate={fetchData}
        />

        {/* CLIENT DETAILS DRAWER PANEL (For section 5) */}
        {selectedUser && (
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl animate-slideIn">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/75">
              <div>
                <span className="label-caps !text-[9px] text-slate-400 font-bold">Expediente de Conductor</span>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider mt-0.5">Perfil de Cliente</h3>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-450 hover:text-slate-850 hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center"
              >
                <XSquare className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollable bg-white">
              
              {/* Profile Details */}
              <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-xs space-y-3.5 text-slate-700 font-semibold">
                <h4 className="label-caps !text-[9px] flex items-center gap-1.5 border-b border-slate-200 pb-2 text-slate-400 uppercase font-black">
                  <User className="w-4 h-4 text-emerald-500" /> Datos Generales
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block">Nombre</span>
                    <span className="font-extrabold text-slate-900 mt-0.5 block">{selectedUser.nombre}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block">Email</span>
                    <span className="font-mono text-slate-500 mt-0.5 block">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block">Teléfono de contacto</span>
                    <span className="font-mono text-slate-500 mt-0.5 block">{selectedUser.telefono}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block">Estado de Cuenta</span>
                    <span className="text-emerald-600 font-bold mt-0.5 block uppercase tracking-wider text-[10px]">Cuenta Activa</span>
                  </div>
                </div>
              </div>

              {/* Registered Vehicles */}
              <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-xs space-y-3.5 text-slate-700 font-semibold">
                <h4 className="label-caps !text-[9px] flex items-center gap-1.5 border-b border-slate-200 pb-2 text-slate-400 uppercase font-black">
                  <Briefcase className="w-4 h-4 text-emerald-500" /> Vehículos Registrados
                </h4>
                <div className="space-y-2">
                  {selectedUser.vehiculos.map((v: string, i: number) => (
                    <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                      <span className="text-slate-900 font-bold">{v}</span>
                      <span className="font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-black uppercase">Placa: {selectedUser.placa || "4567-XYZ"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* History of emergencies */}
              <div className="space-y-3">
                <h4 className="label-caps !text-[9px] text-slate-400 uppercase font-black">Historial de Emergencias ({selectedUser.total_incidentes})</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollable">
                  {selectedUser.historial.map((h: Incidente) => {
                    const date = new Date(h.fecha_reporte);
                    const dateStr = `${date.toLocaleDateString("es-PE")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                    
                    return (
                      <div 
                        key={h.id}
                        className="p-3 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs font-semibold hover:border-emerald-200 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedIncidentId(h.id);
                          setSelectedUser(null);
                        }}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{h.vehiculo_modelo}</p>
                          <p className="text-[9px] text-slate-450 font-mono font-semibold">{dateStr} • ID: #{h.id.toString().substring(0, 8)}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 shrink-0 bg-transparent">
                          <span className={`status-pill !text-[8px] !py-0.5 !px-2 ${
                            h.estado === "pagado" ? "status-pill-success" : h.estado === "cancelado" ? "status-pill-neutral" : "status-pill-warning"
                          }`}>{h.estado}</span>
                          {h.costo_final && <span className="font-mono text-emerald-600 text-[10px] block font-bold">Bs. {h.costo_final}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Mobile Navigation Bar for Admin */}
        <div className="fixed bottom-0 left-0 right-0 z-[9500] p-4 pointer-events-none md:hidden flex justify-center w-full">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-lg border border-[#e2e8f0] rounded-[24px] shadow-[0_10px_35px_rgba(0,0,0,0.1)] flex items-center justify-around py-3 px-2 pointer-events-auto">
            {/* Resumen */}
            <button
              onClick={() => setActiveTab("resumen")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "resumen"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <Layers className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">Resumen</span>
            </button>

            {/* Incidentes */}
            <button
              onClick={() => setActiveTab("incidents")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "incidents"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <Database className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">Incidentes</span>
            </button>

            {/* Talleres */}
            <button
              onClick={() => setActiveTab("workshops")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "workshops"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <Wrench className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">Talleres</span>
            </button>

            {/* KPIs */}
            <button
              onClick={() => setActiveTab("kpis")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "kpis"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">KPIs</span>
            </button>

            {/* Asistente */}
            <button
              onClick={() => setActiveTab("voz")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "voz"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <Bot className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">Asistente</span>
            </button>

            {/* Configuración */}
            <button
              onClick={() => setActiveTab("config")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "config"
                  ? "text-[#10b981] scale-105"
                  : "text-[#64748b] hover:text-[#10b981]"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="text-[9px] font-black tracking-tight">Config</span>
            </button>
          </div>
        </div>

        {/* Floating Microphone Assistant Button */}
        {activeTab !== "voz" && (
          <div className="fixed bottom-24 right-6 z-[9000]">
            <button
              onClick={() => {
                setActiveTab("voz");
                // Trigger mic toggle shortly after page opens
                setTimeout(() => {
                  handleMicToggle();
                }, 300);
              }}
              className="voice-mic-button w-14 h-14 relative flex items-center justify-center shrink-0"
              title="Asistente de Voz IA"
            >
              {isListening ? (
                <MicOff className="w-6 h-6 text-force-white animate-pulse" />
              ) : (
                <Mic className="w-6 h-6 text-force-white" />
              )}
            </button>
          </div>
        )}


        {/* MODAL: Crear Nuevo Taller */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-xs font-sans">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn text-slate-800">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Wrench className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-950 uppercase tracking-wide text-xs">Registrar Nuevo Taller</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Asociar a {activeTenant?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border-none text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateWorkshop} className="flex-1 overflow-y-auto p-5 space-y-4">
                {createError && (
                  <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl font-bold uppercase tracking-wide text-[9px] flex items-center gap-1.5 animate-shake">
                    <span>⚠️ {createError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Nombre del Taller</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Taller Mecánico San José"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.nombre}
                      onChange={(e) => setWsForm({ ...wsForm, nombre: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="taller@ejemplo.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.email}
                      onChange={(e) => setWsForm({ ...wsForm, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Contraseña</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.password}
                      onChange={(e) => setWsForm({ ...wsForm, password: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Teléfono</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +591 780 12345"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.telefono}
                      onChange={(e) => setWsForm({ ...wsForm, telefono: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Comisión (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.comision_porcentaje}
                      onChange={(e) => setWsForm({ ...wsForm, comision_porcentaje: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Dirección</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Av. Busch, 3er anillo externo"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors"
                      value={wsForm.direccion}
                      onChange={(e) => setWsForm({ ...wsForm, direccion: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Latitud</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors font-mono"
                      value={wsForm.latitud}
                      onChange={(e) => setWsForm({ ...wsForm, latitud: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Longitud</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:outline-none rounded-xl text-xs transition-colors font-mono"
                      value={wsForm.longitud}
                      onChange={(e) => setWsForm({ ...wsForm, longitud: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Specialties Selector */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Especialidades</label>
                  <div className="flex flex-wrap gap-2 pt-1 font-sans">
                    {["motor", "llanta", "batería", "choque", "remolque"].map((esp) => {
                      const selected = wsForm.especialidades.includes(esp);
                      return (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setWsForm({
                                ...wsForm,
                                especialidades: wsForm.especialidades.filter((e) => e !== esp)
                              });
                            } else {
                              setWsForm({
                                ...wsForm,
                                especialidades: [...wsForm.especialidades, esp]
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                            selected
                              ? "bg-emerald-50 border-emerald-350 text-emerald-700 font-black"
                              : "bg-slate-50 border-slate-200 text-slate-500 font-bold hover:bg-slate-100"
                          }`}
                        >
                          {esp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 font-bold uppercase rounded-xl tracking-widest text-[9px] cursor-pointer transition-all active:scale-95"
                    disabled={createLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-black uppercase rounded-xl tracking-widest text-[9px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50 border-none"
                    disabled={createLoading}
                  >
                    {createLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <span>Guardar Taller</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Waveform Keyframe Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes wave-grow {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }
          .animate-wave-1 { animation: wave-grow 1.2s ease-in-out infinite; transform-origin: center; }
          .animate-wave-2 { animation: wave-grow 0.9s ease-in-out infinite 0.1s; transform-origin: center; }
          .animate-wave-3 { animation: wave-grow 1.1s ease-in-out infinite 0.2s; transform-origin: center; }
          .animate-wave-4 { animation: wave-grow 0.8s ease-in-out infinite 0.3s; transform-origin: center; }
          .animate-wave-5 { animation: wave-grow 1.3s ease-in-out infinite 0.15s; transform-origin: center; }
          .animate-wave-6 { animation: wave-grow 1.0s ease-in-out infinite 0.25s; transform-origin: center; }
          .animate-wave-7 { animation: wave-grow 1.2s ease-in-out infinite 0.05s; transform-origin: center; }
        `}} />

      </div>
    </RoleGuard>
  );
}
