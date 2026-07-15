import { 
  Tenant, 
  Workshop, 
  Cotizacion, 
  Incidente, 
  KPIReport, 
  INITIAL_TENANTS, 
  INITIAL_WORKSHOPS, 
  INITIAL_INCIDENTS, 
  INITIAL_COTIZACIONES,
  getMockKPIs
} from "./mockData";

const getApiBaseUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return configuredUrl || "http://localhost:8000";
  }

  return configuredUrl || "https://backend-si2-taller-385056433848.us-central1.run.app";
};

const API_BASE_URL = getApiBaseUrl();

const ensureUtc = (dateStr?: string | null): string => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.endsWith('Z')) return dateStr;
  
  const tIndex = dateStr.indexOf('T');
  if (tIndex !== -1) {
    const timePart = dateStr.substring(tIndex);
    if (!timePart.includes('+') && !timePart.includes('-')) {
      return dateStr + 'Z';
    }
  } else {
    if (!dateStr.includes('+') && !dateStr.includes('-')) {
      return dateStr.replace(' ', 'T') + 'Z';
    }
  }
  return dateStr;
};

// Stateful Local storage keys
const STORAGE_KEYS = {
  INCIDENTS: "auxilio_auto_incidents",
  COTIZACIONES: "auxilio_auto_cotizaciones",
  WORKSHOPS: "auxilio_auto_workshops",
  VEHICLES: "auxilio_auto_vehicles",
  OFFLINE_QUEUE: "auxilio_auto_offline_queue"
};

export interface Vehiculo {
  id: string;
  usuario_id: string;
  tenant_id: string;
  marca: string;
  modelo: string;
  año: string;
  placa: string;
  color: string;
}

// Initialize localStorage with mockup data if empty
const initializeLocalStorage = () => {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
    const allIncidents: Incidente[] = [];
    Object.values(INITIAL_INCIDENTS).forEach(list => allIncidents.push(...list));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(allIncidents));
  }

  if (!localStorage.getItem(STORAGE_KEYS.COTIZACIONES)) {
    localStorage.setItem(STORAGE_KEYS.COTIZACIONES, JSON.stringify(INITIAL_COTIZACIONES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.WORKSHOPS)) {
    const allWorkshops: Workshop[] = [];
    Object.values(INITIAL_WORKSHOPS).forEach(list => allWorkshops.push(...list));
    localStorage.setItem(STORAGE_KEYS.WORKSHOPS, JSON.stringify(allWorkshops));
  }

  if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
    const defaultVehicles: Vehiculo[] = [
      { id: "v_toyota", usuario_id: "u_client", tenant_id: "auxilio-norte", marca: "Toyota", modelo: "Hilux", año: "2022", placa: "4567-XYZ", color: "Blanco" },
      { id: "v_suzuki", usuario_id: "u_client", tenant_id: "auxilio-norte", marca: "Suzuki", modelo: "Swift", año: "2020", placa: "1234-ABC", color: "Rojo" }
    ];
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(defaultVehicles));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  }
};

// State readers & writers (Local Storage Fallback)
const getLocalIncidents = (): Incidente[] => {
  initializeLocalStorage();
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || "[]");
};

const saveLocalIncidents = (incidents: Incidente[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
};

const getLocalCotizaciones = (): Cotizacion[] => {
  initializeLocalStorage();
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.COTIZACIONES) || "[]");
};

const saveLocalCotizaciones = (cotizaciones: Cotizacion[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.COTIZACIONES, JSON.stringify(cotizaciones));
};

const getLocalWorkshops = (): Workshop[] => {
  initializeLocalStorage();
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKSHOPS) || "[]");
};

const saveLocalWorkshops = (workshops: Workshop[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.WORKSHOPS, JSON.stringify(workshops));
};

const getLocalVehicles = (): Vehiculo[] => {
  initializeLocalStorage();
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLES) || "[]");
};

const saveLocalVehicles = (vehicles: Vehiculo[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
};

const getOfflineQueue = (): any[] => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) || "[]");
};

const saveOfflineQueue = (queue: any[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
};

// Check Backend status
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      fetchAndCacheTenants();
      return data.status === "healthy";
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Secure Header helper mapping Authorization token
const getHeaders = (tenantId: string, isFormData: boolean = false) => {
  let resolvedTenantId = tenantId;
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length > 1) {
        const payloadDecoded = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payloadDecoded.tenant_id) {
          resolvedTenantId = payloadDecoded.tenant_id;
        }
      }
    } catch (e) {
      console.error("Token decoding error in getHeaders", e);
    }
  }

  const headers: any = {
    "X-Tenant-ID": resolvedTenantId
  };
  
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// Bidirectional mappers between database schemas and frontend UI models
const normalizeIncidente = (inc: any): Incidente => {
  return {
    id: inc.id,
    tenant_id: inc.tenant_id,
    local_id: inc.local_id,
    cliente_nombre: inc.cliente?.nombre || inc.cliente_nombre || "Conductor",
    cliente_telefono: inc.cliente?.telefono || inc.cliente_telefono || "",
    vehiculo_placa: inc.vehiculo?.placa || inc.vehiculo_placa || "",
    vehiculo_modelo: inc.vehiculo 
      ? `${inc.vehiculo.marca} ${inc.vehiculo.modelo} (${inc.vehiculo.color})`.trim()
      : inc.vehiculo_modelo || "Vehículo Registrado",
    descripcion: inc.descripcion_texto || inc.descripcion || "",
    latitude: inc.latitud !== undefined ? inc.latitud : (inc.latitude || -17.7833),
    longitude: inc.longitud !== undefined ? inc.longitud : (inc.longitude || -63.1812),
    estado: inc.estado,
    prioridad_ia: inc.prioridad || inc.prioridad_ia || "baja",
    categoria_ia: inc.tipo_problema || inc.categoria_ia || "otro",
    analisis_ia: typeof inc.resumen_ia === "object" && (inc.resumen_ia?.descripcion || inc.resumen_ia?.analisis_ia)
      ? (inc.resumen_ia.descripcion || inc.resumen_ia.analisis_ia)
      : (typeof inc.resumen_ia === "string" ? inc.resumen_ia : inc.analisis_ia || ""),
    taller_asignado_id: inc.taller_id || inc.taller_asignado_id,
    taller_nombre: inc.taller?.nombre || inc.taller_nombre || "",
    tecnico_asignado: inc.tecnico?.nombre || inc.tecnico_asignado || "",
    tecnico_telefono: inc.tecnico?.telefono || inc.tecnico_telefono || "",
    tecnico_id: inc.tecnico_id || inc.tecnico?.id || undefined,
    tecnico_lat: inc.tecnico?.latitud !== undefined ? inc.tecnico.latitud : (inc.tecnico_lat || undefined),
    tecnico_lng: inc.tecnico?.longitud !== undefined ? inc.tecnico.longitud : (inc.tecnico_lng || undefined),
    costo_final: inc.pagos?.[0]?.monto_total || inc.costo_final,
    created_at: inc.created_at,
    updated_at: inc.updated_at,
    fecha_reporte: ensureUtc(inc.created_at || inc.fecha_reporte),
    evidencias: inc.evidencias ? inc.evidencias.map((e: any) => ({
      id: e.id,
      tipo: e.tipo,
      url_gcs: e.url_gcs.startsWith("http") ? e.url_gcs : `${API_BASE_URL}${e.url_gcs}`,
      transcripcion: e.transcripcion,
      analisis_ia: e.analisis_ia
    })) : []
  };
};

