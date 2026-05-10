"use client";

import {
  ShoppingCart,
  Home,
  Plug,
  Car,
  Fuel,
  Utensils,
  ShoppingBag,
  Film,
  Plane,
  Tv,
  HeartPulse,
  Dumbbell,
  Sparkles,
  Baby,
  GraduationCap,
  PawPrint,
  Gift,
  Briefcase,
  Star,
  Percent,
  Building,
  PieChart,
  TrendingUp,
  Landmark,
  Coins,
  Bitcoin,
  Shield,
  ArrowRightLeft,
  Circle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  plug: Plug,
  car: Car,
  fuel: Fuel,
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  film: Film,
  plane: Plane,
  tv: Tv,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  baby: Baby,
  "graduation-cap": GraduationCap,
  "paw-print": PawPrint,
  gift: Gift,
  briefcase: Briefcase,
  star: Star,
  percent: Percent,
  building: Building,
  "pie-chart": PieChart,
  "trending-up": TrendingUp,
  landmark: Landmark,
  coins: Coins,
  bitcoin: Bitcoin,
  shield: Shield,
  "arrow-right-left": ArrowRightLeft,
  circle: Circle,
};

export const ICON_NAMES = Object.keys(MAP);

export function CategoryIcon({
  name,
  color,
  className,
  size = 18,
}: {
  name: string;
  color?: string;
  className?: string;
  size?: number;
}) {
  const Icon = MAP[name] ?? Circle;
  return (
    <span
      className={"inline-flex items-center justify-center rounded-lg " + (className ?? "")}
      style={{
        backgroundColor: color ? `${color}22` : undefined,
        color: color,
        width: size + 14,
        height: size + 14,
      }}
    >
      <Icon size={size} />
    </span>
  );
}
