import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  FileSignature,
  FileStack,
  Gavel,
  LayoutDashboard,
  Mail,
  Network,
  Palmtree,
  Repeat,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Sidebar nav, grouped by HR / People / Time / Letters / Admin sections. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "KPIs and alerts" },
      { href: "/leave", label: "My leave", icon: Palmtree, description: "Requests and balances" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/employees", label: "People", icon: Users, description: "Directory and profiles" },
      { href: "/onboarding", label: "Onboarding", icon: UserPlus, description: "Add to roster" },
      { href: "/recruiting", label: "Recruiting", icon: Search, description: "Roles and pipeline" },
      { href: "/transfer-posting", label: "Transfer / Posting", icon: Repeat, description: "Cross-BU movement" },
      { href: "/org-chart", label: "Reporting channel", icon: Network, description: "Reporting tree" },
    ],
  },
  {
    label: "Time & performance",
    items: [
      { href: "/performance", label: "Performance", icon: ClipboardList, description: "Goals and reviews" },
      { href: "/training", label: "Learning", icon: BookOpen, description: "Programs and compliance" },
    ],
  },
  {
    label: "Letters & docs",
    items: [
      { href: "/letters", label: "Letters", icon: FileSignature, description: "Promotion / Termination letters" },
      { href: "/documents", label: "Documents", icon: FileStack, description: "Contracts and policies" },
      { href: "/cases", label: "HR cases", icon: Gavel, description: "Investigations" },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/organization", label: "Organization setup", icon: Building2, description: "BUs, departments, JD" },
      { href: "/security", label: "Security", icon: Shield, description: "Access and audit trail" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Company and HR admin" },
    ],
  },
];

/** Flattened list for backwards-compatible role-access map. */
export const mainNav: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Currently-unused icon import guard for tree-shaking confusion. */
export const _navIconsUsed = [Briefcase, Mail, UsersRound];