const normalizeWorkshop = (wk: any): Workshop => {
  return {
    id: wk.id,
    tenant_id: wk.tenant_id,
    nombre: wk.nombre,
    email: wk.email || "",
    direccion: wk.direccion,
    telefono: wk.telefono,
    especialidad: wk.especialidad || (Array.isArray(wk.especialidades) ? wk.especialidades.join(", ") : wk.especialidades) || "Mecánica General",
    rating: wk.rating !== undefined ? wk.rating : 5.0,
    latitude: wk.latitud !== undefined ? wk.latitud : (wk.latitude !== undefined ? wk.latitude : -17.7833),
    longitude: wk.longitud !== undefined ? wk.longitud : (wk.longitude !== undefined ? wk.longitude : -63.1812),
    activo: wk.activo !== undefined ? wk.activo : true,
    imagen: wk.imagen || "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=150",
    total_tecnicos: wk.total_tecnicos !== undefined ? wk.total_tecnicos : 0,
    tecnicos_disponibles: wk.tecnicos_disponibles !== undefined ? wk.tecnicos_disponibles : 0
  };
};

const normalizeCotizacion = (cot: any): Cotizacion => {
  return {
    id: cot.id,
    incidente_id: cot.incidente_id,
    taller_id: cot.taller_id,
    taller_nombre: cot.taller?.nombre || cot.taller_nombre || "Taller Autorizado",
    costo_estimado: cot.monto !== undefined ? cot.monto : (cot.costo_estimado || 0),
    tiempo_estimado_minutos: typeof cot.tiempo_estimado === "string" 
      ? parseInt(cot.tiempo_estimado) || 15 
      : (cot.tiempo_estimado || cot.tiempo_estimado_minutos || 15),
    descripcion: cot.descripcion || "",
    estado: cot.estado,
    fecha_creacion: ensureUtc(cot.created_at || cot.fecha_creacion)
  };
};

