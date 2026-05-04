import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  FileStack,
  Gavel,
  HeartHandshake,
  LayoutDashboard,
  Palmtree,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "KPIs and alerts" },
  { href: "/employees", label: "People", icon: Users, description: "Directory and profiles" },
  { href: "/onboarding", label: "Onboarding", icon: UserPlus, description: "Preboarding to day 30" },
  { href: "/org", label: "Organization", icon: Building2, description: "Teams and reporting lines" },
  { href: "/recruiting", label: "Recruiting", icon: Search, description: "Roles and pipeline" },
  { href: "/leave", label: "Time off", icon: Palmtree, description: "Policies and balances" },
  { href: "/performance", label: "Performance", icon: ClipboardList, description: "Goals and reviews" },
  { href: "/training", label: "Learning", icon: BookOpen, description: "Programs and compliance" },
  { href: "/documents", label: "Documents", icon: FileStack, description: "Contracts and policies" },
  { href: "/cases", label: "HR cases", icon: Gavel, description: "Investigations and ER matters" },
  { href: "/benefits", label: "Benefits", icon: HeartHandshake, description: "Plans and enrollments" },
  { href: "/payroll", label: "Payroll", icon: Wallet, description: "Runs and adjustments" },
  { href: "/reports", label: "Reports", icon: BarChart3, description: "Workforce analytics" },
  { href: "/security", label: "Security", icon: Shield, description: "Access and audit trail" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Company and HR admin" },
];
