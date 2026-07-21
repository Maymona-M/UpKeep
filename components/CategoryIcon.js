"use client";

import {
  IdCard,
  ShieldCheck,
  Receipt,
  Car,
  Home,
  MonitorCheck,
  CircleDot,
} from "lucide-react";
import { categoryMeta } from "@/lib/categories";

const ICONS = {
  IdCard,
  ShieldCheck,
  Receipt,
  Car,
  Home,
  MonitorCheck,
  CircleDot,
};

export default function CategoryIcon({ category, size = 18, className = "" }) {
  const meta = categoryMeta(category);
  const Icon = ICONS[meta.icon] || CircleDot;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{ background: `${meta.color}26`, color: meta.color, width: size * 2, height: size * 2 }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
