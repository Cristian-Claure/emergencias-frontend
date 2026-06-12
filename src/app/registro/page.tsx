"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService, checkBackendHealth, fetchAndCacheTenants } from "@/services/apiService";
import { INITIAL_TENANTS, Tenant } from "@/services/mockData";
import { 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  Lock, 
  Mail, 
  ChevronRight, 
  Layers,
  Wrench,
  User,
  Phone,
  MapPin,
  Compass
} from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [selectedTenantId, setSelectedTenantId] = useState("auxilio-norte");
  const [role, setRole] = useState<"cliente" | "taller">("cliente");
  
  // Base fields
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  
  // Workshop specific fields
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState(-17.7833);
  const [longitud, setLongitud] = useState(-63.1812);
  const [especialidades, setEspecialidades] = useState<string>("Mecánica General");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [backendLive, setBackendLive] = useState(false);

  useEffect(() => {
    const initPage = async () => {
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
        console.error("Failed to retrieve tenants on registration load", e);
        const cached = apiService.getTenants();
        if (cached && cached.length > 0) {
          activeTenants = cached;
          setTenants(cached);
        }
      }

      const isUp = await checkBackendHealth();
      setBackendLive(isUp);

      if (activeTenants.length > 0) {
        setSelectedTenantId(activeTenants[0].id);
      }
    };
    initPage();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (role === "cliente") {
        await apiService.registerCliente(selectedTenantId, {
          nombre,
          email,
          telefono,
          password
        });
      } else {
        const specList = especialidades.split(",").map(s => s.trim()).filter(Boolean);
        await apiService.registerTaller(selectedTenantId, {
          nombre,
          email,
          telefono,
          password,
          direccion,
          latitud: Number(latitud),
          longitud: Number(longitud),
          especialidades: specList.length > 0 ? specList : ["Mecánica General"]
        });
      }

      setSuccess("¡Registro exitoso! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        router.push(`/login?tenant=${selectedTenantId}`);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al completar el registro. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] bg-grid-pattern flex items-center justify-center p-4 relative overflow-x-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-md w-full bg-white rounded-[32px] border border-slate-100 shadow-2xl p-8 text-center space-y-6 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-emerald-50/60 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¡Registro Completado!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tu cuenta ha sido creada exitosamente para el inquilino <strong className="text-slate-950 font-black">{tenants.find(t => t.id === selectedTenantId)?.name || selectedTenantId}</strong>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-emerald-600 uppercase tracking-wider animate-pulse pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Redirigiendo al inicio de sesión...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] bg-grid-pattern flex items-center justify-center p-4 md:p-8 lg:p-12 selection:bg-emerald-600 selection:text-white relative overflow-x-hidden overflow-y-auto">
      
      {/* Background glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />

      {/* Center Unified Card Layout (Single Panel for clean registration layout) */}
      <div className="max-w-xl w-full bg-white rounded-[32px] border border-[var(--border)] shadow-2xl overflow-hidden animate-scaleUp p-6 sm:p-10 space-y-6">
        
        {/* Logo and Status */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Activity className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <span className="font-black tracking-tight text-slate-900 uppercase text-xs block">Auxilio.AI</span>
              <span className="block text-[7.5px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Crear Nueva Cuenta</span>
            </div>
          </div>
          
          {/* Connection status */}
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

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Registro de Usuario</h3>
          <p className="text-xs text-[var(--text-muted)] leading-none">Complete los datos solicitados para registrarse en el inquilino</p>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200/50 text-red-700 rounded-2xl text-xs font-bold text-center animate-fadeIn shadow-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/50 text-emerald-700 rounded-2xl text-xs font-bold text-center animate-fadeIn shadow-sm">
            {success}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tenant Select */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <Layers className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Inquilino (Tenant)
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="glass-input w-full bg-white font-bold uppercase tracking-wider cursor-pointer border border-[var(--border)] text-xs"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-[var(--text)] font-bold uppercase">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Select */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Tipo de Cuenta
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "cliente" | "taller")}
                className="glass-input w-full bg-white font-bold uppercase tracking-wider cursor-pointer border border-[var(--border)] text-xs"
              >
                <option value="cliente">Conductor / Cliente</option>
                <option value="taller">Taller Mecánico</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Nombre Completo
              </label>
              <input
                type="text"
                placeholder="Nombre y Apellidos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="glass-input w-full text-xs"
                required
                minLength={2}
              />
            </div>

            {/* Telephone */}
            <div className="space-y-1.5">
              <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Teléfono
              </label>
              <input
                type="tel"
                placeholder="Ej. +591 70000000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="glass-input w-full text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full text-xs"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Workshop-specific fields */}
          {role === "taller" && (
            <div className="border-t border-slate-100 pt-4 space-y-4 animate-fadeIn">
              <span className="text-[9px] font-black uppercase tracking-widest block text-slate-400">
                Información del Taller Mecánico
              </span>
              
              {/* Address */}
              <div className="space-y-1.5">
                <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Dirección
                </label>
                <input
                  type="text"
                  placeholder="Dirección o zona del taller"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="glass-input w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lat/Lng */}
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                    <Compass className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Latitud
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitud}
                    onChange={(e) => setLatitud(Number(e.target.value))}
                    className="glass-input w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                    <Compass className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Longitud
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitud}
                    onChange={(e) => setLongitud(Number(e.target.value))}
                    className="glass-input w-full text-xs"
                    required
                  />
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-1.5">
                <label className="label-caps !text-[10px] flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                  <Wrench className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Especialidades (Separadas por comas)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mecánica General, Llantas, Batería, Remolque"
                  value={especialidades}
                  onChange={(e) => setEspecialidades(e.target.value)}
                  className="glass-input w-full text-xs"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 mt-6 text-xs shadow-lg shadow-emerald-600/25 border-none font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
          >
            {loading ? (
              <span>Registrando Cuenta...</span>
            ) : (
              <>
                <span>Registrarse</span>
                <ChevronRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        </form>

        {/* Back to Login link */}
        <div className="text-center pt-2 select-none border-t border-slate-100">
          <span className="text-xs text-[var(--text-muted)]">¿Ya tienes una cuenta? </span>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:underline"
          >
            Iniciar Sesión
          </button>
        </div>

      </div>
    </div>
  );
}
