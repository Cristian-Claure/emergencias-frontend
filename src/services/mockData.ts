export interface Tenant {
  id: string;
  name: string;
  logo: string;
  description: string;
  primaryColor: string;
}

export interface Workshop {
  id: string | number;
  tenant_id: string;
  nombre: string;
  email?: string;
  direccion: string;
  telefono: string;
  especialidad: string;
  rating: number;
  latitude: number;
  longitude: number;
  activo: boolean;
  imagen: string;
  comision_porcentaje?: number;
  total_tecnicos?: number;
  tecnicos_disponibles?: number;
}

export interface Cotizacion {
  id: string | number;
  incidente_id: string | number;
  taller_id: string | number;
  taller_nombre: string;
  costo_estimado: number;
  tiempo_estimado_minutos: number;
  descripcion: string;
  estado: "pendiente" | "aceptado" | "rechazado";
  fecha_creacion: string;
}

export interface Incidente {
  id: string | number;
  tenant_id: string;
  local_id?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  vehiculo_placa: string;
  vehiculo_modelo: string;
  descripcion: string;
  latitude: number;
  longitude: number;
  estado: "pendiente" | "reportado" | "clasificado" | "cotizado" | "sin_tecnico" | "en_proceso" | "en_sitio" | "en_camino" | "atendido" | "pagado" | "cancelado";
  prioridad_ia?: "baja" | "media" | "alta" | "critica";
  categoria_ia?: "motor" | "electrico" | "llanta" | "choque" | "bateria" | "otro";
  analisis_ia?: string;
  taller_asignado_id?: string | number;
  taller_nombre?: string;
  tecnico_asignado?: string;
  tecnico_telefono?: string;
  tecnico_id?: string;
  tecnico_lat?: number;
  tecnico_lng?: number;
  costo_final?: number;
  created_at?: string;
  updated_at?: string;
  fecha_reporte: string;
  evidencias?: {
    id: string;
    tipo: string;
    url_gcs: string;
    transcripcion?: string;
    analisis_ia?: any;
  }[];
}

export interface KPIReport {
  total_incidentes: number;
  tasa_cancelacion: number;
  tiempo_resolucion_promedio_minutos: number;
  rating_promedio_talleres: number;
  total_facturado: number;
  comisiones_retenidas: number;
  distribucion_estados: Record<string, number>;
  distribucion_prioridades: Record<string, number>;
  incidentes_calor: { latitude: number; longitude: number; peso: number }[];
}

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: "auxilio-norte",
    name: "Auxilio Norte S.A.",
    logo: "AN",
    description: "Servicio de emergencias express en la zona norte con soporte de drones y remolque pesado.",
    primaryColor: "#6366f1"
  },
  {
    id: "mecanicos-express",
    name: "Mecánicos Express PWA",
    logo: "ME",
    description: "Red premium descentralizada de mecánicos independientes y talleres autorizados 24/7.",
    primaryColor: "#10b981"
  }
];

