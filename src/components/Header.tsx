"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { Tenant } from "@/services/mockData";
import { 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Activity, 
  User, 
  LogOut, 
  Settings, 
  X,
  Crown,
  Wrench,
  Bell,
  BellRing,
  Home,
  MapPin,
  History,
  BarChart2,
  AlertCircle,
  Navigation
} from "lucide-react";

interface HeaderProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  onTenantChange: (tenantId: string) => void;
  activeRole: "cliente" | "taller" | "admin";
  onRoleChange?: (role: "cliente" | "taller" | "admin") => void; // Optional developer helper
  isBackendConnected: boolean;
  offlineMode: boolean;
  onOfflineModeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenants,
  activeTenant,
  onTenantChange,
  activeRole,
  onRoleChange,
  isBackendConnected,
  offlineMode,
  onOfflineModeToggle
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "prompt" | "subscribed" | "out_of_sync">("prompt");
  const [activeIncId, setActiveIncId] = useState<string | null>(null);

  useEffect(() => {
    if (activeRole !== "cliente" || !activeTenant) return;
    
    const fetchActiveIncident = async () => {
      try {
        const { apiService } = await import("@/services/apiService");
        const incData = await apiService.getIncidentes(activeTenant.id);
        const activeInc = incData.find(i => 
          i.tenant_id === activeTenant.id && 
          i.estado !== "pagado" && 
          i.estado !== "cancelado"
        );
        if (activeInc) {
          setActiveIncId(activeInc.id.toString());
        } else {
          setActiveIncId(null);
        }
      } catch (e) {
        console.error("Error fetching active incident in Header", e);
      }
    };

    fetchActiveIncident();
    const interval = setInterval(fetchActiveIncident, 10000);
    return () => clearInterval(interval);
  }, [activeTenant, activeRole]);

  const checkPushStatus = async () => {
    if (!activeTenant) return;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }

    if (Notification.permission === "default") {
      setPushStatus("prompt");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      
      if (!sub) {
        setPushStatus("prompt");
        return;
      }

      // Check with backend
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setPushStatus("prompt");
        return;
      }

      const { apiService } = await import("@/services/apiService");
      const profile = await apiService.getPerfil(activeTenant.id);
      
      if (profile.has_push_subscription) {
        setPushStatus("subscribed");
      } else {
        setPushStatus("out_of_sync");
      }
    } catch (e) {
      console.error("Error checking push status:", e);
      setPushStatus("prompt");
    }
  };

  useEffect(() => {
    if (activeRole === "cliente" || activeRole === "taller") {
      checkPushStatus();
      
      // Periodically refresh push status to detect DB wipes
      const interval = setInterval(checkPushStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeRole, activeTenant]);

  const handleBellClick = async () => {
    if (pushStatus === "unsupported") {
      alert("Las notificaciones nativas push no están soportadas en este navegador o dispositivo.");
      return;
    }
    if (pushStatus === "denied") {
      alert("Has bloqueado los permisos de notificación. Restablécelos en los ajustes del candado de tu navegador para recibir alertas.");
      return;
    }

    try {
      const { notificationService } = await import("@/services/notificationService");
      const success = await notificationService.registerPushSubscription(activeTenant.id);
      
      if (success) {
        alert("¡Notificaciones Push sincronizadas y activadas en este dispositivo con éxito!");
      } else {
        alert("No se pudo registrar la suscripción. Asegúrate de otorgar los permisos cuando el navegador te lo solicite.");
      }
      // Re-evaluate status
      await checkPushStatus();
    } catch (e) {
      console.error("Error clicking bell:", e);
      alert("Error al intentar activar las notificaciones.");
    }
  };


  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("user_email") || "");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("active_tenant_id");
    localStorage.removeItem("active_role");
    localStorage.removeItem("user_email");
    window.location.href = "/login";
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "taller": return "Taller";
      default: return "Conductor";
    }
  };

  return (
    <>
      {/* Horizontal Top Header */}
      <header className="fixed top-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-md border-b border-[#d1fae5] z-[950] select-none shadow-sm flex items-center">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Brand Logo & Active Tenant */}
            <div 
              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
              onClick={() => {
                if (activeRole === "admin") {
                  router.push("/dashboard/admin");
                } else if (activeRole === "taller") {
                  router.push("/dashboard/taller");
                } else {
                  router.push("/dashboard/cliente");
                }
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#10b981]/25 flex items-center justify-center text-[#10b981] shrink-0 shadow-inner">
                 <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xs font-black text-[#0f172a] tracking-widest uppercase">
                    AUXILIO.AI
                  </span>
                  <span className="text-[7px] font-black tracking-widest px-1 py-0.5 rounded bg-[#f0fdf4] border border-[#10b981]/20 text-[#10b981] leading-none">
                    PWA
                  </span>
                </div>
                <span className="text-[9px] text-[#047857] font-bold uppercase tracking-wider truncate max-w-[140px] mt-0.5 leading-none">
                  {activeTenant?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Telemetry Status (Desktop Only) */}
            <div className="hidden lg:flex items-center bg-[#f0fdf4] border border-[#10b981]/25 px-2.5 py-1.5 rounded-xl shadow-inner gap-2">
              <div className="relative flex h-1.5 w-1.5">
                {offlineMode ? (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                ) : isBackendConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase text-[#065f46] tracking-wider">
                {offlineMode ? "Offline" : isBackendConnected ? "Online" : "Activo"}
              </span>
            </div>

            {/* Push Notifications Bell (Client/Workshop) */}
            {(activeRole === "cliente" || activeRole === "taller") && (
              <button
                onClick={handleBellClick}
                className={`w-9 h-9 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative select-none shrink-0 ${
                  pushStatus === "subscribed"
                    ? "bg-[#f0fdf4] border-[#10b981]/25 text-[#10b981] hover:bg-[#e6fbf0]"
                    : pushStatus === "out_of_sync"
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : pushStatus === "denied"
                    ? "bg-red-50 border border-red-100 text-red-500"
                    : "bg-white/50 border border-[#d1fae5] text-[#475569] hover:text-[#10b981] hover:bg-[#f0fdf4]"
                }`}
                title="Activar Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {(pushStatus === "prompt" || pushStatus === "out_of_sync") && (
                  <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </span>
                )}
              </button>
            )}

            {/* Console Settings Trigger */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/50 border border-[#d1fae5] text-[#475569] hover:text-[#10b981] hover:bg-[#f0fdf4] flex items-center justify-center shrink-0 transition-colors"
              title="Ajustes de Consola"
            >
              <Settings className="w-4 h-4 text-[#047857]" />
            </button>

            {/* Logout Button (Desktop Only) */}
            <button
              onClick={handleLogout}
              className="hidden md:flex w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100/50 hover:text-red-700 items-center justify-center shrink-0 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer to reserve layout space */}
      <div className="w-full h-16 shrink-0 block pointer-events-none" />

      {mounted && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Drawer Overlay Backdrop */}
              {isDrawerOpen && (
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity duration-300 animate-fadeIn"
                  onClick={() => setIsDrawerOpen(false)}
                />
              )}

              {/* Sliding Control Settings Drawer */}
              <div 
                className={`fixed inset-y-0 right-0 w-[290px] bg-zinc-950/98 backdrop-blur-xl border-l border-white/5 p-5 flex flex-col justify-between z-[10000] transition-transform duration-300 ease-out select-none shadow-2xl ${
                  isDrawerOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">
                        Ajustes de Consola
                      </h3>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                        Panel de Control
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Profile Info */}
                  <div className="bg-white/2 border border-white/5 p-3 rounded-2xl space-y-1">
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">Usuario Autenticado</span>
                    <p className="text-xs font-bold text-white truncate">{userEmail || "anonimo@auxilio.ai"}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 uppercase font-black tracking-wider mt-1.5 pt-1.5 border-t border-white/5">
                      {activeRole === "admin" ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : activeRole === "taller" ? <Wrench className="w-3.5 h-3.5 text-indigo-400" /> : <User className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>Rol: {getRoleLabel(activeRole)}</span>
                    </div>
                  </div>

                  {/* Configuration Forms & Settings */}
                  <div className="space-y-4">
                    {/* Connection / Synchronization Panel */}
                    <div className="space-y-2">
                      <span className="label-caps !text-[9px] text-zinc-500 font-bold">Estado de Sincronización</span>
                      
                      <div className="flex flex-col gap-2">
                        {/* Offline Toggle Switch */}
                        <button
                          onClick={onOfflineModeToggle}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wide cursor-pointer select-none ${
                            offlineMode
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-white/3 border-white/5 text-zinc-300 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                            {offlineMode ? "Modo Offline Activo" : "Conexión a Internet"}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${
                            offlineMode ? "bg-amber-400 text-zinc-950 animate-pulse" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {offlineMode ? "OFFLINE" : "ONLINE"}
                          </span>
                        </button>

                        {/* Telemetry Server Status */}
                        <div className="flex items-center justify-between bg-white/2 p-3 rounded-xl border border-white/5 text-xs text-zinc-400 uppercase font-bold">
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-zinc-500" />
                            Servidor Auxilio
                          </span>
                          {isBackendConnected && !offlineMode ? (
                            <span className="text-[8.5px] font-black text-emerald-400 tracking-wider flex items-center gap-1">
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-black text-amber-400 tracking-wider flex items-center gap-1">
                              SANDBOX
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tenant switcher */}
                    <div className="space-y-2">
                      <span className="label-caps !text-[9px] text-zinc-500 font-bold">Organización (Tenant)</span>
                      <div className="flex bg-indigo-500/5 rounded-xl border border-indigo-500/10 items-center justify-between p-3.5 select-none">
                        <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                          {activeTenant?.name}
                        </span>
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider select-none">
                          Fijo
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-500 italic mt-1 leading-normal select-none">
                        Asociado de forma segura a su cuenta. No es posible cambiar de organización.
                      </p>
                    </div>

                    {/* Sandbox Role Switcher */}
                    {onRoleChange && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="label-caps !text-[9px] text-zinc-500 font-bold">Cambiar Consola (Demo)</span>
                          <span className="text-[7px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-black tracking-widest leading-none">DEV</span>
                        </div>
                        <div className="flex bg-white/3 rounded-xl border border-white/5 overflow-hidden">
                          <select
                            value={activeRole}
                            onChange={(e) => {
                              onRoleChange(e.target.value as any);
                              setIsDrawerOpen(false);
                            }}
                            className="bg-zinc-950 w-full text-xs font-bold text-zinc-300 uppercase tracking-wide border-none focus:outline-none p-3 cursor-pointer"
                          >
                            <option value="cliente" className="bg-zinc-950 text-white">Consola Chofer</option>
                            <option value="taller" className="bg-zinc-950 text-white">Consola Taller</option>
                            <option value="admin" className="bg-zinc-950 text-white">Consola Administrador</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-3.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Cerrar Sesión</span>
                  </button>
                  
                  <div className="text-[8px] text-zinc-600 text-center font-bold uppercase tracking-widest select-none">
                    Auxilio.AI • v1.2 PWA Edition
                  </div>
                </div>
              </div>

              {/* Bottom Mobile Navigation Bar */}
              {activeRole === "cliente" && (
                <div className="fixed bottom-0 left-0 right-0 z-[9500] p-4 pointer-events-none md:hidden flex justify-center w-full">
                  <div className="max-w-md w-full bg-white/95 backdrop-blur-lg border border-[#e2e8f0] rounded-[24px] shadow-[0_10px_35px_rgba(0,0,0,0.1)] flex items-center justify-around py-3 px-2 pointer-events-auto">
                    {/* Home SOS */}
                    <button
                      onClick={() => router.push("/dashboard/cliente")}
                      className={`flex flex-col items-center gap-1.5 py-1 px-4 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                        pathname === "/dashboard/cliente"
                          ? "text-[#10b981] scale-105"
                          : "text-[#64748b] hover:text-[#10b981]"
                      }`}
                    >
                      <Home className="w-5 h-5" />
                      <span className="text-[10px] font-black tracking-tight">Inicio</span>
                    </button>

                    {/* Report Emergency */}
                    <button
                      onClick={() => router.push("/dashboard/cliente/reportar")}
                      className={`flex flex-col items-center gap-1.5 py-1 px-4 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                        pathname === "/dashboard/cliente/reportar"
                          ? "text-[#10b981] scale-105"
                          : "text-[#64748b] hover:text-[#10b981]"
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                      <span className="text-[10px] font-black tracking-tight">SOS</span>
                    </button>

                    {/* Active Emergency Tracking (if active) */}
                    {activeIncId && (
                      <button
                        onClick={() => {
                          sessionStorage.removeItem("skip_active_redirect");
                          router.push(`/dashboard/cliente/emergencia/${activeIncId}`);
                        }}
                        className={`flex flex-col items-center gap-1.5 py-1 px-4 rounded-xl transition-all cursor-pointer border-none bg-transparent relative animate-pulse ${
                          pathname?.includes(`/dashboard/cliente/emergencia`)
                            ? "text-amber-500 scale-105"
                            : "text-amber-600 font-bold"
                        }`}
                      >
                        <span className="absolute top-0 right-3 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <Navigation className="w-5 h-5 animate-pulse" />
                        <span className="text-[10px] font-black tracking-tight">Ruta</span>
                      </button>
                    )}

                    {/* Drawer Settings Trigger */}
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className={`flex flex-col items-center gap-1.5 py-1 px-4 rounded-xl transition-all cursor-pointer border-none bg-transparent ${
                        isDrawerOpen ? "text-[#10b981]" : "text-[#64748b]"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="text-[10px] font-black tracking-tight">Ajustes</span>
                    </button>
                  </div>
                </div>
              )}
            </>,
            document.body
          )
        : null}
    </>
  );
};

