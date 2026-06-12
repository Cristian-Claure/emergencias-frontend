"use client";

import React, { useState } from "react";
import { ChevronRight, X, Zap, Info } from "lucide-react";
import { QUICK_LOGIN_USERS, getQuickLoginTenants, getQuickLoginUsersByTenant } from "@/services/quickLoginUsers";
import type { QuickLoginUser } from "@/services/quickLoginUsers";

interface QuickLoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: QuickLoginUser) => void;
  isLoading?: boolean;
}

/**
 * QuickLoginDrawer - Deslizante con acceso rápido
 * Rediseñado con Glassmorphism luminoso y acentos verde/esmeralda
 */
export function QuickLoginDrawer({
  isOpen,
  onClose,
  onSelectUser,
  isLoading = false,
}: QuickLoginDrawerProps) {
  const [expandedTenant, setExpandedTenant] = useState<string | null>(
    "auxilio-norte"
  );
  const tenants = getQuickLoginTenants();

  // Estilos brillantes y elegantes para los roles
  const getRoleStyle = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/80 hover:shadow-[0_4px_20px_rgba(16,185,129,0.12)]";
      case "cliente":
        return "border-teal-200 hover:border-teal-400 hover:bg-teal-50/80 hover:shadow-[0_4px_20px_rgba(20,184,166,0.12)]";
      case "taller":
        return "border-green-200 hover:border-green-400 hover:bg-green-50/80 hover:shadow-[0_4px_20px_rgba(34,197,94,0.12)]";
      default:
        return "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
    }
  };

  const getRoleIcon = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return "👑";
      case "cliente":
        return "🚗";
      case "taller":
        return "🔧";
      default:
        return "👤";
    }
  };

  const getRoleBadgeStyle = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return "text-emerald-700 bg-emerald-100 border border-emerald-200";
      case "cliente":
        return "text-teal-700 bg-teal-100 border border-teal-200";
      case "taller":
        return "text-green-700 bg-green-100 border border-green-200";
      default:
        return "text-slate-700 bg-slate-100 border border-slate-200";
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* Drawer - slides from left with light glassmorphism */}
      <div
        className={`fixed left-0 top-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-2xl border-r border-emerald-100 shadow-[20px_0_40px_rgba(16,185,129,0.08)] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-50 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-emerald-100 px-6 py-5 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-800">Acceso Rápido</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Explanation Notice */}
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-xl flex items-start gap-3 shadow-inner">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <strong className="text-emerald-800 block mb-1 text-sm">Registro de Bug Fix: Filtro de Especialidades</strong>
              <p>
                <strong>El Problema:</strong> Cuando mandabas solo texto, la IA a veces lo clasificaba como "incierto" (que siempre pasaba el filtro de talleres). Pero al subir una foto, la IA visual (Gemini Vision) era exacta y le asignaba, por ejemplo, "choque".
              </p>
              <p>
                <strong>El Bloqueo:</strong> Como el taller actual no tenía "choque" en su lista estricta de especialidades en la base de datos, el backend ocultaba la alerta y veías "0 Alertas".
              </p>
              <p>
                <strong>La Solución:</strong> Se eliminó esa restricción estricta en el backend (<code>talleres.py</code>). Al ser un mercado abierto de cotizaciones, ahora el sistema envía todas las emergencias de la zona a todos los talleres para que cada mecánico decida si quiere cotizar.
              </p>
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="p-6 space-y-4">
          {tenants.map((tenant) => {
            const users = getQuickLoginUsersByTenant(tenant.id);
            const isExpanded = expandedTenant === tenant.id;

            return (
              <div key={tenant.id} className="rounded-2xl overflow-hidden border border-emerald-100 bg-white shadow-sm shadow-emerald-50/50">
                {/* Tenant Header */}
                <button
                  onClick={() => setExpandedTenant(isExpanded ? null : tenant.id)}
                  disabled={isLoading}
                  className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-200">
                      {tenant.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 tracking-wide text-sm">
                        {tenant.nombre}
                      </p>
                      <p className="text-[11px] text-emerald-600/80 font-semibold uppercase tracking-wider">
                        {users.length} Cuentas disponibles
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-emerald-400 transition-transform duration-300 ${
                      isExpanded ? "rotate-90 text-emerald-600" : ""
                    }`}
                  />
                </button>

                {/* Users List */}
                <div 
                  className={`transition-all duration-300 ease-in-out origin-top overflow-hidden bg-slate-50/50 ${
                    isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-3 space-y-2">
                    {users.map((user, idx) => (
                      <button
                        key={`${tenant.id}-${idx}`}
                        onClick={() => onSelectUser(user)}
                        disabled={isLoading}
                        className={`w-full p-3 text-left rounded-xl border transition-all duration-300 ${getRoleStyle(
                          user.tipo
                        )} group relative overflow-hidden bg-white shadow-sm`}
                      >
                        {/* Interactive hover background effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/30 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        
                        <div className="relative flex items-center justify-between gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg border border-slate-100 shrink-0 group-hover:scale-110 transition-transform duration-300">
                            {getRoleIcon(user.tipo)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700 transition-colors">
                              {user.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mb-1">
                              {user.email}
                            </p>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getRoleBadgeStyle(
                                user.tipo
                              )}`}
                            >
                              {user.tipo === "admin"
                                ? "Administrador"
                                : user.tipo === "cliente"
                                ? "Cliente"
                                : "Taller"}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="sticky bottom-0 border-t border-emerald-100 px-6 py-5 bg-white/90 backdrop-blur-md text-xs text-center space-y-1.5">
          <p className="text-slate-500 font-medium">
            Claves por defecto en base al rol:
          </p>
          <div className="flex items-center justify-center gap-3 text-emerald-700 font-mono text-[10px] uppercase tracking-widest font-bold">
            <span className="px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">admin</span>
            <span className="text-emerald-300">•</span>
            <span className="px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">cliente</span>
            <span className="text-emerald-300">•</span>
            <span className="px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">taller</span>
          </div>
        </div>
      </div>
    </>
  );
}
