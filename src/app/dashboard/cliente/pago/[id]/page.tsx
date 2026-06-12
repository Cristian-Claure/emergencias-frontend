"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/Header";
import { apiService, checkBackendHealth } from "@/services/apiService";
import { Tenant, Incidente } from "@/services/mockData";
import {
  CreditCard,
  Lock,
  DollarSign,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  WifiOff,
  Info,
  QrCode,
  Coins,
  AlertCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getApiBaseUrl = (): string => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://backend-si2-taller-385056433848.us-central1.run.app";
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://backend-si2-taller-385056433848.us-central1.run.app";
};

const buildPaymentHeaders = (tenantId: string): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
  };
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export default function ProcesarPago({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();
  const incidenteId = routeParams.id as string;

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [incidente, setIncidente] = useState<Incidente | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<"tarjeta" | "qr" | "efectivo">("tarjeta");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState<string>("");
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string>("");

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      const tenantList = apiService.getTenants();
      setTenants(tenantList);

      const savedTenantId = localStorage.getItem("active_tenant_id");
      const matchedTenant =
        tenantList.find((t) => t.id === savedTenantId) || tenantList[0];
      setActiveTenant(matchedTenant);

      setIsBackendConnected(await checkBackendHealth());

      if (typeof window !== "undefined") {
        setIsOnline(navigator.onLine);
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
      }

      setLoading(false);
    };
    initApp();
  }, []);

  const handleConfirmSuccess = useCallback(async () => {
    if (activeTenant) {
      try {
        const fresh = await apiService.getIncidente(activeTenant.id, incidenteId);
        setIncidente(fresh);
      } catch {
        // Mantener caché local como respaldo visual
        const localIncidents = JSON.parse(
          localStorage.getItem("auxilio_auto_incidents") || "[]"
        );
        const idx = localIncidents.findIndex(
          (i: { id: string | number }) =>
            i.id.toString() === incidenteId.toString()
        );
        if (idx !== -1) {
          localIncidents[idx].estado = "pagado";
          localStorage.setItem(
            "auxilio_auto_incidents",
            JSON.stringify(localIncidents)
          );
        }
      }
    }

    setPaymentSuccess(true);
    try {
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#1b4d2c", "#2e7d32", "#a3e635", "#ffffff"]
      });
    } catch (e) {
      console.error("Confetti failed", e);
    }
    setTimeout(() => {
      setPaymentSuccess(false);
      router.push(`/dashboard/cliente/emergencia/${incidenteId}`);
    }, 2000);
  }, [activeTenant, incidenteId, router]);

  const confirmPaymentOnBackend = useCallback(
    async (intentId: string) => {
      if (!activeTenant) return false;
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIntentError("Debe iniciar sesión para confirmar el pago.");
        return false;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/v1/pagos/mock-confirmar`, {
        method: "POST",
        headers: buildPaymentHeaders(activeTenant.id),
        body: JSON.stringify({
          payment_intent_id: intentId,
          success: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
        const detail =
          typeof err.detail === "string"
            ? err.detail
            : "No se pudo confirmar el pago en el servidor.";
        setIntentError(detail);
        return false;
      }
      return true;
    },
    [activeTenant]
  );

  const fetchAndCreateIntent = useCallback(
    async (method: "tarjeta" | "qr" | "efectivo") => {
      if (!activeTenant) return;

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("success") === "true" && params.get("session_id")) {
          return;
        }
      }

      setIntentLoading(true);
      setIntentError("");
      setPaymentIntentId("");
      setQrUrl("");
      setStripeCheckoutUrl("");
      setStripeRedirecting(false);

      try {
        const incList = await apiService.getIncidentes(activeTenant.id);
        const matchedInc = incList.find(
          (i) => i.id.toString() === incidenteId.toString()
        );

        if (!matchedInc) {
          router.push("/dashboard/cliente");
          return;
        }
        setIncidente(matchedInc);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          setIntentError("Inicie sesión para procesar el pago.");
          return;
        }

        const res = await fetch(`${getApiBaseUrl()}/api/v1/pagos/crear-intent`, {
          method: "POST",
          headers: buildPaymentHeaders(activeTenant.id),
          body: JSON.stringify({
            incidente_id: matchedInc.id.toString(),
            monto_total: parseFloat((matchedInc.costo_final || 150).toString()),
            metodo: method,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail =
            typeof data.detail === "string"
              ? data.detail
              : "No se pudo registrar el intento de pago.";
          setIntentError(detail);
          return;
        }

        setPaymentIntentId(data.paymentIntentId || "");
        setQrUrl(data.qr_data || "");

        if (method === "tarjeta" && data.stripe_checkout_url) {
          setStripeCheckoutUrl(data.stripe_checkout_url);
        }
      } catch (e) {
        console.error("Failed to register checkout payment intent", e);
        setIntentError(
          "Error de conexión con el servidor. Verifique su red e intente de nuevo."
        );
      } finally {
        setIntentLoading(false);
      }
    },
    [activeTenant, incidenteId, router]
  );

  useEffect(() => {
    if (activeTenant) {
      fetchAndCreateIntent(selectedMethod);
    }
  }, [activeTenant, selectedMethod, fetchAndCreateIntent]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeTenant) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get("success") === "true";
    const sessionId = urlParams.get("session_id");

    if (!isSuccess || !sessionId) return;

    const confirmStripePayment = async () => {
      setSubmittingPayment(true);
      setIntentError("");
      const ok = await confirmPaymentOnBackend(sessionId);
      if (ok) {
        window.history.replaceState(
          {},
          "",
          `/dashboard/cliente/pago/${incidenteId}`
        );
        await handleConfirmSuccess();
      }
      setSubmittingPayment(false);
    };

    confirmStripePayment();
  }, [incidenteId, activeTenant, confirmPaymentOnBackend, handleConfirmSuccess]);

  const handleTenantChange = (tenantId: string) => {
    const selected = tenants.find((t) => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      setIncidente(null);
      localStorage.setItem("active_tenant_id", tenantId);
      router.push("/dashboard/cliente");
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

  const handleConfirmPayment = async () => {
    if (!activeTenant || !incidente) return;

    if (!paymentIntentId) {
      setIntentError(
        "No hay un registro de pago activo. Espere a que cargue o recargue la página."
      );
      return;
    }

    if (paymentIntentId.includes("_local_")) {
      setIntentError(
        "ID de pago inválido. Recargue la página para registrar el pago en el servidor."
      );
      return;
    }

    setSubmittingPayment(true);
    setIntentError("");
    try {
      const ok = await confirmPaymentOnBackend(paymentIntentId);
      if (ok) {
        await handleConfirmSuccess();
      }
    } catch (err) {
      console.error(err);
      setIntentError("Error al procesar la confirmación del pago.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !activeTenant || !incidente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#ffffff] text-[#0f172a] font-sans">
        <RefreshCw className="w-8 h-8 text-[#10b981] animate-spin mb-4" />
        <p className="text-xs text-[#065f46] font-bold uppercase tracking-wider">
          Cargando pasarela de pago...
        </p>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["cliente"]}>
      <div className="min-h-screen w-full bg-[#ffffff] text-[#0f172a] font-sans antialiased overflow-y-auto flex flex-col justify-between relative">
        {(!isOnline || offlineMode) && (
          <div className="w-full bg-[#f0fdf4] text-[#065f46] border-b border-emerald-500/30 px-4 py-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse z-50 sticky top-0 shadow-lg">
            <WifiOff className="w-4 h-4 shrink-0 text-[#10b981]" />
            <span>Modo Demo/Offline — Los pagos requieren conexión al servidor</span>
          </div>
        )}

        <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-20">
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

        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 z-10 flex flex-col justify-center gap-6 animate-fadeIn">
          <div className="flex items-center justify-start">
            <button
              onClick={() =>
                router.push(`/dashboard/cliente/emergencia/${incidenteId}`)
              }
              className="text-xs text-[#065f46] hover:text-[#10b981] flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-none p-0 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Volver a la emergencia</span>
            </button>
          </div>

          <div className="text-center py-2 space-y-1">
            <span className="text-[10px] text-[#059669] uppercase tracking-widest font-black block">
              Monto a Liquidar
            </span>
            <h1 className="text-5xl font-black text-[#0f172a] font-mono tracking-tight">
              Bs. {(incidente.costo_final || 150).toFixed(2)}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-[#065f46]">
              <span className="font-bold text-[#0f172a] uppercase">
                {incidente.taller_nombre || "Auxilio Técnico"}
              </span>
              <span className="text-[#d1fae5]">•</span>
              <span className="text-[#10b981] font-mono font-bold">
                #{incidente.id.toString().substring(0, 8)}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 border border-[var(--border)] shadow-xl rounded-3xl relative overflow-hidden space-y-6">
            <div className="grid grid-cols-3 gap-2 bg-[#f0fdf4] p-1 rounded-2xl border border-[var(--border)] select-none">
              {(
                [
                  { id: "tarjeta" as const, icon: CreditCard, label: "Tarjeta" },
                  { id: "qr" as const, icon: QrCode, label: "Código QR" },
                  { id: "efectivo" as const, icon: Coins, label: "Efectivo" },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedMethod(id)}
                  disabled={intentLoading || stripeRedirecting}
                  style={selectedMethod === id ? { backgroundColor: '#10b981', color: '#ffffff' } : { color: '#065f46' }}
                  className={`py-3 px-2 rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer flex flex-col items-center gap-1.5 disabled:opacity-50 ${
                    selectedMethod === id
                      ? "shadow-md shadow-emerald-500/20"
                      : "hover:bg-emerald-500/10"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {intentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{intentError}</span>
              </div>
            )}

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-4 flex flex-col items-center animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center border border-[var(--border)]">
                  <CheckCircle className="w-8 h-8 text-[#10b981] animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-black text-[#0f172a] uppercase text-xs tracking-wider">
                    ¡Pago procesado exitosamente!
                  </h4>
                  <p className="text-[10px] text-[#065f46] leading-normal max-w-[240px] mx-auto">
                    Redireccionando a tu pantalla de auxilio...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {selectedMethod === "tarjeta" && (
                  <div className="space-y-5 animate-fadeIn text-center py-6">
                    <div className="border-b border-[var(--border)] pb-2.5 flex items-center justify-center gap-1.5 text-[#065f46]">
                      <Lock className="w-3.5 h-3.5 text-[#10b981]" />
                      <span className="text-[9px] uppercase tracking-widest font-black">
                        Stripe Checkout (modo prueba)
                      </span>
                    </div>
                    {intentLoading || stripeRedirecting ? (
                      <div className="space-y-3 py-4">
                        <RefreshCw className="w-8 h-8 text-[#10b981] animate-spin mx-auto" />
                        <p className="text-[10px] text-[#065f46]">
                          Redirigiendo a la pasarela segura de Stripe...
                        </p>
                        <p className="text-[9px] text-[#047857]">
                          Use tarjeta de prueba 4242 4242 4242 4242 en el sandbox.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[10px] text-[#065f46]">
                          Para pagar de forma segura con tarjeta de crédito o débito, presione el botón de abajo para ir a Stripe Checkout.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (stripeCheckoutUrl) {
                              setStripeRedirecting(true);
                              window.location.href = stripeCheckoutUrl;
                            } else {
                              setIntentError("El enlace de Stripe no está listo. Por favor, intente de nuevo.");
                            }
                          }}
                          disabled={!stripeCheckoutUrl}
                          className="btn-primary w-full py-4 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border-none shadow-lg cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-4 h-4 text-white" />
                          <span className="text-white">Proceder al Pago con Tarjeta</span>
                        </button>
                        <p className="text-[9px] text-[#047857]">
                          Tarjeta de prueba para sandbox: <span className="font-mono text-[#065f46] font-bold">4242 4242 4242 4242</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedMethod === "qr" && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="border-b border-[var(--border)] pb-2.5 flex items-center justify-between">
                      <span className="text-[9px] text-[#10b981] uppercase tracking-widest font-black flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        Pago mediante código QR
                      </span>
                    </div>

                    {intentLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="w-6 h-6 text-[#10b981] animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center space-y-4">
                          <div 
                            onClick={handleConfirmPayment}
                            className="p-3 bg-white border border-[var(--border)] rounded-2xl shadow-inner cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                            title="Haga clic para simular el pago"
                          >
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=000000&bgcolor=ffffff&data=${encodeURIComponent(qrUrl || `qr:${incidente.id}`)}`}
                              alt="Código QR de Pago"
                              className="w-[180px] h-[180px] rounded-lg block"
                            />
                          </div>
                          <p className="text-[10px] text-[#059669] font-black uppercase tracking-wide text-center animate-pulse">
                            Haz clic en el QR para pagar de forma instantánea
                          </p>
                          <p className="text-[8.5px] text-[#047857] text-center">
                            ID Pago:{" "}
                            <span className="font-mono text-[#0f172a] font-bold">
                              {paymentIntentId || "—"}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleConfirmPayment}
                          disabled={
                            submittingPayment || intentLoading || !paymentIntentId
                          }
                          className="btn-primary w-full py-4 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border-none shadow-lg cursor-pointer disabled:opacity-50"
                        >
                          {submittingPayment ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verificando transferencia...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-white" />
                              <span className="text-white">Ya escaneé, confirmar pago</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {selectedMethod === "efectivo" && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="border-b border-[var(--border)] pb-2.5 flex items-center gap-1.5 text-[#065f46]">
                      <Coins className="w-3.5 h-3.5 text-[#10b981]" />
                      <span className="text-[9px] uppercase tracking-widest font-black">
                        Cobro en efectivo
                      </span>
                    </div>

                    <div className="p-4 bg-[#f0fdf4] border border-[var(--border)] rounded-2xl text-center space-y-3">
                      <div className="mx-auto w-10 h-10 rounded-full bg-[#ffffff] border border-[var(--border)] flex items-center justify-center text-[#10b981]">
                        <Coins className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] text-[#065f46] leading-normal max-w-xs mx-auto">
                        Abone{" "}
                        <span className="font-mono font-bold text-[#059669]">
                          Bs. {incidente.costo_final}
                        </span>{" "}
                        en efectivo al técnico de{" "}
                        <span className="font-bold text-[#0f172a]">
                          {incidente.taller_nombre}
                        </span>
                        . Luego confirme aquí para registrar el pago en el sistema.
                      </p>
                      {!intentLoading && paymentIntentId && (
                        <p className="text-[8px] text-[#047857] font-mono">
                          Ref: {paymentIntentId}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={
                        submittingPayment || intentLoading || !paymentIntentId
                      }
                      className="btn-primary w-full py-4 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border-none shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      {submittingPayment ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Registrando pago en efectivo...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-white" />
                          <span className="text-white">Confirmar pago en efectivo</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#047857]">
                      <Info className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>El estado se guarda en el servidor al confirmar</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="w-full py-6 text-center text-[10px] text-[#047857] z-10 border-t border-[#d1fae5] bg-[#ffffff]/80">
          <p>© 2026 Auxilio.AI • Pagos con Stripe Checkout (test) y registro backend</p>
        </footer>
      </div>
    </RoleGuard>
  );
}