export const fetchAndCacheTenants = async (): Promise<Tenant[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenants/`);
    if (res.ok) {
      const raw = await res.json();
      const mapped = raw.map((t: any) => ({
        id: t.id,
        name: t.nombre || t.name || "Tenant",
        logo: (t.nombre || t.name || "TN")
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase(),
        description: `Servicio oficial de auxilio vial de ${t.nombre || t.name}.`,
        primaryColor: t.id === "auxilio-norte" ? "#6366f1" : (t.id === "mecanicos-express" ? "#10b981" : "#8b5cf6")
      }));
      if (typeof window !== "undefined") {
        const simulated = JSON.parse(localStorage.getItem("simulated_tenants") || "[]");
        const merged = [...mapped, ...simulated.filter((st: any) => !mapped.some((t: any) => t.id === st.id))];
        localStorage.setItem("cached_tenants", JSON.stringify(merged));
        return merged;
      }
      return mapped;
    }
  } catch (e) {
    console.error("Failed to fetch tenants from backend", e);
    if (typeof window !== "undefined") {
      const simulated = JSON.parse(localStorage.getItem("simulated_tenants") || "[]");
      const cached = localStorage.getItem("cached_tenants");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const merged = [...parsed, ...simulated.filter((st: any) => !parsed.some((t: any) => t.id === st.id))];
          return merged;
        } catch (err) {
          return simulated;
        }
      }
      return simulated;
    }
  }
  return [];
};

const isSimulatedTenant = (tenantId: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const simulated = JSON.parse(localStorage.getItem("simulated_tenants") || "[]");
    return simulated.some((t: any) => t.id === tenantId);
  } catch (e) {
    return false;
  }
};

export const apiService = {
  // 1. Tenants Info
  getTenants: (): Tenant[] => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_tenants");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Failed to parse cached tenants", e);
        }
      }
    }
    return INITIAL_TENANTS;
  },

  getAuthTenantId: (): string | null => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length > 1) {
          const payloadDecoded = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
          return payloadDecoded.tenant_id || null;
        }
      } catch (e) {
        console.error("Token decoding error in getAuthTenantId", e);
      }
    }
    return null;
  },

  getIncidentes: async (tenantId: string): Promise<Incidente[]> => {
    if (isSimulatedTenant(tenantId)) {
      const local = getLocalIncidents().filter(i => i.tenant_id === tenantId);
      if (local.length === 0) {
        const seed: Incidente[] = [
          {
            id: `sim_inc_1_${tenantId}`,
            tenant_id: tenantId,
            cliente_nombre: "María René",
            cliente_telefono: "+591 789 22110",
            vehiculo_placa: "4829-KLA",
            vehiculo_modelo: "Toyota RAV4 Plomo",
            descripcion: "Falla eléctrica, el vehículo no enciende.",
            latitude: -17.7830,
            longitude: -63.1820,
            estado: "atendido",
            taller_asignado_id: 1001,
            taller_nombre: "Taller Alfa Motor",
            fecha_reporte: new Date(Date.now() - 3600000 * 24).toISOString(),
            categoria_ia: "electrico"
          },
          {
            id: `sim_inc_2_${tenantId}`,
            tenant_id: tenantId,
            cliente_nombre: "Carlos Justiniano",
            cliente_telefono: "+591 760 88221",
            vehiculo_placa: "3182-YTB",
            vehiculo_modelo: "Nissan Frontier Negro",
            descripcion: "Pinchazo de llanta delantera derecha.",
            latitude: -17.7700,
            longitude: -63.1950,
            estado: "en_proceso",
            taller_asignado_id: 1002,
            taller_nombre: "Taller Rápido Express",
            fecha_reporte: new Date(Date.now() - 3600000 * 2).toISOString(),
            categoria_ia: "llanta"
          },
          {
            id: `sim_inc_3_${tenantId}`,
            tenant_id: tenantId,
            cliente_nombre: "Patricia Roca",
            cliente_telefono: "+591 690 12345",
            vehiculo_placa: "9283-UIN",
            vehiculo_modelo: "Suzuki Vitara Blanco",
            descripcion: "Se quedó sin batería en el supermercado.",
            latitude: -17.7950,
            longitude: -63.1750,
            estado: "pendiente",
            fecha_reporte: new Date().toISOString(),
            categoria_ia: "bateria"
          }
        ];
        const currentIncidents = getLocalIncidents();
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify([...currentIncidents, ...seed]));
        return seed;
      }
      return local;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const rawList = await res.json();
        const normalized = rawList.map((inc: any) => normalizeIncidente(inc));
        return normalized;
      }
      throw new Error("API failed");
    } catch (e) {
      return [];
    }
  },

  getIncidente: async (tenantId: string, id: string | number): Promise<Incidente> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/${id}`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const raw = await res.json();
        const normalized = normalizeIncidente(raw);

        // Sync local cache
        try {
          const local = getLocalIncidents();
          const index = local.findIndex(i => i.id.toString() === normalized.id.toString());
          if (index > -1) {
            local[index] = normalized;
          } else {
            local.push(normalized);
          }
          saveLocalIncidents(local);
        } catch (ex) {
          console.error("Failed to sync local incident cache", ex);
        }

        return normalized;
      }
      throw new Error("API failed");
    } catch (e) {
      // Fallback
      const incidents = getLocalIncidents();
      const match = incidents.find(i => i.id.toString() === id.toString());
      if (match) return normalizeIncidente(match);
      throw e;
    }
  },

  createIncidente: async (
    tenantId: string, 
    incidente: any, 
    foto?: File | boolean, 
    audio?: File, 
    isOffline: boolean = false
  ): Promise<Incidente> => {
    
    // Support either old argument order (where the 3rd parameter is isOffline)
    let offline = isOffline;
    let actualFoto: File | undefined = undefined;
    if (typeof foto === "boolean") {
      offline = foto;
    } else {
      actualFoto = foto;
    }

    const newInc: any = {
      id: Math.floor(Math.random() * 100000),
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };

    // Check if it's the old format:
    const isOldFormat = incidente && incidente.vehiculo_placa !== undefined;

    if (isOldFormat) {
      newInc.cliente_nombre = incidente.cliente_nombre;
      newInc.cliente_telefono = incidente.cliente_telefono;
      newInc.vehiculo_placa = incidente.vehiculo_placa;
      newInc.vehiculo_modelo = incidente.vehiculo_modelo;
      newInc.descripcion_texto = incidente.descripcion;
      newInc.latitud = incidente.latitude;
      newInc.longitud = incidente.longitude;
      newInc.estado = "reportado";
    } else {
      // New format:
      newInc.vehiculo_id = incidente.vehiculo_id;
      newInc.latitud = incidente.latitud;
      newInc.longitud = incidente.longitud;
      newInc.descripcion_texto = incidente.descripcion_texto;
      newInc.estado = "pendiente";
    }

    if (offline) {
      const queue = getOfflineQueue();
      const offlineId = "off_" + Math.random().toString(36).substr(2, 9);
      queue.push({ ...newInc, local_id: offlineId });
      saveOfflineQueue(queue);
      return normalizeIncidente({ ...newInc, local_id: offlineId });
    }

    // Real multipart form data construction
    const formData = new FormData();
    if (isOldFormat) {
      formData.append("vehiculo_id", "v_toyota"); // Default fallback
      formData.append("latitud", incidente.latitude.toString());
      formData.append("longitud", incidente.longitude.toString());
      if (incidente.descripcion) {
        formData.append("descripcion_texto", incidente.descripcion);
      }
    } else {
      formData.append("vehiculo_id", incidente.vehiculo_id);
      formData.append("latitud", incidente.latitud.toString());
      formData.append("longitud", incidente.longitud.toString());
      if (incidente.descripcion_texto) {
        formData.append("descripcion_texto", incidente.descripcion_texto);
      }
      if (actualFoto) {
        formData.append("foto", actualFoto);
      }
      if (audio) {
        formData.append("audio", audio);
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/`, {
        method: "POST",
        headers: getHeaders(tenantId, true),
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        return normalizeIncidente(data);
      }
      throw new Error("API failed");
    } catch (e) {
      // Local Storage Fallback
      const list = getLocalIncidents();
      const mockInc = normalizeIncidente(newInc);
      list.push(mockInc);
      saveLocalIncidents(list);
      return mockInc;
    }
  },

  // 3. Offline Sync Simulation
  syncOfflineIncidentes: async (tenantId: string): Promise<{ synced: number; skipped: number }> => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return { synced: 0, skipped: 0 };

    const tenantQueue = queue.filter(q => q.tenant_id === tenantId);
    const nonTenantQueue = queue.filter(q => q.tenant_id !== tenantId);

    // Map fields to what OfflineIncidenteSync schema expects in backend
    const apiPayload = tenantQueue.map(q => ({
      local_id: q.local_id,
      vehiculo_id: q.vehiculo_id,
      latitud: q.latitud,
      longitud: q.longitud,
      descripcion_texto: q.descripcion_texto,
      tipo_problema: "incierto",
      prioridad: "baja"
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/sync`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify(apiPayload)
      });
      
      if (res.ok) {
        saveOfflineQueue(nonTenantQueue);
        return { synced: tenantQueue.length, skipped: 0 };
      }
      throw new Error("Sync failed");
    } catch (e) {
      // Offline fallback: Merge tenant queue with standard local incidents list
      const list = getLocalIncidents();
      let syncedCount = 0;
      let skippedCount = 0;

      tenantQueue.forEach(off => {
        const exists = list.some(l => l.local_id === off.local_id && l.tenant_id === off.tenant_id);
        if (!exists) {
          list.push(normalizeIncidente({ ...off, estado: "pendiente" }));
          syncedCount++;
        } else {
          skippedCount++;
        }
      });

      saveLocalIncidents(list);
      saveOfflineQueue(nonTenantQueue);
      return { synced: syncedCount, skipped: skippedCount };
    }
  },

  getOfflineQueueCount: (tenantId: string): number => {
    return getOfflineQueue().filter(q => q.tenant_id === tenantId).length;
  },

  // 4. Cotizaciones (Mechanical Bids)
  getCotizacionesForIncidente: async (tenantId: string, incidenteId: string | number): Promise<Cotizacion[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cotizaciones/incidente/${incidenteId}`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const rawQuotes = await res.json();
        const normalized = rawQuotes.map((q: any) => normalizeCotizacion(q));
        
        // Filter: Keep only the latest quote per workshop to prevent duplicate items
        const uniqueByTaller: Cotizacion[] = [];
        const seenTalleres = new Set<string>();
        for (let i = normalized.length - 1; i >= 0; i--) {
          const q = normalized[i];
          const key = q.taller_id.toString();
          if (!seenTalleres.has(key)) {
            seenTalleres.add(key);
            uniqueByTaller.push(q);
          }
        }
        return uniqueByTaller.reverse();
      }
      throw new Error("API failed");
    } catch (e) {
      const local = getLocalCotizaciones()
        .filter(c => c.incidente_id.toString() === incidenteId.toString())
        .map(q => normalizeCotizacion(q));
        
      const uniqueByTaller: Cotizacion[] = [];
      const seenTalleres = new Set<string>();
      for (let i = local.length - 1; i >= 0; i--) {
        const q = local[i];
        const key = q.taller_id.toString();
        if (!seenTalleres.has(key)) {
          seenTalleres.add(key);
          uniqueByTaller.push(q);
        }
      }
      return uniqueByTaller.reverse();
    }
  },

  crearCotizacion: async (tenantId: string, quote: { incidente_id: string | number; taller_id: string | number; taller_nombre: string; costo_estimado: number; tiempo_estimado_minutos: number; descripcion: string }): Promise<Cotizacion> => {
    
    const apiPayload = {
      incidente_id: quote.incidente_id.toString(),
      monto: quote.costo_estimado,
      descripcion: quote.descripcion,
      tiempo_estimado: quote.tiempo_estimado_minutos.toString()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cotizaciones/`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify(apiPayload)
      });
      if (res.ok) {
        const data = await res.json();
        const normalizedQuote = normalizeCotizacion(data);
        
        // Save the quote locally so we know we bid on it
        try {
          const list = getLocalCotizaciones();
          if (!list.some(q => q.id.toString() === normalizedQuote.id.toString())) {
            list.push(normalizedQuote);
            saveLocalCotizaciones(list);
          }
        } catch (ex) {
          console.error("Failed to cache submitted quote", ex);
        }

        return normalizedQuote;
      }
      throw new Error("API failed");
    } catch (e) {
      // Local Storage
      const newQuote = {
        id: Math.floor(Math.random() * 100000),
        incidente_id: quote.incidente_id.toString(),
        taller_id: quote.taller_id.toString(),
        taller_nombre: quote.taller_nombre,
        costo_estimado: quote.costo_estimado,
        tiempo_estimado_minutos: quote.tiempo_estimado_minutos,
        descripcion: quote.descripcion,
        estado: "pendiente" as const,
        fecha_creacion: new Date().toISOString()
      };
      
      const list = getLocalCotizaciones();
      list.push(newQuote);
      saveLocalCotizaciones(list);

      // Update incident state to "cotizado"
      const incidents = getLocalIncidents();
      const incIdx = incidents.findIndex(i => i.id.toString() === quote.incidente_id.toString());
      if (incIdx !== -1 && incidents[incIdx].estado === "reportado") {
        incidents[incIdx].estado = "cotizado";
        saveLocalIncidents(incidents);
      }

      return normalizeCotizacion(newQuote);
    }
  },

  aceptarCotizacion: async (tenantId: string, quoteId: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cotizaciones/${quoteId}/aceptar`, {
        method: "POST",
        headers: getHeaders(tenantId)
      });
      if (res.ok) return true;
      throw new Error("API failed");
    } catch (e) {
      // Local Storage fallback logic matching exact DB trigger
      const quotes = getLocalCotizaciones();
      const targetIdx = quotes.findIndex(q => q.id.toString() === quoteId.toString());
      if (targetIdx === -1) return false;

      const incidentId = quotes[targetIdx].incidente_id;
      const workshopId = quotes[targetIdx].taller_id;
      const workshopName = quotes[targetIdx].taller_nombre;

      // Mark this accepted, other bids rejected
      quotes.forEach(q => {
        if (q.incidente_id.toString() === incidentId.toString()) {
          q.estado = q.id.toString() === quoteId.toString() ? "aceptado" : "rechazado";
        }
      });
      saveLocalCotizaciones(quotes);

      // Update Incident: Assign workshop, set status to 'en_camino'
      const incidents = getLocalIncidents();
      const incIdx = incidents.findIndex(i => i.id.toString() === incidentId.toString());
      if (incIdx !== -1) {
        incidents[incIdx].estado = "en_camino";
        incidents[incIdx].taller_asignado_id = workshopId;
        incidents[incIdx].taller_nombre = workshopName;
        incidents[incIdx].tecnico_asignado = "Ignacio Herrera (Técnico Principal)";
        incidents[incIdx].tecnico_telefono = "+591 788 543 210";
        incidents[incIdx].costo_final = quotes[targetIdx].costo_estimado;
        saveLocalIncidents(incidents);
      }

      return true;
    }
  },

  completarServicio: async (tenantId: string, incidenteId: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/${incidenteId}/completar`, {
        method: "POST",
        headers: getHeaders(tenantId)
      });
      if (res.ok) return true;
      throw new Error("API failed");
    } catch (e) {
      const incidents = getLocalIncidents();
      const idx = incidents.findIndex(i => i.id.toString() === incidenteId.toString());
      if (idx !== -1) {
        incidents[idx].estado = "pagado"; // completed & paid
        saveLocalIncidents(incidents);
        return true;
      }
      return false;
    }
  },

  crearReview: async (
    tenantId: string, 
    review: { 
      incidente_id?: string | number; 
      taller_id: string | number; 
      calificacion?: number; 
      rating?: number; 
      comentario: string 
    }
  ): Promise<any> => {
    const calif = review.calificacion !== undefined 
      ? review.calificacion 
      : (review.rating !== undefined ? review.rating : 5);
      
    const incId = review.incidente_id ? review.incidente_id.toString() : "0";

    const apiPayload = {
      incidente_id: incId,
      taller_id: review.taller_id.toString(),
      calificacion: parseFloat(calif.toString()),
      comentario: review.comentario
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews/`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify(apiPayload)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      // Local Storage review and recalculate rating for workshop
      const workshops = getLocalWorkshops();
      const wkIdx = workshops.findIndex(w => w.id.toString() === review.taller_id.toString());
      if (wkIdx !== -1) {
        const currentRating = workshops[wkIdx].rating;
        workshops[wkIdx].rating = parseFloat(((currentRating * 4 + calif) / 5).toFixed(1));
        saveLocalWorkshops(workshops);
      }
      return { success: true, message: "Review calculated successfully" };
    }
  },

  // 6. Manual workshop selection
  seleccionarTallerManualmente: async (tenantId: string, incidenteId: string | number, workshopId: string | number, workshopName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/${incidenteId}/seleccionar-taller`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ workshop_id: workshopId.toString() })
      });
      if (res.ok) return true;
      throw new Error("API failed");
    } catch (e) {
      const incidents = getLocalIncidents();
      const incIdx = incidents.findIndex(i => i.id.toString() === incidenteId.toString());
      if (incIdx !== -1) {
        incidents[incIdx].estado = "en_camino";
        incidents[incIdx].taller_asignado_id = workshopId.toString();
        incidents[incIdx].taller_nombre = workshopName;
        incidents[incIdx].tecnico_asignado = "Marcos Díaz (Asistencia Express)";
        incidents[incIdx].tecnico_telefono = "+591 711 222 333";
        incidents[incIdx].costo_final = 150; // Manual base cost
        saveLocalIncidents(incidents);
        return true;
      }
      return false;
    }
  },

  // 7. KPIs & Map data
  getKPIs: async (tenantId: string): Promise<KPIReport> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/kpis/`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      const incidents = getLocalIncidents();
      return getMockKPIs(tenantId, incidents);
    }
  },

  // 8. Workshops details
  getTalleres: async (tenantId: string): Promise<Workshop[]> => {
    if (isSimulatedTenant(tenantId)) {
      const local = getLocalWorkshops().filter(w => w.tenant_id === tenantId);
      if (local.length === 0) {
        const seed = [
          {
            id: 1001,
            tenant_id: tenantId,
            nombre: "Taller Alfa Motor",
            email: `taller_alfa@${tenantId}.com`,
            direccion: "Av. Principal Nro. 120, Central",
            telefono: "+591 700 11223",
            especialidad: "Mecánica Integral, Electricidad",
            rating: 4.8,
            latitude: -17.7830,
            longitude: -63.1820,
            activo: true,
            imagen: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=300&auto=format&fit=crop"
          },
          {
            id: 1002,
            tenant_id: tenantId,
            nombre: "Taller Rápido Express",
            email: `taller_rapido@${tenantId}.com`,
            direccion: "Radial 13, 4to Anillo",
            telefono: "+591 760 99887",
            especialidad: "Remolques, Auxilio Rápido",
            rating: 4.6,
            latitude: -17.7700,
            longitude: -63.1950,
            activo: true,
            imagen: "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=300&auto=format&fit=crop"
          }
        ];
        const currentWorkshops = getLocalWorkshops();
        localStorage.setItem(STORAGE_KEYS.WORKSHOPS, JSON.stringify([...currentWorkshops, ...seed]));
        return seed.map(w => normalizeWorkshop(w));
      }
      return local.map(w => normalizeWorkshop(w));
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes/talleres`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const rawList = await res.json();
        return rawList.map((w: any) => normalizeWorkshop(w));
      }
      throw new Error("API failed");
    } catch (e) {
      return getLocalWorkshops().filter(w => w.tenant_id === tenantId).map(w => normalizeWorkshop(w));
    }
  },

  // 9. Vehicles details (Client Profile)
  getPerfil: async (tenantId: string): Promise<{ id: string; nombre: string; email: string; telefono: string; tipo: string; vehiculos: Vehiculo[]; has_push_subscription?: boolean }> => {
    if (isSimulatedTenant(tenantId)) {
      const email = typeof window !== "undefined" ? localStorage.getItem("user_email") || "admin@admin.com" : "admin@admin.com";
      const tenantUsers = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`simulated_users_${tenantId}`) || "[]") : [];
      const user = tenantUsers.find((u: any) => u.email === email);
      return {
        id: "u_admin",
        nombre: user ? user.nombre : "Administrador",
        email: email,
        telefono: user ? user.telefono : "+591 70000000",
        tipo: user ? user.tipo : "admin",
        vehiculos: []
      };
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes/perfil`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      return {
        id: "u_client",
        nombre: "Juan Pérez",
        email: "cliente@cliente.com",
        telefono: "+59178012345",
        tipo: "cliente",
        vehiculos: []
      };
    }
  },

  chatDiagnostico: async (tenantId: string, message: string): Promise<{ respuesta: string; usó_ia: boolean; proveedor: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes/chat-diagnostico`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ message })
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      return {
        respuesta: "Hola, detecto problemas de conexión con el servidor o la red. Asegúrate de tener conexión a Internet y que el backend de Auxilio.AI esté encendido para habilitar el asistente de IA.",
        usó_ia: false,
        proveedor: "Heurística de Red (Fallback)"
      };
    }
  },

  getVehiculos: async (tenantId: string): Promise<Vehiculo[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes/vehiculos`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      return getLocalVehicles().filter(v => v.tenant_id === tenantId);
    }
  },

  crearVehiculo: async (tenantId: string, vehiculo: { marca: string; modelo: string; año: string; placa: string; color: string }): Promise<Vehiculo> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes/vehiculos`, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify(vehiculo)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      const list = getLocalVehicles();
      const newV = {
        id: "veh_" + Math.floor(Math.random() * 100000),
        usuario_id: "u_client",
        tenant_id: tenantId,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        año: vehiculo.año,
        placa: vehiculo.placa.toUpperCase(),
        color: vehiculo.color
      };
      list.push(newV);
      saveLocalVehicles(list);
      return newV;
    }
  },

  getRealtimeTracking: async (tenantId: string, incidenteId: string | number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidentes/${incidenteId}/ubicacion`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      // Offline fallback: simulate technician coming closer
      const incidents = getLocalIncidents();
      const inc = incidents.find(i => i.id.toString() === incidenteId.toString());
      return {
        incidente_id: incidenteId,
        incidente_latitud: inc?.latitude || -17.7833,
        incidente_longitud: inc?.longitude || -63.1812,
        tecnico_id: "tech_01",
        tecnico_latitud: (inc?.latitude || -17.7833) + 0.005,
        tecnico_longitud: (inc?.longitude || -63.1812) - 0.005,
        taller_latitud: (inc?.latitude || -17.7833) + 0.015,
        taller_longitud: (inc?.longitude || -63.1812) - 0.015,
        estado: inc?.estado || "en_camino",
        eta_minutos: 8
      };
    }
  },

  // 11. Workshop Specific Operations
  getSolicitudes: async (tenantId: string): Promise<Incidente[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/solicitudes`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const rawList = await res.json();
        const apiList: Incidente[] = rawList.map((inc: any) => normalizeIncidente(inc));
        
        // Workaround for backend omitting "cotizado" incidents:
        // Find incidents we have quoted that are not in the apiList.
        try {
          const userEmail = typeof window !== "undefined" ? localStorage.getItem("user_email") : null;
          const myWk = getLocalWorkshops().find(w => w.email === userEmail) || getLocalWorkshops()[0];
          const myWkId = myWk ? myWk.id.toString() : "";
          
          const localQuotes = getLocalCotizaciones().filter(q => 
            q.taller_id.toString() === myWkId
          );
          
          // Get unique incident IDs from our quotes that aren't already in the API list
          const quotedIncidentIds = Array.from(new Set(localQuotes.map(q => q.incidente_id.toString())))
            .filter(id => !apiList.some(inc => inc.id.toString() === id));
            
          if (quotedIncidentIds.length > 0) {
            const fetchPromises = quotedIncidentIds.map(async (id) => {
              try {
                // Fetch the real incident details from backend
                const incRes = await fetch(`${API_BASE_URL}/api/v1/incidentes/${id}`, {
                  headers: getHeaders(tenantId)
                });
                if (incRes.ok) {
                  const data = await incRes.json();
                  // Only include if it is still in "cotizado" or "pendiente" state
                  if (data.estado === "cotizado" || data.estado === "pendiente" || data.estado === "clasificado") {
                    return normalizeIncidente(data);
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch quoted incident ${id}`, err);
              }
              return null;
            });
            
            const extraIncidents = (await Promise.all(fetchPromises)).filter((inc): inc is Incidente => inc !== null);
            return [...apiList, ...extraIncidents];
          }
        } catch (ex) {
          console.error("Error fetching extra quoted incidents", ex);
        }
        
        return apiList;
      }
      throw new Error("API failed");
    } catch (e) {
      return [];
    }
  },

  getTallerHistorial: async (tenantId: string): Promise<Incidente[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/historial`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const rawList = await res.json();
        return rawList.map((inc: any) => normalizeIncidente(inc));
      }
      throw new Error("API failed");
    } catch (e) {
      return [];
    }
  },

  updateTallerDisponibilidad: async (tenantId: string, disponible: boolean): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/disponibilidad`, {
        method: "PUT",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ activo: disponible })
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      // Local fallback
      const workshops = getLocalWorkshops();
      const idx = workshops.findIndex(w => w.tenant_id === tenantId);
      if (idx !== -1) {
        workshops[idx].activo = disponible;
        saveLocalWorkshops(workshops);
      }
      return { status: "success", activo: disponible };
    }
  },

  updateAdminTallerDisponibilidad: async (tenantId: string, tallerId: string | number, disponible: boolean): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/talleres/${tallerId}/disponibilidad`, {
        method: "PUT",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ activo: disponible })
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      // Local fallback
      const workshops = getLocalWorkshops();
      const idx = workshops.findIndex(w => w.id.toString() === tallerId.toString());
      if (idx !== -1) {
        workshops[idx].activo = disponible;
        saveLocalWorkshops(workshops);
      }
      return { status: "success", activo: disponible };
    }
  },

  updateServicioEstado: async (tenantId: string, incidenteId: string | number, nuevoEstado: string): Promise<Incidente> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/servicio/${incidenteId}/estado?nuevo_estado=${nuevoEstado}`, {
        method: "PUT",
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncidente(raw);
      }
      throw new Error("API failed");
    } catch (e) {
      // Fallback
      const incidents = getLocalIncidents();
      const idx = incidents.findIndex(i => i.id.toString() === incidenteId.toString());
      if (idx !== -1) {
        incidents[idx].estado = nuevoEstado as any;
        saveLocalIncidents(incidents);
        return normalizeIncidente(incidents[idx]);
      }
      throw new Error("Incidente no encontrado en almacenamiento local");
    }
  },

  getTecnicos: async (tenantId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/tecnicos`, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      // Local fallback
      return [
        { id: "tech_01", nombre: "Ignacio Herrera", telefono: "+591 788 543 210", disponible: true },
        { id: "tech_02", nombre: "Marcos Díaz", telefono: "+591 711 222 333", disponible: true },
        { id: "tech_03", nombre: "Lucas Rivas", telefono: "+591 733 444 555", disponible: false }
      ];
    }
  },

  getTecnicosDisponiblesParaIncidente: async (
    tenantId: string,
    incidenteId: string | number
  ): Promise<any[]> => {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/incidentes/${incidenteId}/tecnicos-disponibles`,
      { headers: getHeaders(tenantId) }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail || "No se pudieron consultar técnicos disponibles.");
    }
    return Array.isArray(data) ? data : [];
  },

  reasignarTecnico: async (
    tenantId: string,
    incidenteId: string | number,
    tecnicoId: string,
    motivo: string
  ): Promise<Incidente> => {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/incidentes/${incidenteId}/reasignar-tecnico`,
      {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify({
          tecnico_id: tecnicoId,
          motivo
        })
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail || "No se pudo completar la reasignación.");
    }
    return normalizeIncidente(data);
  },

  createTecnico: async (tenantId: string, payload: { nombre: string; telefono: string; disponible: boolean }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/talleres/tecnicos`, {
      method: "POST",
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
    throw new Error("Error al registrar el técnico.");
  },

  deleteTecnico: async (tenantId: string, tecnicoId: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/talleres/tecnicos/${tecnicoId}`, {
      method: "DELETE",
      headers: getHeaders(tenantId)
    });
    if (res.ok) return true;
    throw new Error("Error al eliminar el técnico.");
  },

  toggleTecnicoDisponibilidad: async (tenantId: string, tecnicoId: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/talleres/tecnicos/${tecnicoId}/disponibilidad`, {
      method: "PUT",
      headers: getHeaders(tenantId)
    });
    if (res.ok) return await res.json();
    throw new Error("Error al cambiar disponibilidad del técnico.");
  },

  updateTecnicoUbicacion: async (tenantId: string, tecnicoId: string, latitud: number, longitud: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/talleres/tecnico/${tecnicoId}/ubicacion`, {
        method: "PUT",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ latitud, longitud })
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      return { status: "success", latitud, longitud };
    }
  },

  // 12. Workshop Specific KPI Queries
  getKPIsResumen: async (tenantId: string, desde?: string, hasta?: string): Promise<any> => {
    if (isSimulatedTenant(tenantId)) {
      const incidents = getLocalIncidents().filter(i => i.tenant_id === tenantId);
      const active = incidents.filter(i => i.estado !== "atendido" && i.estado !== "pagado" && i.estado !== "cancelado").length;
      const completed = incidents.filter(i => i.estado === "atendido" || i.estado === "pagado").length;
      const canceled = incidents.filter(i => i.estado === "cancelado").length;
      const totalBilled = completed * 150;
      return {
        total_incidentes: incidents.length,
        incidentes_activos: active,
        incidentes_completados: completed,
        incidentes_cancelados: canceled,
        tiempo_resolucion_promedio_min: 24.5,
        promedio_rating_talleres: 4.7,
        total_facturado: totalBilled,
        comisiones_retenidas: totalBilled * 0.10
      };
    }
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/resumen${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      throw new Error("API failed");
    } catch (e) {
      return {
        total_incidentes: 0,
        incidentes_activos: 0,
        incidentes_completados: 0,
        incidentes_cancelados: 0,
        tiempo_resolucion_promedio_min: 0.0,
        promedio_rating_talleres: 0.0,
        total_facturado: 0.0,
        comisiones_retenidas: 0.0
      };
    }
  },

  getKPIsSLA: async (tenantId: string, desde?: string, hasta?: string): Promise<{ sla_percentage: number }> => {
    if (isSimulatedTenant(tenantId)) {
      return { sla_percentage: 94.6 };
    }
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/sla${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      throw new Error("API failed");
    } catch (e) {
      return { sla_percentage: 0.0 };
    }
  },

  getKPIsZonasCalor: async (tenantId: string, desde?: string, hasta?: string): Promise<any> => {
    if (isSimulatedTenant(tenantId)) {
      const incidents = getLocalIncidents().filter(i => i.tenant_id === tenantId);
      return {
        type: "FeatureCollection",
        features: incidents.map(inc => ({
          type: "Feature",
          properties: { weight: 1.0 },
          geometry: {
            type: "Point",
            coordinates: [inc.longitude, inc.latitude]
          }
        }))
      };
    }
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/zonas-calor${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.type === "FeatureCollection") return data;
        return {
          type: "FeatureCollection",
          features: (data || []).map((pt: any) => ({
            type: "Feature",
            properties: { weight: pt.peso || 1.0 },
            geometry: {
              type: "Point",
              coordinates: [pt.longitud || pt.longitude, pt.latitud || pt.latitude]
            }
          }))
        };
      }
      throw new Error("API failed");
    } catch (e) {
      return {
        type: "FeatureCollection",
        features: []
      };
    }
  },

  getKPIsIncidentesPorTipo: async (tenantId: string, desde?: string, hasta?: string): Promise<any> => {
    if (isSimulatedTenant(tenantId)) {
      const incidents = getLocalIncidents().filter(i => i.tenant_id === tenantId);
      const counts: Record<string, number> = {};
      incidents.forEach(inc => {
        const type = inc.categoria_ia || "otro";
        counts[type] = (counts[type] || 0) + 1;
      });
      return counts;
    }
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/incidentes-por-tipo${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const data = await res.json();
        return data || {};
      }
      throw new Error("API failed");
    } catch (e) {
      return {};
    }
  },

  getKPIsTalleresEficientes: async (tenantId: string, desde?: string, hasta?: string): Promise<any> => {
    if (isSimulatedTenant(tenantId)) {
      return [
        { taller_nombre: "Taller Alfa Motor", rating_promedio: 4.8, tiempo_respuesta_promedio_min: 18 },
        { taller_nombre: "Taller Rápido Express", rating_promedio: 4.6, tiempo_respuesta_promedio_min: 24 }
      ];
    }
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/talleres-eficientes${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) return await res.json();
      throw new Error("API failed");
    } catch (e) {
      return [];
    }
  },

  getKPIsCancelados: async (tenantId: string, desde?: string, hasta?: string): Promise<any> => {
    try {
      const queryParams = new URLSearchParams();
      if (desde) queryParams.append("desde", desde);
      if (hasta) queryParams.append("hasta", hasta);
      const url = `${API_BASE_URL}/api/v1/kpis/cancelados${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const res = await fetch(url, {
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      throw new Error("API failed");
    } catch (e) {
      return {
        total_cancelados: 0,
        tasa_cancelacion: 0.0
      };
    }
  },

  getAICotizacionSugerida: (incidente: any, taller: any): { monto: number; tiempo: number; descripcion: string; distanciaKm: number } => {
    // 1. Calculate real distance in km using Haversine formula
    const lat1 = incidente.latitude || -17.7833;
    const lon1 = incidente.longitude || -63.1812;
    const lat2 = taller.latitud || -17.7700;
    const lon2 = taller.longitud || -63.1600;

    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distKm = parseFloat((R * c).toFixed(1)) || 1.5;

    // 2. Base mobilization pricing in Santa Cruz (Bolivianos)
    // Base 50 Bs. for up to 3 km, 10 Bs. for each additional km.
    const baseMobilization = distKm <= 3 ? 50 : 50 + Math.ceil((distKm - 3) * 10);

    // 3. Specialty/problem pricing
    let problemCost = 150; // default
    let timeBase = 15;
    let descriptionText = "";

    const prob = (incidente.tipo_problema || "incierto").toLowerCase();

    if (prob === "llanta") {
      problemCost = 80;
      timeBase = 12;
      descriptionText = `Auxilio vial rápido por llanta pinchada en Santa Cruz (Distancia: ${distKm} km). Incluye: 1. Desplazamiento del mecánico y herramienta de torque al sitio. 2. Montaje seguro de la rueda de repuesto del cliente. 3. Calibración de presión a 32 PSI. 4. Revisión rápida de pernos y rosca.`;
    } else if (prob === "batería" || prob === "bateria") {
      problemCost = 100;
      timeBase = 10;
      descriptionText = `Servicio de puente y recarga eléctrica en Santa Cruz (Distancia: ${distKm} km). Incluye: 1. Movilización de técnico con arrancador portátil profesional. 2. Limpieza y desulfatación rápida de bornes. 3. Paso de corriente seguro. 4. Diagnóstico telemétrico básico del alternador y nivel de carga.`;
    } else if (prob === "motor") {
      problemCost = 250;
      timeBase = 20;
      descriptionText = `Asistencia técnica avanzada por recalentamiento o falla de motor en Santa Cruz (Distancia: ${distKm} km). Incluye: 1. Desplazamiento de especialista mecánico. 2. Diagnóstico avanzado (escaneo OBD-II si aplica). 3. Inspección de mangueras, nivel de refrigerante y aceite. 4. Intento de encendido seguro.`;
    } else if (prob === "choque") {
      problemCost = 400;
      timeBase = 25;
      descriptionText = `Despacho de grúa y asistencia técnica de choque en Santa Cruz (Distancia: ${distKm} km). Incluye: 1. Movilización de grúa de plataforma al lugar del siniestro. 2. Carga y anclaje seguro del vehículo. 3. Transporte y traslado al taller de Taller Norte o destino solicitado.`;
    } else {
      problemCost = 120;
      timeBase = 15;
      descriptionText = `Auxilio y diagnóstico técnico general de emergencia en carretera en Santa Cruz (Distancia: ${distKm} km). Incluye: 1. Desplazamiento del mecánico con herramientas básicas. 2. Inspección visual y telemétrica del vehículo. 3. Solución menor en sitio o remisión certificada a taller central.`;
    }

    const totalCost = baseMobilization + problemCost;
    const totalTime = Math.ceil(timeBase + (distKm * 2.5));

    return {
      monto: totalCost,
      tiempo: totalTime,
      descripcion: descriptionText,
      distanciaKm: distKm
    };
  },

  // 10. Real Multi-Tenant Backend Authentication
  login: async (tenantId: string, email: string, password: string): Promise<{ access_token: string; token_type: string; user_type: string }> => {
    if (isSimulatedTenant(tenantId)) {
      const tenantUsers = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`simulated_users_${tenantId}`) || "[]") : [];
      const user = tenantUsers.find((u: any) => u.email === email && u.password === password);
      if (user) {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const payload = btoa(JSON.stringify({ tenant_id: tenantId, sub: email, role: user.tipo }));
        const token = `${header}.${payload}.signature`;
        return {
          access_token: token,
          token_type: "bearer",
          user_type: user.tipo
        };
      } else {
        throw new Error("Credenciales incorrectas para este inquilino simulado.");
      }
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId
      },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error al iniciar sesión." }));
      throw new Error(err.detail || "Error en credenciales para este tenant.");
    }
    return await res.json();
  },

  registerCliente: async (tenantId: string, payload: { nombre: string; email: string; telefono: string; password: string }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/cliente`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error al registrar cliente." }));
      throw new Error(err.detail || "Error en el registro.");
    }
    return await res.json();
  },

  registerTaller: async (tenantId: string, payload: {
    nombre: string;
    email: string;
    telefono: string;
    password: string;
    direccion: string;
    latitud: number;
    longitud: number;
    especialidades: string[];
  }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/taller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error al registrar taller." }));
      throw new Error(err.detail || "Error en el registro.");
    }
    return await res.json();
  },

  savePushSubscription: async (tenantId: string, subscription: any): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/push-subscription`, {
      method: "POST",
      headers: getHeaders(tenantId),
      body: JSON.stringify(subscription)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error al guardar suscripción push." }));
      throw new Error(err.detail || "Error al registrar notificaciones push.");
    }
    return await res.json();
  },

  getKPIsReporteVoz: async (tenantId: string, query: string): Promise<any> => {
    try {
      const url = `${API_BASE_URL}/api/v1/kpis/reporte-voz`;
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(tenantId),
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error("Voice report API failed");
    } catch (e) {
      console.error("Failed to fetch backend voice report, returning mock fallback data:", e);
      return {
        respuesta_voz: "El nivel de cumplimiento de SLA general se encuentra en un excelente 92%. Taller Central SCZ lidera el rendimiento del tenant con 4.9 estrellas de calificación.",
        analisis_narrativo: "### 📊 Cumplimiento de SLA y Operaciones\n\nEl SLA global del tenant **auxilio-norte** se mantiene estable en **92.0%**.\n\n#### 🌟 Desempeño del Taller Estrella\nEl **Taller Central SCZ** es el de mejor rendimiento con:\n- Calificación promedio de **4.9 / 5.0 ⭐**.\n- 15 incidentes completados satisfactoriamente.\n- Tiempo promedio de arribo de **15.4 minutos**.\n\n#### 💡 Recomendación\nLos incidentes de llantas han crecido un 12% este mes. Recomendamos posicionar grúas cerca de la zona norte para reducir los tiempos de respuesta ante emergencias viales.",
        kpis_destacados: [
          {
            label: "Cumplimiento SLA",
            value: "92.0%",
            trend: "up",
            change_percentage: "Estable"
          },
          {
            label: "Taller Estrella",
            value: "Taller Central SCZ",
            trend: "neutral",
            change_percentage: "4.9 Rating"
          }
        ],
        visualizacion: {
          tipo_grafico: "bar",
          datos: [
            { label: "Taller Central SCZ", value: 15 },
            { label: "Taller Rápido Express", value: 8 },
            { label: "Mecánica Equipetrol", value: 5 }
          ]
        }
      };
    }
  },

  getTallerDashboard: async (tenantId: string): Promise<any> => {
    try {
      const url = `${API_BASE_URL}/api/v1/talleres/dashboard`;
      const res = await fetch(url, {
        method: "GET",
        headers: getHeaders(tenantId)
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error("Taller dashboard API failed");
    } catch (e) {
      console.error("Failed to fetch taller dashboard data, using mock fallback:", e);
      return {
        taller: {
          id: "7fa82a1c-92b0-496b-ba1a-5b1234567890",
          nombre: "Taller Central SCZ",
          email: "taller@taller.com",
          telefono: "+59133445566",
          direccion: "Av. Cristo Redentor, 3er anillo",
          rating: 4.5,
          activo: true,
          especialidades: ["motor", "frenos", "batería", "llanta"]
        },
        kpis: {
          total_incidentes: 0,
          incidentes_activos: 0,
          incidentes_completados: 0,
          incidentes_cancelados: 0,
          facturacion_bruta: 0.0,
          comision_plataforma: 0.0,
          ingresos_netos: 0.0,
          total_tecnicos: 0,
          tecnicos_disponibles: 0,
          tecnicos_ocupados: 0
        },
        recent_reviews: [
          {
            id: "e67e3a9c-d01b-4f99-90b1-4bb234567890",
            calificacion: 5.0,
            comentario: "Excelente servicio, cambiaron la llanta súper rápido.",
            created_at: "2026-06-08T12:00:00.000000"
          },
          {
            id: "e67e3a9c-d01b-4f99-90b1-4bb234567891",
            calificacion: 4.0,
            comentario: "Buen soporte en el remolque, técnico muy educado.",
            created_at: "2026-06-07T18:24:00.000000"
          }
        ],
        recent_incidents: [
          {
            id: "c56e3b8a-21cb-47b1-91a0-9aa123456789",
            cliente_nombre: "Juan Pérez",
            vehiculo: "Toyota Hilux (4567-XYZ)",
            estado: "pagado",
            tipo_problema: "llanta",
            prioridad: "alta",
            created_at: "2026-06-08T11:30:00.000000"
          }
        ]
      };
    }
  },

  createTaller: async (tenantId: string, tallerData: any): Promise<Workshop> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/talleres/`, {
      method: "POST",
      headers: {
        ...getHeaders(tenantId),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tallerData)
    });
    if (res.ok) {
      const data = await res.json();
      return normalizeWorkshop(data);
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Error al crear taller");
  }
};

