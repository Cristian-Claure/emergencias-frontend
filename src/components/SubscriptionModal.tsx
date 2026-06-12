"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Building2, 
  Globe, 
  Loader2, 
  ArrowRight, 
  Download, 
  CreditCard,
  AlertCircle,
  Copy,
  CheckCheck
} from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  planDescription: string;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  planName,
  planPrice,
  planDescription
}: SubscriptionModalProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [step, setStep] = useState(1); // 1: Config, 2: Payment Selector, 3: Provisioning, 4: Success
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor] = useState("#10b981"); // Locked to brand emerald green
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  // PayPal states
  const [paypalEmail, setPaypalEmail] = useState("demo-cliente@paypal.com");
  const [paypalPassword, setPaypalPassword] = useState("••••••••••••");

  // Stripe states
  const [stripeCardName, setStripeCardName] = useState("");
  const [stripeCardNumber, setStripeCardNumber] = useState("");
  const [stripeExpiry, setStripeExpiry] = useState("");
  const [stripeCvc, setStripeCvc] = useState("");
  const [stripeErrors, setStripeErrors] = useState<Record<string, string>>({});

  // Provisioning animation states
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState([
    { text: "Iniciando espacio de nombres para el nuevo tenant", status: "pending" },
    { text: "Configurando aislamiento lógico y esquema de datos", status: "pending" },
    { text: "Habilitando políticas de seguridad Row-Level Security (RLS)", status: "pending" },
    { text: "Generando credenciales para el usuario administrador", status: "pending" },
    { text: "Instanciando talleres iniciales y despachador automático", status: "pending" },
    { text: "Provisionando servicio de caché Redis y colas offline", status: "pending" }
  ]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Manage mount/unmount and slide transitions
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setAnimate(true), 30);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 500); // Wait for transition out
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form states when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOrgName("");
      setSlug("");
      setAdminEmail("");
      setAdminPassword("");
      setErrors({});
      setPaymentMethod("stripe");
      setPaymentSuccess(false);
      setPaymentLoading(false);
      setTransactionId("");
      setStripeCardName("");
      setStripeCardNumber("");
      setStripeExpiry("");
      setStripeCvc("");
      setStripeErrors({});
      setProgressPercent(0);
      setCurrentTaskIndex(0);
      setTasks([
        { text: "Iniciando espacio de nombres para el nuevo tenant", status: "pending" },
        { text: "Configurando aislamiento lógico y esquema de datos", status: "pending" },
        { text: "Habilitando políticas de seguridad Row-Level Security (RLS)", status: "pending" },
        { text: "Generando credenciales para el usuario administrador", status: "pending" },
        { text: "Instanciando talleres iniciales y despachador automático", status: "pending" },
        { text: "Provisionando servicio de caché Redis y colas offline", status: "pending" }
      ]);
    }
  }, [isOpen]);

  // Auto-generate slug from organization name
  useEffect(() => {
    if (orgName) {
      const generatedSlug = orgName
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9\s-]/g, "")    // remove special chars
        .replace(/[\s_]+/g, "-")         // replace spaces with hyphens
        .replace(/-+/g, "-");            // replace multiple hyphens
      setSlug(generatedSlug);
    } else {
      setSlug("");
    }
  }, [orgName]);

  // Format Card Number input (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
    setStripeCardNumber(formatted.substring(0, 19));
  };

  // Format Expiry input (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setStripeExpiry(value.substring(0, 5));
  };

  // Handle tasks progression in Step 3
  useEffect(() => {
    if (step !== 3) return;

    const interval = setInterval(() => {
      setTasks(prev => {
        const next = [...prev];
        if (currentTaskIndex < next.length) {
          next[currentTaskIndex].status = "completed";
          setCurrentTaskIndex(prevIndex => prevIndex + 1);
          setProgressPercent(Math.round(((currentTaskIndex + 1) / next.length) * 100));
        } else {
          clearInterval(interval);
          setTimeout(() => {
            saveSimulatedTenant();
            setStep(4);
          }, 800);
        }
        return next;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [step, currentTaskIndex]);

  if (!shouldRender) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Form Validation (Step 1)
  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!orgName.trim()) tempErrors.orgName = "El nombre de la organización es obligatorio.";
    if (!slug.trim()) tempErrors.slug = "El identificador del tenant es obligatorio.";
    if (!adminEmail.trim()) {
      tempErrors.adminEmail = "El correo del administrador es obligatorio.";
    } else if (!/\S+@\S+\.\S+/.test(adminEmail)) {
      tempErrors.adminEmail = "El formato de correo no es válido.";
    }
    if (!adminPassword || adminPassword.length < 6) {
      tempErrors.adminPassword = "La contraseña debe tener al menos 6 caracteres.";
    }

    const reservedIds = ["auxilio-norte", "mecanicos-express", "gruas-urgentes", "auxilio-sud"];
    if (reservedIds.includes(slug)) {
      tempErrors.slug = "Este identificador ya está en uso por el sistema.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Stripe Validation
  const validateStripeForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!stripeCardName.trim()) tempErrors.cardName = "El nombre del titular es obligatorio.";
    if (stripeCardNumber.replace(/\s/g, "").length < 16) {
      tempErrors.cardNumber = "Número de tarjeta inválido (16 dígitos requeridos).";
    }
    if (!stripeExpiry.includes("/") || stripeExpiry.length < 5) {
      tempErrors.expiry = "Formato de vencimiento incorrecto (MM/YY).";
    }
    if (stripeCvc.length < 3) {
      tempErrors.cvc = "CVC inválido (3 dígitos requeridos).";
    }

    setStripeErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateForm()) {
        setStep(2);
      }
    }
  };

  const handleProcessStripePayment = () => {
    if (!validateStripeForm()) return;

    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTransactionId(`ch_stripe_${Math.random().toString(36).substring(2, 12).toUpperCase()}`);
      setTimeout(() => {
        setStep(3);
      }, 1000);
    }, 2200);
  };

  const handleProcessPaypalPayment = () => {
    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTransactionId(`ch_paypal_${Math.random().toString(36).substring(2, 12).toUpperCase()}`);
      setTimeout(() => {
        setStep(3);
      }, 1000);
    }, 2000);
  };

  const saveSimulatedTenant = () => {
    if (typeof window === "undefined") return;

    const newTenant = {
      id: slug,
      name: orgName,
      logo: orgName
        .split(/\s+/)
        .map((w: string) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase(),
      description: `Servicio oficial de auxilio vial de ${orgName}.`,
      primaryColor: primaryColor
    };

    const existingSimulated = JSON.parse(localStorage.getItem("simulated_tenants") || "[]");
    const updatedSimulated = [...existingSimulated.filter((t: any) => t.id !== slug), newTenant];
    localStorage.setItem("simulated_tenants", JSON.stringify(updatedSimulated));

    const cached = JSON.parse(localStorage.getItem("cached_tenants") || "[]");
    const updatedCached = [...cached.filter((t: any) => t.id !== slug), newTenant];
    localStorage.setItem("cached_tenants", JSON.stringify(updatedCached));

    const adminUser = {
      tenant_id: slug,
      tenant_nombre: orgName,
      nombre: "Administrador " + orgName,
      email: adminEmail,
      tipo: "admin",
      password: adminPassword,
      telefono: "+591 789 00000"
    };

    const tenantUsers = JSON.parse(localStorage.getItem(`simulated_users_${slug}`) || "[]");
    const updatedUsers = [...tenantUsers.filter((u: any) => u.email !== adminEmail), adminUser];
    localStorage.setItem(`simulated_users_${slug}`, JSON.stringify(updatedUsers));
  };

  const handleAccessConsole = () => {
    if (typeof window === "undefined") return;

    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ tenant_id: slug, sub: adminEmail, role: "admin" }));
    const token = `${header}.${payload}.signature`;

    localStorage.setItem("auth_token", token);
    localStorage.setItem("active_tenant_id", slug);
    localStorage.setItem("tenant_id", slug);
    localStorage.setItem("active_role", "admin");
    localStorage.setItem("user_email", adminEmail);

    window.location.href = "/dashboard/admin";
  };

  const handleDownloadCredentials = () => {
    const text = `
=====================================================
  CREDENCIALES DE TU ACCESO MULTI-TENANT (AUXILIO.OPS)
=====================================================
Organización: ${orgName}
Plan Suscrito: ${planName}
Identificador (Tenant ID): ${slug}
Enlace de Acceso: ${window.location.origin}/login?tenant=${slug}

-----------------------------------------------------
  DATOS DE INICIO DE SESIÓN (ADMIN)
-----------------------------------------------------
Correo Electrónico: ${adminEmail}
Contraseña: ${adminPassword}

-----------------------------------------------------
* Conserva estas credenciales en un lugar seguro.
* Tu base de datos ha sido instanciada en memoria local
  simulada de alta velocidad para pruebas.
=====================================================
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `credenciales-${slug}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Scope-restricted CSS to force input padding-left and bypass globals.css !important rules */}
      <style>{`
        .sub-drawer-input {
          padding-left: 2.85rem !important;
          padding-right: 1.25rem !important;
          padding-top: 13px !important;
          padding-bottom: 13px !important;
          border-radius: 14px !important;
          background-color: var(--bg) !important;
          border: 1px solid var(--border) !important;
          color: var(--text) !important;
          font-size: 0.88rem !important;
          width: 100% !important;
          height: 46px !important;
          box-sizing: border-box !important;
          transition: all 0.2s ease-in-out !important;
        }
        .sub-drawer-input:focus {
          border-color: var(--primary) !important;
          background-color: var(--bg-raised) !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
          outline: none !important;
        }
        .sub-drawer-input::placeholder {
          color: var(--text-muted) !important;
          opacity: 0.55 !important;
        }
        .card-input-box {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          padding-top: 13px !important;
          padding-bottom: 13px !important;
          border-radius: 14px !important;
          background-color: var(--bg) !important;
          border: 1px solid var(--border) !important;
          color: var(--text) !important;
          font-size: 0.88rem !important;
          width: 100% !important;
          height: 46px !important;
          box-sizing: border-box !important;
          transition: all 0.2s ease-in-out !important;
        }
        .card-input-box:focus {
          border-color: var(--primary) !important;
          background-color: var(--bg-raised) !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
          outline: none !important;
        }
        .card-input-box::placeholder {
          color: var(--text-muted) !important;
          opacity: 0.55 !important;
        }
      `}</style>

      {/* Backdrop */}
      <div 
        onClick={step === 3 ? undefined : onClose}
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] transition-opacity duration-500 ease-in-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Slide-over Drawer Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-[500px] md:w-[520px] bg-[var(--bg-raised)] border-l border-[var(--border)] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-[100] flex flex-col ${
          animate ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--bg)]/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-[var(--primary)] text-white rounded">
              Suscripción
            </span>
            <span className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
              {planName}
            </span>
          </div>
          <button 
            onClick={onClose}
            disabled={step === 3}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-full transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Stepper */}
        {step < 3 && (
          <div className="px-6 pt-5 pb-1">
            <div className="flex items-center justify-between">
              {[
                { s: 1, label: "Configurar" },
                { s: 2, label: "Pago" }
              ].map((item, idx) => (
                <div key={item.s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
                      step >= item.s 
                        ? "bg-[var(--primary)] text-white ring-4 ring-emerald-500/10" 
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      {step > item.s ? <Check className="w-2.5 h-2.5" /> : item.s}
                    </div>
                    <span className={`text-[9px] uppercase font-black tracking-widest ${
                      step >= item.s ? "text-[var(--text)]" : "text-[var(--text-secondary)]"
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {idx < 1 && (
                    <div className={`h-[1.5px] mx-4 flex-1 transition-all duration-300 ${
                      step > item.s ? "bg-[var(--primary)]" : "bg-slate-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Container */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          
          {/* STEP 1: CONFIGURATION */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
                  Configuración de tu Consola Vial
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed font-medium">
                  Completa los datos de tu nuevo entorno de operaciones viales. El sistema aprovisionará un espacio virtual aislado.
                </p>
              </div>

              {/* Plan Summary Card */}
              <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[8px] font-black uppercase text-[var(--primary)] tracking-widest block">Licencia Solicitada</span>
                  <span className="text-xs font-black text-[var(--text)]">{planName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase text-[var(--text-secondary)] tracking-widest block">Costo mensual</span>
                  <span className="text-xs font-extrabold text-[var(--primary)]">{planPrice}</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Organization Name */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-[var(--text-secondary)] block">
                    Nombre de la Empresa / Organización
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ej. Talleres Unidos del Oriente"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className={`sub-drawer-input ${errors.orgName ? "border-rose-400" : ""}`}
                    />
                  </div>
                  {errors.orgName && (
                    <p className="text-[9px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> {errors.orgName}
                    </p>
                  )}
                </div>

                {/* Slug / Tenant ID */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-[var(--text-secondary)] block">
                    Identificador de Inquilino (Tenant ID)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
                      <Globe className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="ej. talleres-oriente"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className={`sub-drawer-input font-mono ${errors.slug ? "border-rose-400" : ""}`}
                    />
                  </div>
                  {!errors.slug && slug && (
                    <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enlace de la Consola: <span className="font-mono text-slate-800 font-extrabold">{slug}.auxilio.ops</span>
                    </p>
                  )}
                  {errors.slug && (
                    <p className="text-[9px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> {errors.slug}
                    </p>
                  )}
                </div>

                {/* Admin Credentials Section */}
                <div className="border-t border-[var(--border)] pt-4 mt-2 space-y-4">
                  <h4 className="text-[9px] font-black text-[var(--text)] uppercase tracking-wider">
                    Credenciales del Administrador Principal
                  </h4>
                  
                  {/* Admin Email */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black tracking-widest text-[var(--text-secondary)] block">
                      Correo del Administrador
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="admin@miempresa.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className={`sub-drawer-input ${errors.adminEmail ? "border-rose-400" : ""}`}
                      />
                    </div>
                    {errors.adminEmail && (
                      <p className="text-[9px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> {errors.adminEmail}
                      </p>
                    )}
                  </div>

                  {/* Admin Password */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black tracking-widest text-[var(--text-secondary)] block">
                      Contraseña de Acceso
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className={`sub-drawer-input ${errors.adminPassword ? "border-rose-400" : ""}`}
                      />
                    </div>
                    {errors.adminPassword && (
                      <p className="text-[9px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> {errors.adminPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT METHOD SELECTOR */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
                  Procesar Pago Seguro
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed font-medium">
                  Elige tu método de pago preferido para activar la licencia y el aprovisionamiento.
                </p>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-450 block">Licencia</span>
                  <h4 className="text-xs font-bold text-[var(--text)]">{planName} - Licencia de Uso</h4>
                  <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 font-medium">{planDescription}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Total</span>
                  <p className="text-xs font-black text-[var(--primary)]">{planPrice}</p>
                </div>
              </div>

              {/* Payment Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === "stripe" 
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10 scale-[1.01]" 
                      : "bg-white border-slate-250 text-slate-500 hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/20"
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Stripe (Tarjeta)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === "paypal" 
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10 scale-[1.01]" 
                      : "bg-white border-slate-250 text-slate-500 hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/20"
                  }`}
                >
                  <span className={`font-extrabold italic text-sm tracking-tighter ${paymentMethod === "paypal" ? "text-white" : ""}`}>
                    Pay<span className={paymentMethod === "paypal" ? "text-emerald-100" : "text-[#0079C1]"}>Pal</span>
                  </span>
                </button>
              </div>

              {/* STRIPE CHECKOUT FORM */}
              {paymentMethod === "stripe" && (
                <div className="border border-[var(--border)] bg-[var(--bg)]/30 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Pago Seguro vía Stripe Checkout
                    </span>
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase">Prueba / Test</span>
                  </div>

                  {paymentLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-7 h-7 text-[var(--primary)] animate-spin" />
                      <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text)]">
                        Conectando con Stripe Checkout...
                      </p>
                      <p className="text-[8px] text-[var(--text-secondary)]">
                        Autorizando cargo seguro en tarjeta...
                      </p>
                    </div>
                  ) : paymentSuccess ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 animate-scale-up">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">¡Cargo Aprobado por Stripe!</h4>
                        <p className="text-[8px] text-emerald-600 font-mono font-bold mt-1">{transactionId}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">Aprovisionando espacio de operaciones...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Cardholder Name */}
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Titular de la tarjeta</label>
                        <input
                          type="text"
                          placeholder="Ej. Juan Pérez Roca"
                          value={stripeCardName}
                          onChange={(e) => setStripeCardName(e.target.value)}
                          className="card-input-box"
                        />
                        {stripeErrors.cardName && <span className="text-[8px] text-rose-500 font-bold block mt-0.5">{stripeErrors.cardName}</span>}
                      </div>

                      {/* Card Number */}
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Número de tarjeta</label>
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          value={stripeCardNumber}
                          onChange={handleCardNumberChange}
                          className="card-input-box font-mono"
                        />
                        {stripeErrors.cardNumber && <span className="text-[8px] text-rose-500 font-bold block mt-0.5">{stripeErrors.cardNumber}</span>}
                      </div>

                      {/* Expiry and CVC */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Vencimiento</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={stripeExpiry}
                            onChange={handleExpiryChange}
                            className="card-input-box font-mono text-center"
                          />
                          {stripeErrors.expiry && <span className="text-[8px] text-rose-500 font-bold block mt-0.5">{stripeErrors.expiry}</span>}
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">CVC / CVV</label>
                          <input
                            type="password"
                            placeholder="123"
                            value={stripeCvc}
                            onChange={(e) => setStripeCvc(e.target.value.replace(/\D/g, "").substring(0, 4))}
                            className="card-input-box font-mono text-center"
                          />
                          {stripeErrors.cvc && <span className="text-[8px] text-rose-500 font-bold block mt-0.5">{stripeErrors.cvc}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessStripePayment}
                        className="w-full mt-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                      >
                        <Lock className="w-3.5 h-3.5" /> Pagar {planPrice} con Stripe
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PAYPAL CHECKOUT FORM */}
              {paymentMethod === "paypal" && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* PayPal Header */}
                  <div className="bg-[#003087] px-5 py-3.5 flex items-center justify-between">
                    <span className="text-white font-extrabold italic text-xs tracking-tight">
                      Pay<span className="text-[#0079C1]">Pal</span>
                    </span>
                    <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-emerald-400" /> Checkout Seguro
                    </span>
                  </div>

                  {/* PayPal Content */}
                  <div className="p-6 bg-slate-50/50 space-y-4">
                    {paymentLoading ? (
                      <div className="py-10 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-7 h-7 text-[#0079C1] animate-spin" />
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#003087]">
                          Conectando con PayPal Checkout...
                        </p>
                        <p className="text-[8px] text-slate-400">
                          Por favor, espere.
                        </p>
                      </div>
                    ) : paymentSuccess ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-scale-up">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">¡Pago Aprobado!</h4>
                          <p className="text-[8px] text-emerald-600 font-mono font-bold mt-1">{transactionId}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">Aprovisionando espacio de operaciones...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-600 uppercase">Correo de PayPal</label>
                          <input
                            type="email"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0079C1] h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-600 uppercase">Contraseña</label>
                          <input
                            type="password"
                            value={paypalPassword}
                            onChange={(e) => setPaypalPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0079C1] h-10"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleProcessPaypalPayment}
                            className="w-full py-3 bg-[#FFC439] hover:bg-[#F2B522] text-[#003087] font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pagar con PayPal
                          </button>
                          <p className="text-[8px] text-center text-slate-400 mt-2 font-medium">
                            Simulación segura sin cobros reales.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROVISIONING PIPELINE */}
          {step === 3 && (
            <div className="py-6 space-y-8">
              <div className="text-center space-y-2">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
                  <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center bg-slate-50 z-10">
                    <span className="text-xs font-black text-[var(--primary)]">{progressPercent}%</span>
                    <span className="text-[7px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Progreso</span>
                  </div>
                </div>

                <div className="pt-3">
                  <h3 className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
                    Desplegando tu Consola Operativa
                  </h3>
                  <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto font-medium">
                    Aprovisionando bases de datos y configurando el espacio para <span className="font-extrabold">{slug}</span>...
                  </p>
                </div>
              </div>

              {/* Tasks list */}
              <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl space-y-2.5">
                {tasks.map((task, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between text-[9px] font-semibold transition-all duration-300 ${
                      task.status === "completed" 
                        ? "text-[var(--text)]" 
                        : idx === currentTaskIndex 
                          ? "text-[var(--primary)] font-bold" 
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {task.status === "completed" ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center p-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      ) : idx === currentTaskIndex ? (
                        <Loader2 className="w-3.5 h-3.5 text-[var(--primary)] animate-spin" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                      )}
                      <span>{task.text}</span>
                    </div>
                    <span className="text-[8px] uppercase font-bold tracking-wider">
                      {task.status === "completed" ? (
                        <span className="text-[var(--primary)]">Hecho</span>
                      ) : idx === currentTaskIndex ? (
                        <span className="text-[var(--primary)] animate-pulse">Procesando</span>
                      ) : (
                        <span className="text-slate-300">Espera</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-md animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
                  ¡Inquilino Creado Exitosamente!
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed font-medium">
                  Tu base de datos aislada y consola administrativa han sido instanciadas de manera correcta.
                </p>
              </div>

              {/* Credentials Summary Box */}
              <div className="p-5 bg-[var(--primary-light)] text-[var(--text)] rounded-2xl text-left font-mono relative overflow-hidden border border-[var(--primary)]/20 shadow-inner">
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[var(--primary)]" />
                
                <h4 className="text-[8px] text-[var(--brand-dark)] font-sans uppercase font-black tracking-widest mb-4">
                  Datos de Conexión a la Consola
                </h4>

                <div className="space-y-3.5 text-[11px]">
                  {/* Tenant ID Row */}
                  <div className="flex items-center justify-between border-b border-[var(--primary)]/10 pb-2">
                    <div>
                      <span className="text-[8px] text-[var(--text-secondary)] uppercase font-sans tracking-wider block">ID Inquilino</span>
                      <span className="text-[var(--brand-dark)] font-black">{slug}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(slug, "slug")}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-white/60 transition-colors rounded cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "slug" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Email Row */}
                  <div className="flex items-center justify-between border-b border-[var(--primary)]/10 pb-2">
                    <div>
                      <span className="text-[8px] text-[var(--text-secondary)] uppercase font-sans tracking-wider block">Usuario Administrador</span>
                      <span className="text-slate-800 font-bold block truncate max-w-[250px]">{adminEmail}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(adminEmail, "email")}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-white/60 transition-colors rounded cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "email" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Row */}
                  <div className="flex items-center justify-between border-b border-[var(--primary)]/10 pb-2">
                    <div>
                      <span className="text-[8px] text-[var(--text-secondary)] uppercase font-sans tracking-wider block">Contraseña temporal</span>
                      <span className="text-slate-800 font-bold block">{adminPassword}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(adminPassword, "password")}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-white/60 transition-colors rounded cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "password" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* URL Console Row */}
                  <div>
                    <span className="text-[8px] text-[var(--text-secondary)] uppercase font-sans tracking-wider block">URL Consola</span>
                    <span className="text-[var(--brand-dark)] text-[10px] block break-all font-mono font-bold">
                      {window.location.origin}/login?tenant={slug}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadCredentials}
                  className="flex-1 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar datos
                </button>
                <button
                  type="button"
                  onClick={handleAccessConsole}
                  className="flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-none"
                  style={{ 
                    backgroundColor: primaryColor,
                    boxShadow: `0 8px 20px -5px ${primaryColor}40`
                  }}
                >
                  Acceder a la Consola <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer Actions (Step 1 only) */}
        {step === 1 && (
          <div className="px-6 py-4.5 border-t border-[var(--border)] bg-[var(--bg)]/40 backdrop-blur-md flex items-center justify-between">
            <span className="text-[8px] font-bold text-[var(--text-secondary)]">
              * Aislamiento lógico garantizado.
            </span>
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border-none"
            >
              Ir al Pago <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </>
  );
}
