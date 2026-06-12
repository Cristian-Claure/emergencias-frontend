"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("active_role");

    if (!token) {
      router.push("/login");
      return;
    }

    // Direct and secure redirection depending on authenticated role
    if (role === "admin") {
      router.push("/dashboard/admin");
    } else if (role === "taller") {
      router.push("/dashboard/taller");
    } else {
      router.push("/dashboard/cliente");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
      <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">
        Redireccionando a tu Consola Operativa...
      </p>
    </div>
  );
}
