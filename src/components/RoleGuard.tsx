"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, ArrowLeft, RefreshCw } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("cliente" | "taller" | "admin")[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("active_role") as any;

    if (!token) {
      router.push("/login");
      return;
    }

    setUserRole(role || "cliente");

    if (allowedRoles.includes(role)) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
  }, [router, allowedRoles]);

  if (authorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white font-sans">
        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mb-4" />
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Verificando Autorización...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 bg-grid-pattern flex items-center justify-center p-6 text-white font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
        {/* Decorative background glow */}
        <div className="absolute w-[400px] h-[400px] bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass-panel border border-red-500/10 p-8 text-center space-y-6 shadow-2xl relative z-10 animate-fadeIn">
          {/* Animated Lock Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 animate-bounce">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
              <ShieldAlert className="w-5.5 h-5.5 text-red-500" />
              Acceso Denegado
            </h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              Tu rol actual: <span className="text-red-400 font-mono">{userRole}</span>
            </p>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            No tienes los privilegios necesarios para visualizar esta sección del ecosistema telemétrico. La ruta solicitada está reservada exclusivamente para roles autorizados.
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                if (userRole === "admin") {
                  router.push("/dashboard/admin");
                } else if (userRole === "taller") {
                  router.push("/dashboard/taller");
                } else {
                  router.push("/dashboard/cliente");
                }
              }}
              className="btn-primary w-full py-4.5 !bg-red-500/10 hover:!bg-red-500/20 !text-red-400 border border-red-500/20 font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mi Consola</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
