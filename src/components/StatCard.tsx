"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "indigo" | "emerald" | "red" | "amber" | "zinc";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "indigo"
}) => {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-500/5",
      border: "border-indigo-500/10",
      text: "text-indigo-400",
      iconBg: "bg-indigo-500/10",
      iconBorder: "border-indigo-500/20"
    },
    emerald: {
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/10",
      text: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-500/20"
    },
    red: {
      bg: "bg-red-500/5",
      border: "border-red-500/10",
      text: "text-red-400",
      iconBg: "bg-red-500/10",
      iconBorder: "border-red-500/20"
    },
    amber: {
      bg: "bg-amber-500/5",
      border: "border-amber-500/10",
      text: "text-amber-400",
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/20"
    },
    zinc: {
      bg: "bg-zinc-500/5",
      border: "border-zinc-500/10",
      text: "text-zinc-400",
      iconBg: "bg-zinc-500/10",
      iconBorder: "border-zinc-500/20"
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`stat-card stat-${color} p-5 border ${scheme.border} ${scheme.bg} rounded-2xl flex items-center justify-between shadow-xl relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-white/10 group`}>
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/3 to-transparent pointer-events-none blur-xl" />
      
      <div className="space-y-1.5 min-w-0">
        <span className="label-caps !text-[9px] text-zinc-500 block truncate uppercase tracking-widest">{title}</span>
        <p className="text-2xl font-black text-white font-mono truncate leading-none">{value}</p>
        {subtitle && (
          <p className="text-[10px] text-zinc-500 font-medium truncate block">{subtitle}</p>
        )}
      </div>

      <div className={`w-11 h-11 rounded-xl ${scheme.iconBg} border ${scheme.iconBorder} flex items-center justify-center ${scheme.text} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <Icon className="w-5 h-5 shrink-0" />
      </div>
    </div>
  );
};
