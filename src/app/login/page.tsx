"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService, checkBackendHealth, fetchAndCacheTenants } from "@/services/apiService";
import { INITIAL_TENANTS } from "@/services/mockData";
import { Tenant } from "@/services/mockData";
import { QuickLoginDrawer } from "@/components/QuickLoginDrawer";
import type { QuickLoginUser } from "@/services/quickLoginUsers";
import { 
  ShieldCheck, 
  HardDrive, 
  Lock, 
  Mail, 
  ChevronRight, 
  Layers,
  Wrench,
  User,
  Crown,
  LockKeyhole,
  Radio,
  Zap
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [selectedTenantId, setSelectedTenantId] = useState("auxilio-norte");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendLive, setBackendLive] = useState(false);
  const [tenantAutoDetected, setTenantAutoDetected] = useState(false);
  const [detectedTenantName, setDetectedTenantName] = useState("");
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);

  // Check health and fetch dynamic tenants on load
  useEffect(() => {
    const initLoginPage = async () => {
      let activeTenants = INITIAL_TENANTS;
      try {
        const dynamicTenants = await fetchAndCacheTenants();
        if (dynamicTenants && dynamicTenants.length > 0) {
          activeTenants = dynamicTenants;
          setTenants(dynamicTenants);
        } else {
          const cached = apiService.getTenants();
          if (cached && cached.length > 0) {
            activeTenants = cached;
            setTenants(cached);
          }
        }
      } catch (e) {
        console.error("Failed to retrieve tenants on login load", e);
        const cached = apiService.getTenants();
        if (cached && cached.length > 0) {
          activeTenants = cached;
          setTenants(cached);
        }
      }

      const isUp = await checkBackendHealth();
      setBackendLive(isUp);

      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const subdomain = hostname.split(".")[0];
        const path = window.location.pathname;
        const pathParts = path.split("/");

        // Get matching tenant IDs
        const tenantIds = activeTenants.map((t) => t.id);

        // Check if query param exists: ?tenant=auxilio-norte
        const urlParams = new URLSearchParams(window.location.search);
        const queryTenant = urlParams.get("tenant");

        let resolvedTenantId = "";

        if (queryTenant && tenantIds.includes(queryTenant)) {
          resolvedTenantId = queryTenant;
        } else if (subdomain && tenantIds.includes(subdomain) && subdomain !== "www" && subdomain !== "localhost" && subdomain !== "127") {
          resolvedTenantId = subdomain;
        } else {
          // Check if any URL path matches a tenant ID
          const matchedPathPart = pathParts.find((part) => tenantIds.includes(part));
          if (matchedPathPart) {
            resolvedTenantId = matchedPathPart;
          }
        }

        if (resolvedTenantId) {
          setSelectedTenantId(resolvedTenantId);
          localStorage.setItem("active_tenant_id", resolvedTenantId);
          localStorage.setItem("tenant_id", resolvedTenantId);
          setTenantAutoDetected(true);
          const name = activeTenants.find((t) => t.id === resolvedTenantId)?.name || resolvedTenantId;
          setDetectedTenantName(name);
        } else if (activeTenants.length > 0) {
          setSelectedTenantId(activeTenants[0].id);
        }
      }
    };
    initLoginPage();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginWithCredentials(selectedTenantId, email, password);
  };

  // Prefill utility for quick testing
  const handleQuickPrefill = (tenantId: string, roleEmail: string, rolePass: string) => {
    setSelectedTenantId(tenantId);
    setEmail(roleEmail);
    setPassword(rolePass);
    setError("");
  };

  // Handle quick login user selection from drawer
  const handleQuickLoginSelect = async (user: QuickLoginUser) => {
    setSelectedTenantId(user.tenant_id);
    setEmail(user.email);
    setPassword(user.password);
    setError("");
    setQuickLoginOpen(false);
    
    // Auto-submit login after a brief delay to allow state updates
    setTimeout(() => {
      const formData = new FormData();
      formData.set("email", user.email);
      formData.set("password", user.password);
      handleLoginWithCredentials(user.tenant_id, user.email, user.password);
    }, 100);
  };

  // Extracted login logic for reuse
  const handleLoginWithCredentials = async (
    tenantId: string,
    emailVal: string,
    passwordVal: string
  ) => {
    setError("");
    setLoading(true);

    try {
      // 1. Fire login request to FastAPI backend
      const data = await apiService.login(tenantId, emailVal, passwordVal);
      
      // Decode JWT token to read tenant_id
      let decodedTenantId = tenantId;
      try {
        const tokenParts = data.access_token.split(".");
        if (tokenParts.length > 1) {
          const payloadDecoded = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payloadDecoded.tenant_id) {
            decodedTenantId = payloadDecoded.tenant_id;
          }
        }
      } catch (decodeErr) {
        console.error("Failed to decode tenant_id from token, falling back to selectedTenantId", decodeErr);
      }
      
      // 2. Persist session data to localStorage
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("active_tenant_id", decodedTenantId);
      localStorage.setItem("tenant_id", decodedTenantId);
      localStorage.setItem("active_role", data.user_type);
      localStorage.setItem("user_email", emailVal);

      // 3. Navigate cleanly to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Credenciales incorrectas para este inquilino.");
    } finally {
      setLoading(false);
    }
  };

  const getPrefillsForTenant = (tenantId: string) => {
    if (tenantId === "auxilio-norte") {
      return [
        { role: "Chofer", email: "cliente@cliente.com", pass: "cliente", icon: User },
        { role: "Taller", email: "taller@taller.com", pass: "taller", icon: Wrench },
        { role: "Admin", email: "admin@admin.com", pass: "admin", icon: Crown }
      ];
    } else if (tenantId === "mecanicos-express") {
      return [
        { role: "Chofer", email: "cliente_me@cliente.com", pass: "cliente", icon: User },
        { role: "Taller", email: "taller_me@taller.com", pass: "taller", icon: Wrench },
        { role: "Admin", email: "admin_me@admin.com", pass: "admin", icon: Crown }
      ];
    } else if (tenantId === "gruas-urgentes") {
      return [
        { role: "Chofer", email: "cliente_gu@cliente.com", pass: "cliente", icon: User },
        { role: "Taller", email: "taller_gu@taller.com", pass: "taller", icon: Wrench },
        { role: "Admin", email: "admin_gu@admin.com", pass: "admin", icon: Crown }
      ];
    } else if (tenantId === "auxilio-sud") {
      return [
        { role: "Chofer", email: "cliente_as@cliente.com", pass: "cliente", icon: User },
        { role: "Taller", email: "taller_as@taller.com", pass: "taller", icon: Wrench },
        { role: "Admin", email: "admin_as@admin.com", pass: "admin", icon: Crown }
      ];
    } else {
      const suffix = tenantId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4);
      return [
        { role: "Chofer", email: `cliente_${suffix}@cliente.com`, pass: "cliente", icon: User },
        { role: "Taller", email: `taller_${suffix}@taller.com`, pass: "taller", icon: Wrench },
        { role: "Admin", email: `admin_${suffix}@admin.com`, pass: "admin", icon: Crown }
      ];
    }
  };

  const currentPrefills = getPrefillsForTenant(selectedTenantId);

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] bg-grid-pattern flex items-center justify-center p-4 md:p-8 lg:p-12 selection:bg-emerald-600 selection:text-white relative overflow-x-hidden overflow-y-auto">
      
      {/* Background glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />

      {/* Center Unified Glassmorphic Card Layout */}
      <div className="max-w-md w-full bg-white rounded-[32px] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* LOGIN FORM PANEL */}
        <div className="w-full p-8 lg:p-10 flex flex-col justify-center bg-white space-y-6">
          
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm">
                <LockKeyhole className="w-5 h-5" />
              </div>
              
              {/* Connection Status Badge */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-[var(--border)] text-[9px] font-extrabold shrink-0 shadow-sm">
                {backendLive ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      Conectado <ShieldCheck className="w-3 h-3" />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-amber-600 uppercase tracking-wider flex items-center gap-1">
                      Sandbox <HardDrive className="w-3 h-3" />
                    </span>
                  </>
                )}
              </div>
            </div>

            <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-tight">Acceder a Consola</h3>
            <p className="text-xs text-[var(--text-muted)] leading-none">Introduzca sus credenciales autorizadas para continuar</p>

            {/* Dynamic URL Auto-detect Badge */}
            {tenantAutoDetected && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase text-emerald-700 tracking-wider animate-fadeIn select-none shadow-sm">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Inquilino Auto-detectado: {detectedTenantName}</span>
              </div>
            )}
          </div>

          {/* Dynamic Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200/50 text-red-700 rounded-2xl text-xs font-bold text-center animate-fadeIn shadow-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Tenant Select */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <Layers className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Inquilino (Tenant)
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setTenantAutoDetected(false); // Manual override
                }}
                className="glass-input w-full bg-white font-bold uppercase tracking-wider cursor-pointer border border-[var(--border)] text-xs"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-[var(--text)] font-bold uppercase">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full text-xs"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Contraseña
              </label>
              <input
                type="password"
                placeholder="Contraseña registrada"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full text-xs"
                required
              />
            </div>

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 mt-4 text-xs shadow-lg shadow-emerald-600/25 border-none font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
            >
              {loading ? (
                <span>Validando Acceso...</span>
              ) : (
                <>
                  <span>Ingresar a Consola</span>
                  <ChevronRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Link to Registration Page */}
          <div className="text-center pt-1 select-none">
            <span className="text-xs text-[var(--text-muted)]">¿No tienes una cuenta? </span>
            <button
              type="button"
              onClick={() => router.push("/registro")}
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:underline"
            >
              Registrarse aquí
            </button>
          </div>

          {/* TEST CREDENTIALS PRE-FILL PANEL WITH QUICK LOGIN BUTTON */}
          <div className="glass-panel p-5 border border-[var(--border)] bg-white shadow-lg space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text)]">
                Acceso Rápido de Prueba
              </span>
              <button
                type="button"
                onClick={() => setQuickLoginOpen(true)}
                disabled={loading}
                className="px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 rounded-lg text-[8px] font-black text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                <Zap className="w-3 h-3" />
                Ver Todos
              </button>
            </div>
            <p className="text-[9.5px] text-[var(--text-muted)] text-center leading-normal">
              Autocompletar credenciales para el inquilino seleccionado o ver todos los usuarios
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              {currentPrefills.map((prefill) => {
                const Icon = prefill.icon;
                return (
                  <button
                    key={prefill.role}
                    onClick={() => handleQuickPrefill(selectedTenantId, prefill.email, prefill.pass)}
                    className="px-2 py-1.5 rounded-xl bg-white border border-[var(--border)] text-[9.5px] font-bold text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{prefill.role}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Quick Login Drawer */}
      <QuickLoginDrawer
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        onSelectUser={handleQuickLoginSelect}
        isLoading={loading}
      />
    </div>
  );
}