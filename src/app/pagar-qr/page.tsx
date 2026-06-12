"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ShieldCheck, Lock, Landmark } from "lucide-react";

function PagarQrContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "REF-UNKNOWN";
  const monto = searchParams.get("monto") || "0.00";
  const taller = searchParams.get("taller") || "Taller Autorizado";
  const intentId = searchParams.get("intent_id");
  const tenantId = searchParams.get("tenant_id") || "auxilio-norte";

  React.useEffect(() => {
    if (!intentId) return;

    const confirmPayment = async () => {
      try {
        const baseUrl = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
          ? "https://backend-si2-taller-385056433848.us-central1.run.app"
          : (process.env.NEXT_PUBLIC_API_URL || "https://backend-si2-taller-385056433848.us-central1.run.app");

        await fetch(`${baseUrl}/api/v1/pagos/mock-confirmar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenantId,
          },
          body: JSON.stringify({
            payment_intent_id: intentId,
            success: true,
          }),
        });
      } catch (err) {
        console.error("Failed to automatically confirm payment on QR scan:", err);
      }
    };

    confirmPayment();
  }, [intentId, tenantId]);

  return (
    <div className="w-full max-w-sm glass-panel p-8 border border-[var(--border)] rounded-[24px] shadow-2xl relative overflow-hidden space-y-6 text-center animate-fadeIn bg-white">
      {/* Decorative lighting blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Success Badge */}
      <div className="flex justify-center relative">
        <div className="absolute inset-0 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl mx-auto" />
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-650 relative z-10">
          <CheckCircle className="w-9 h-9 animate-bounce" />
        </div>
      </div>

      {/* Header text */}
      <div className="space-y-1">
        <span className="text-[10px] text-emerald-650 uppercase tracking-widest font-black block">Pago Procesado</span>
        <h2 className="text-xl font-black text-[var(--text)] uppercase tracking-tight">¡Transferencia Exitosa!</h2>
        <p className="text-[10px] text-[var(--text-muted)]">Su pago ha sido validado correctamente.</p>
      </div>

      {/* Financial detail recap */}
      <div className="bg-slate-50 border border-[var(--border)] p-4.5 rounded-2xl text-xs space-y-3 text-left text-[var(--text-secondary)]">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-muted)] font-bold uppercase text-[9px]">Comercio / Taller</span>
          <span className="font-bold text-[var(--text)] uppercase text-right truncate max-w-[150px]">{taller}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-muted)] font-bold uppercase text-[9px]">Concepto</span>
          <span className="font-bold text-[var(--text-secondary)]">Auxilio Técnico Vial</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-muted)] font-bold uppercase text-[9px]">Referencia</span>
          <span className="font-mono text-emerald-600 font-bold uppercase">#{id.substring(0, 8)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-[var(--border)] pt-3 mt-1">
          <span className="text-[var(--text)] font-bold uppercase text-[9px] flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Monto Transferido
          </span>
          <span className="font-black text-emerald-600 font-mono text-sm">${parseFloat(monto).toFixed(2)}</span>
        </div>
      </div>

      {/* Safety info footer */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-500 select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Comprobante digital firmado por el banco</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[8px] text-zinc-600 select-none">
          <Lock className="w-3 h-3 text-zinc-700 shrink-0" />
          <span>Seguridad Bancaria PCI-DSS y SSL 256 bits</span>
        </div>
      </div>
    </div>
  );
}

export default function PagarQrPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] font-sans antialiased flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Aurora */}
      <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/3 rounded-full blur-[140px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-black">Cargando recibo...</p>
        </div>
      }>
        <PagarQrContent />
      </Suspense>
    </div>
  );
}