export const INITIAL_WORKSHOPS: Record<string, Workshop[]> = {
  "auxilio-norte": [
    {
      id: 101,
      tenant_id: "auxilio-norte",
      nombre: "Taller Alfa Motor",
      email: "taller@taller.com",
      direccion: "Av. Industrial 455, Zona Norte",
      telefono: "+591 780 654 321",
      especialidad: "Motores e Inyección Electrónica",
      rating: 4.8,
      latitude: -17.7761,
      longitude: -63.1905,
      activo: true,
      imagen: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: 102,
      tenant_id: "auxilio-norte",
      nombre: "Frenos y Neumáticos Express",
      email: "taller2@taller.com",
      direccion: "Av. Busch, Segundo Anillo",
      telefono: "+591 780 111 222",
      especialidad: "Frenos, Suspensión y Neumáticos",
      rating: 4.5,
      latitude: -17.7612,
      longitude: -63.1932,
      activo: true,
      imagen: "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: 103,
      tenant_id: "auxilio-norte",
      nombre: "Clínica Eléctrica Automotriz",
      email: "taller3@taller.com",
      direccion: "Av. Cristo Redentor, 3er anillo",
      telefono: "+591 780 888 777",
      especialidad: "Baterías, Alternadores y Computadoras",
      rating: 4.2,
      latitude: -17.7589,
      longitude: -63.1754,
      activo: true,
      imagen: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=300&auto=format&fit=crop"
    }
  ],
  "mecanicos-express": [
    {
      id: 201,
      tenant_id: "mecanicos-express",
      nombre: "Taller Mecánico El Veloz",
      email: "taller_me@taller.com",
      direccion: "Av. Banzer, 4to anillo",
      telefono: "+591 780 666 777",
      especialidad: "Mecánica General y Auxilio Inmediato",
      rating: 4.9,
      latitude: -17.7687,
      longitude: -63.1824,
      activo: true,
      imagen: "https://images.unsplash.com/photo-1530047139082-5435ca3c46e8?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: 202,
      tenant_id: "mecanicos-express",
      nombre: "SOS Baterías y Auxilio Eléctrico",
      email: "taller_me2@taller.com",
      direccion: "Carretera al Norte, Warnes",
      telefono: "+591 780 333 222",
      especialidad: "Paso de Corriente y Venta de Baterías",
      rating: 4.6,
      latitude: -17.8304,
      longitude: -63.1412,
      activo: true,
      imagen: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=300&auto=format&fit=crop"
    }
  ]
};

export const INITIAL_INCIDENTS: Record<string, Incidente[]> = {
  "auxilio-norte": [
    {
      id: 1,
      tenant_id: "auxilio-norte",
      cliente_nombre: "Juan Pérez",
      cliente_telefono: "+591 712 345 678",
      vehiculo_placa: "A8B-234",
      vehiculo_modelo: "Toyota Corolla 2021 (Gris)",
      descripcion: "El carro se apagó de la nada en plena avenida principal, sale humo blanco del capó.",
      latitude: -17.7792,
      longitude: -63.1873,
      estado: "cotizado",
      prioridad_ia: "alta",
      categoria_ia: "motor",
      analisis_ia: "Se detecta posible sobrecalentamiento del bloque motor o ruptura de la manguera del refrigerante (radiador). Se recomienda inmovilizar el vehículo inmediatamente y solicitar grúa o auxilio mecánico con refrigerante de repuesto.",
      fecha_reporte: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
    },
    {
      id: 2,
      tenant_id: "auxilio-norte",
      cliente_nombre: "María Rodríguez",
      cliente_telefono: "+591 734 567 890",
      vehiculo_placa: "F5T-901",
      vehiculo_modelo: "Hyundai Tucson 2019 (Negro)",
      descripcion: "Llanta delantera derecha reventada tras pasar por un bache profundo. No tengo llave de ruedas.",
      latitude: -17.7711,
      longitude: -63.1689,
      estado: "pagado",
      prioridad_ia: "baja",
      categoria_ia: "llanta",
      analisis_ia: "Pinchadura o ruptura de neumático por impacto. Requiere cambio de neumático de repuesto. Se despachó soporte básico con gato hidráulico y llave de cruz.",
      taller_asignado_id: 102,
      taller_nombre: "Frenos y Neumáticos Express",
      tecnico_asignado: "Carlos Mendoza",
      tecnico_telefono: "+591 781 726 354",
      costo_final: 80,
      fecha_reporte: new Date(Date.now() - 3600000 * 12).toISOString() // 12 hours ago
    }
  ],
  "mecanicos-express": [
    {
      id: 3,
      tenant_id: "mecanicos-express",
      cliente_nombre: "Roberto Carlos",
      cliente_telefono: "+591 777 888 999",
      vehiculo_placa: "X9W-456",
      vehiculo_modelo: "Kia Sportage 2020 (Rojo)",
      descripcion: "Me quedé sin batería en el sótano del centro comercial Ventura Mall. Luces dejadas encendidas.",
      latitude: -17.7654,
      longitude: -63.1951,
      estado: "reportado",
      prioridad_ia: "media",
      categoria_ia: "bateria",
      analisis_ia: "Batería descargada por consumo pasivo. Requiere arrancador portátil de 12V o paso de corriente asistido. Tarea de complejidad baja.",
      fecha_reporte: new Date(Date.now() - 600000).toISOString() // 10 mins ago
    }
  ]
};