export const exportUtilities = {
  exportToPDF: (data: any[], title: string, columns: { header: string; key: string }[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const rowsHtml = data.map((row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
        ${columns.map(col => {
          const val = row[col.key] !== undefined ? String(row[col.key]) : '';
          const isMonto = col.key === 'monto' || col.key === 'ingresos' || val.includes('Bs.');
          const isCrit = val === 'critica' || val === 'critico' || val === 'urgente';
          const isSuccess = val === 'pagado' || val === 'activo' || val === 'completado';
          
          let cellStyle = "padding: 10px 12px; font-size: 10.5px; color: #334155; font-weight: 550;";
          if (isMonto) {
            cellStyle += " font-family: monospace; font-weight: bold; color: #059669; text-align: right;";
          } else if (isCrit) {
            cellStyle += " color: #e11d48; font-weight: bold;";
          } else if (isSuccess) {
            cellStyle += " color: #059669; font-weight: bold;";
          }
          return `<td style="${cellStyle}">${val}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const headersHtml = columns.map(col => {
      const isMonto = col.key === 'monto' || col.key === 'ingresos';
      const align = isMonto ? 'right' : 'left';
      return `
        <th style="padding: 12px; text-align: ${align}; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #ffffff; background-color: #059669; border-bottom: 3px solid #047857; letter-spacing: 0.05em; font-family: sans-serif;">
          ${col.header}
        </th>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px 30px; margin: 0; color: #1e293b; background-color: #ffffff; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #10b981; padding-bottom: 18px; margin-bottom: 25px; }
            .brand-section { display: flex; align-items: center; gap: 10px; }
            .brand-logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); }
            .title { font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; letter-spacing: 0.02em; }
            .subtitle { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-top: 3px; letter-spacing: 0.05em; }
            .meta-info { font-size: 10px; text-align: right; line-height: 1.6; color: #475569; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 9px; text-align: center; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="brand-section">
              <div class="brand-logo">A</div>
              <div>
                <h1 class="title">${title}</h1>
                <div class="subtitle">Auxilio.AI • Consola de Inteligencia Operacional</div>
              </div>
            </div>
            <div class="meta-info">
              <strong>Generado:</strong> ${new Date().toLocaleString()}<br>
              <strong>Registros:</strong> ${data.length}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Reporte generado de forma segura mediante telemetría en tiempo real de Auxilio.AI
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  },

  exportToExcel: (data: any[], columns: { header: string; key: string }[], filename: string) => {
    const headers = columns.map(c => c.header);
    const rows = data.map(row => 
      columns.map(col => {
        const val = row[col.key];
        const str = String(val ?? "");
        // Escape quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`;
      })
    );
    
    // Add UTF-8 BOM and sep=, so Excel immediately knows it is a comma-separated file
    const csvContent = "\uFEFF" + "sep=,\r\n" + [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\r\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToJSON: (data: any[], filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

