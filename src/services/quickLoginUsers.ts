/**
 * Quick login users from backend seed.py
 * Useful for rapid testing and development
 */

export interface QuickLoginUser {
  tenant_id: string;
  tenant_nombre: string;
  nombre: string;
  email: string;
  tipo: "cliente" | "taller" | "admin";
  password: string;
  telefono: string;
}

export const QUICK_LOGIN_USERS: QuickLoginUser[] = [
  // ===== AUXILIO NORTE =====
  {
    tenant_id: "auxilio-norte",
    tenant_nombre: "Auxilio Norte",
    nombre: "Admin Auxilio Norte",
    email: "admin@admin.com",
    tipo: "admin",
    password: "admin",
    telefono: "+59170011223",
  },
  {
    tenant_id: "auxilio-norte",
    tenant_nombre: "Auxilio Norte",
    nombre: "Juan Pérez",
    email: "cliente@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59178012345",
  },
  {
    tenant_id: "auxilio-norte",
    tenant_nombre: "Auxilio Norte",
    nombre: "María Delgado",
    email: "cliente2@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59178054321",
  },
  {
    tenant_id: "auxilio-norte",
    tenant_nombre: "Auxilio Norte",
    nombre: "Taller Central SCZ",
    email: "taller@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133445566",
  },
  {
    tenant_id: "auxilio-norte",
    tenant_nombre: "Auxilio Norte",
    nombre: "Taller Rápido Express",
    email: "taller2@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133445577",
  },

  // ===== MECANICOS EXPRESS =====
  {
    tenant_id: "mecanicos-express",
    tenant_nombre: "Mecánicos Express",
    nombre: "Admin Express",
    email: "admin_me@admin.com",
    tipo: "admin",
    password: "admin",
    telefono: "+59170099001",
  },
  {
    tenant_id: "mecanicos-express",
    tenant_nombre: "Mecánicos Express",
    nombre: "Luis Fernández",
    email: "cliente_me@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59176543210",
  },
  {
    tenant_id: "mecanicos-express",
    tenant_nombre: "Mecánicos Express",
    nombre: "Patricia Sosa",
    email: "cliente2_me@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59176543211",
  },
  {
    tenant_id: "mecanicos-express",
    tenant_nombre: "Mecánicos Express",
    nombre: "Talleres Express Warnes",
    email: "taller_me@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59170099002",
  },
  {
    tenant_id: "mecanicos-express",
    tenant_nombre: "Mecánicos Express",
    nombre: "Mecánica Equipetrol",
    email: "taller2_me@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59170099003",
  },

  // ===== GRUAS URGENTES =====
  {
    tenant_id: "gruas-urgentes",
    tenant_nombre: "Grúas Urgentes",
    nombre: "Admin Grúas Urgentes",
    email: "admin_gu@admin.com",
    tipo: "admin",
    password: "admin",
    telefono: "+59170022334",
  },
  {
    tenant_id: "gruas-urgentes",
    tenant_nombre: "Grúas Urgentes",
    nombre: "Andrés Justiniano",
    email: "cliente_gu@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59178912345",
  },
  {
    tenant_id: "gruas-urgentes",
    tenant_nombre: "Grúas Urgentes",
    nombre: "Alejandra Roca",
    email: "cliente2_gu@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59178954321",
  },
  {
    tenant_id: "gruas-urgentes",
    tenant_nombre: "Grúas Urgentes",
    nombre: "Grúas Remolques del Oriente",
    email: "taller_gu@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133990011",
  },
  {
    tenant_id: "gruas-urgentes",
    tenant_nombre: "Grúas Urgentes",
    nombre: "Asistencia Grúas Urgentes",
    email: "taller2_gu@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133990022",
  },

  // ===== AUXILIO SUD =====
  {
    tenant_id: "auxilio-sud",
    tenant_nombre: "Auxilio Sud",
    nombre: "Admin Auxilio Sud",
    email: "admin_as@admin.com",
    tipo: "admin",
    password: "admin",
    telefono: "+59170055667",
  },
  {
    tenant_id: "auxilio-sud",
    tenant_nombre: "Auxilio Sud",
    nombre: "Fernando Torrico",
    email: "cliente_as@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59175099884",
  },
  {
    tenant_id: "auxilio-sud",
    tenant_nombre: "Auxilio Sud",
    nombre: "Claudia Méndez",
    email: "cliente2_as@cliente.com",
    tipo: "cliente",
    password: "cliente",
    telefono: "+59175099885",
  },
  {
    tenant_id: "auxilio-sud",
    tenant_nombre: "Auxilio Sud",
    nombre: "Taller Sur Plan Tres Mil",
    email: "taller_as@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133887711",
  },
  {
    tenant_id: "auxilio-sud",
    tenant_nombre: "Auxilio Sud",
    nombre: "Servicios Automotrices Santos Dumont",
    email: "taller2_as@taller.com",
    tipo: "taller",
    password: "taller",
    telefono: "+59133887722",
  },
];

/**
 * Group users by tenant
 */
export function getQuickLoginUsersByTenant(
  tenant_id: string
): QuickLoginUser[] {
  return QUICK_LOGIN_USERS.filter((u) => u.tenant_id === tenant_id);
}

/**
 * Get all unique tenants from quick login users
 */
export function getQuickLoginTenants(): {
  id: string;
  nombre: string;
}[] {
  const uniqueTenants = new Map<string, string>();
  QUICK_LOGIN_USERS.forEach((u) => {
    if (!uniqueTenants.has(u.tenant_id)) {
      uniqueTenants.set(u.tenant_id, u.tenant_nombre);
    }
  });
  return Array.from(uniqueTenants, ([id, nombre]) => ({ id, nombre }));
}