export const INITIAL_COTIZACIONES: Cotizacion[] = [
  {
    id: 501,
    incidente_id: 1,
    taller_id: 101,
    taller_nombre: "Taller Alfa Motor",
    costo_estimado: 120,
    tiempo_estimado_minutos: 25,
    descripcion: "Envío de mecánico especialista en diagnóstico OBD2 con escáner, refrigerante y grúa de arrastre incluida si es necesario.",
    estado: "pendiente",
    fecha_creacion: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 502,
    incidente_id: 1,
    taller_id: 103,
    taller_nombre: "Clínica Eléctrica Automotriz",
    costo_estimado: 95,
    tiempo_estimado_minutos: 40,
    descripcion: "Revisión técnica de sensores de temperatura de motor y fusibles. Despacho inmediato del técnico principal.",
    estado: "pendiente",
    fecha_creacion: new Date(Date.now() - 1800000).toISOString()
  }
];

export const getMockKPIs = (tenantId: string, incidents: Incidente[]): KPIReport => {
  const filtered = incidents.filter(i => i.tenant_id === tenantId);
  const total = filtered.length;
  const cancelados = filtered.filter(i => i.estado === "cancelado").length;
  const tasa = total > 0 ? (cancelados / total) * 100 : 0;
  
  const pagados = filtered.filter(i => i.costo_final && i.costo_final > 0);
  const facturado = pagados.reduce((acc, curr) => acc + (curr.costo_final || 0), 0);
  const comisiones = facturado * 0.1; // 10% Platform Cut

  const distribucion_estados: Record<string, number> = {
    reportado: 0,
    clasificado: 0,
    cotizado: 0,
    en_camino: 0,
    atendido: 0,
    pagado: 0,
    cancelado: 0
  };

  const distribucion_prioridades: Record<string, number> = {
    baja: 0,
    media: 0,
    alta: 0,
    critica: 0
  };

  filtered.forEach(inc => {
    distribucion_estados[inc.estado] = (distribucion_estados[inc.estado] || 0) + 1;
    if (inc.prioridad_ia) {
      distribucion_prioridades[inc.prioridad_ia] = (distribucion_prioridades[inc.prioridad_ia] || 0) + 1;
    }
  });

  const incidentes_calor = filtered.map(inc => ({
    latitude: inc.latitude,
    longitude: inc.longitude,
    peso: inc.prioridad_ia === "critica" ? 1.0 : inc.prioridad_ia === "alta" ? 0.8 : inc.prioridad_ia === "media" ? 0.5 : 0.2
  }));

  // Average ratings
  const workshopsList = INITIAL_WORKSHOPS[tenantId] || [];
  const totalRating = workshopsList.reduce((acc, curr) => acc + curr.rating, 0);
  const rating_promedio = workshopsList.length > 0 ? totalRating / workshopsList.length : 4.5;

  return {
    total_incidentes: total,
    tasa_cancelacion: Math.round(tasa),
    tiempo_resolucion_promedio_minutos: 32, // simulated constant avg
    rating_promedio_talleres: parseFloat(rating_promedio.toFixed(1)),
    total_facturado: facturado,
    comisiones_retenidas: parseFloat(comisiones.toFixed(2)),
    distribucion_estados,
    distribucion_prioridades,
    incidentes_calor
  };
};
