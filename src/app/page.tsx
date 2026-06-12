"use client";

import React, { useState } from "react";
import Link from "next/link";
import SubscriptionModal from "@/components/SubscriptionModal";

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({
    name: "",
    price: "",
    description: ""
  });

  const handleOpenPlan = (name: string, price: string, description: string) => {
    setSelectedPlan({ name, price, description });
    setModalOpen(true);
  };
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased overflow-x-hidden flex flex-col justify-between selection:bg-[var(--primary)] selection:text-white">
      
      {/* Navigation */}
      <header className="sticky top-0 w-full bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)] z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 bg-[var(--primary)] text-force-white text-xs font-black uppercase tracking-widest rounded shadow-sm shadow-[var(--primary)]/20">
              AUX
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-[var(--text)]">
              auxilio<span className="text-[var(--primary)]">.ops</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <a href="#arquitectura" className="hover:text-[var(--primary)] transition-colors">Arquitectura</a>
            <a href="#servicios" className="hover:text-[var(--primary)] transition-colors">Servicios</a>
            <a href="#suscripcion" className="hover:text-[var(--primary)] transition-colors">Planes</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-force-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-md shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center z-10 w-full">
          {/* Badge */}
          <div className="mx-auto mb-8 inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded-full text-[9px] font-bold text-[var(--primary)] tracking-widest uppercase">
            <span>SaaS de Asistencia Vial Corporativa</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-none text-[var(--brand-dark)] uppercase">
            Asistencia en Carretera<br />
            <span className="text-[var(--text-secondary)]">
              Eficiente y Simplificada
            </span>
          </h2>

          {/* Subhead */}
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-2xl mx-auto mt-8 leading-relaxed font-medium">
            Gestión de flotas, red de talleres y asignación de técnicos en tiempo real. Optimice sus operaciones viales mediante aislamiento lógico de inquilinos y subastas automáticas de servicios.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-force-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Consola de Operaciones
            </Link>
            <a
              href="#suscripcion"
              className="w-full sm:w-auto px-6 py-4 bg-[var(--surface)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 text-[var(--primary)] rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Planes de Suscripción
            </a>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mt-24 pt-12 border-t border-[var(--border)]">
            <div className="text-left glass-panel p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Seguridad</span>
              <p className="text-lg font-black text-[var(--primary)] mt-1 uppercase">Multi-Tenant</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Aislamiento total de datos por inquilino vial.</p>
            </div>
            <div className="text-left glass-panel p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Asignación</span>
              <p className="text-lg font-black text-[var(--primary)] mt-1 uppercase">Automática</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Algoritmo de ruteo eficiente según cercanía.</p>
            </div>
            <div className="text-left glass-panel p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Disponibilidad</span>
              <p className="text-lg font-black text-[var(--primary)] mt-1 uppercase">99.9% SLA</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Soporte continuo y modo offline para zonas remotas.</p>
            </div>
            <div className="text-left glass-panel p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Comisión</span>
              <p className="text-lg font-black text-[var(--primary)] mt-1 uppercase">Fija 10%</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Transparente por cada servicio completado.</p>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="arquitectura" className="max-w-7xl mx-auto px-6 py-24 border-t border-[var(--border)] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 text-left space-y-6">
              <div className="px-2.5 py-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded text-[9px] font-bold text-[var(--brand-dark)] uppercase tracking-widest inline-block">
                Tecnología
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-[var(--brand-dark)] tracking-tight uppercase">
                Arquitectura Dedicada para Redes de Asistencia
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Nuestra infraestructura permite a aseguradoras y empresas de logística gestionar de forma totalmente independiente su catálogo de talleres y flota de técnicos.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="text-[10px] font-bold text-[var(--primary)] mt-0.5">✓</div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Segmentación estricta de base de datos a nivel de fila.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-[10px] font-bold text-[var(--primary)] mt-0.5">✓</div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Consolas de administración independientes para cada taller.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-[10px] font-bold text-[var(--primary)] mt-0.5">✓</div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Seguimiento cartográfico de incidentes y rutas estimadas.</p>
                </div>
              </div>
            </div>

            {/* Architecture Code Preview */}
            <div className="lg:col-span-7 glass-panel p-6 border border-[var(--border)] rounded-2xl shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c62828]" />
                  <span className="w-2 h-2 rounded-full bg-[#e65100]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                </div>
                <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">middleware/tenant.py</span>
              </div>
              
              <div className="space-y-3 font-mono text-[10px] text-left text-[var(--text-secondary)] leading-relaxed">
                <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                  <span className="text-[var(--primary)] font-bold"># Inquilino Vial Norte</span>
                  <p className="text-[var(--text)] mt-1 font-bold">ActiveTenant: <span className="text-[var(--accent)]">"auxilio-norte"</span></p>
                  <p className="text-[var(--text-secondary)] mt-0.5">Filter: query.filter(Incidente.tenant_id == "auxilio-norte")</p>
                </div>

                <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] opacity-65">
                  <span className="text-[var(--text-secondary)] font-bold"># Inquilino Express Sur</span>
                  <p className="text-[var(--text)] mt-1 font-bold">ActiveTenant: <span>"mecanicos-express"</span></p>
                  <p className="text-[var(--text-secondary)] mt-0.5">Filter: query.filter(Incidente.tenant_id == "mecanicos-express")</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Features Capabilities */}
        <section id="servicios" className="max-w-7xl mx-auto px-6 py-24 border-t border-[var(--border)] w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="text-2xl md:text-3xl font-black text-[var(--brand-dark)] tracking-tight uppercase">
              Capacidades Operativas Clave
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed font-medium">
              Todo lo necesario para coordinar reparaciones de emergencia y auxilio vial en carretera.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="glass-panel p-6 border border-[var(--border)] rounded-2xl shadow-sm flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary)] block mb-2 uppercase tracking-wider">01 / Ruteo</span>
                <h4 className="text-xs font-bold text-[var(--text)] mb-2 uppercase">Cálculo de Rutas</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Asignación rápida del técnico ideal basándose en la geolocalización precisa de la avería.
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 border border-[var(--border)] rounded-2xl shadow-sm flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary)] block mb-2 uppercase tracking-wider">02 / Subasta</span>
                <h4 className="text-xs font-bold text-[var(--text)] mb-2 uppercase">Licitación de Casos</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Competencia justa entre talleres autorizados para ofrecer la cotización más rápida y conveniente.
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 border border-[var(--border)] rounded-2xl shadow-sm flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary)] block mb-2 uppercase tracking-wider">03 / Offline</span>
                <h4 className="text-xs font-bold text-[var(--text)] mb-2 uppercase">Modo Contingencia</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Registro de emergencias sin internet y sincronización automática cuando el conductor recupere señal.
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 border border-[var(--border)] rounded-2xl shadow-sm flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary)] block mb-2 uppercase tracking-wider">04 / Transparencia</span>
                <h4 className="text-xs font-bold text-[var(--text)] mb-2 uppercase">Log de Estado</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Registro inmutable de los cambios de estado del auxilio para auditorías internas de calidad.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Subscription Pricing */}
        <section id="suscripcion" className="max-w-7xl mx-auto px-6 py-24 border-t border-[var(--border)] w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="text-2xl md:text-3xl font-black text-[var(--brand-dark)] tracking-tight uppercase">
              Planes de Suscripción
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed font-medium">
              Estructura de precios simple para organizaciones regionales y nacionales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Plan 1 */}
            <div className="glass-panel border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between text-left shadow-sm hover:scale-[1.01] transition-transform duration-300">
              <div>
                <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Taller Único</span>
                <h4 className="text-lg font-black text-[var(--text)] mt-1 uppercase">Starter</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Para talleres mecánicos independientes y grúas autónomas.</p>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--primary)]">49 Bs</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">/ mes</span>
                </div>

                <div className="mt-8 space-y-3 text-[10px] text-[var(--text-secondary)] font-medium border-t border-[var(--border)] pt-6">
                  <p>✓ Panel de control de solicitudes</p>
                  <p>✓ Hasta 3 técnicos registrados</p>
                  <p>✓ Soporte técnico básico</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPlan("Starter", "49 Bs / mes", "Para talleres mecánicos independientes y grúas autónomas.")}
                className="mt-8 w-full py-3.5 bg-[var(--bg-raised)] hover:bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold uppercase tracking-wider text-center rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Suscribirse
              </button>
            </div>

            {/* Plan 2 */}
            <div className="glass-panel border-2 border-[var(--primary)] rounded-2xl p-8 flex flex-col justify-between text-left shadow-md relative hover:scale-[1.03] transition-transform duration-300">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-1 bg-[var(--primary)] text-force-white text-[8px] font-bold uppercase tracking-wider rounded shadow-sm">
                Más Elegido
              </div>
              
              <div>
                <span className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-widest">Empresa Regional</span>
                <h4 className="text-lg font-black text-[var(--primary)] mt-1 uppercase">Professional</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Para medianas flotas viales y cooperativas regionales de asistencia.</p>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--primary)]">199 Bs</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">/ mes</span>
                </div>

                <div className="mt-8 space-y-3 text-[10px] text-[var(--text-secondary)] font-medium border-t border-[var(--border)] pt-6">
                  <p>✓ Subasta inversa en tiempo real</p>
                  <p>✓ Hasta 15 técnicos y seguimiento GPS</p>
                  <p>✓ Reportes de rendimiento (KPIs)</p>
                  <p>✓ Soporte prioritario</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPlan("Professional", "199 Bs / mes", "Para medianas flotas viales y cooperativas regionales de asistencia.")}
                className="mt-8 w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-force-white text-xs font-bold uppercase tracking-wider text-center rounded-xl transition-all duration-200 shadow-md shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Suscribirse
              </button>
            </div>

            {/* Plan 3 */}
            <div className="glass-panel border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between text-left shadow-sm hover:scale-[1.01] transition-transform duration-300">
              <div>
                <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Aseguradoras</span>
                <h4 className="text-lg font-black text-[var(--text)] mt-1 uppercase">Enterprise</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">Para aseguradoras nacionales y redes integrales corporativas.</p>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--primary)]">Personalizado</span>
                </div>

                <div className="mt-8 space-y-3 text-[10px] text-[var(--text-secondary)] font-medium border-t border-[var(--border)] pt-6">
                  <p>✓ Aislamiento lógico dedicado (tenant_id)</p>
                  <p>✓ Técnicos e incidentes ilimitados</p>
                  <p>✓ SLA e infraestructura dedicada</p>
                  <p>✓ Integración vía API de terceros</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPlan("Enterprise", "Precio Personalizado", "Para aseguradoras nacionales y redes integrales corporativas.")}
                className="mt-8 w-full py-3.5 bg-[var(--bg-raised)] hover:bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold uppercase tracking-wider text-center rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Contactar Ventas
              </button>
            </div>

          </div>
        </section>

        {selectedPlan.name && (
          <SubscriptionModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            planDescription={selectedPlan.description}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="w-full bg-[var(--bg)] border-t border-[var(--border)] py-12 text-center text-[10px] text-[var(--text-secondary)] z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--primary)] text-xs uppercase tracking-wider">auxilio.ops</span>
          </div>
          <p>© 2026 Auxilio.ops. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
