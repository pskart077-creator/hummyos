import type { Permission } from "./permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // nome do ícone lucide-react
  permission?: Permission;
  group: "Operação" | "IA" | "Tráfego" | "Gestão" | "Sistema";
};

/** Menu lateral. Itens sem permission são visíveis a todos os logados. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", group: "Operação" },

  { label: "Chat IA", href: "/chat", icon: "MessageSquare", permission: "chat:use", group: "IA" },
  { label: "Agentes IA", href: "/agents", icon: "Bot", permission: "agents:view", group: "IA" },

  { label: "Meta Ads", href: "/meta-ads", icon: "Megaphone", permission: "meta:view", group: "Tráfego" },
  { label: "Criativos", href: "/creatives", icon: "Image", permission: "creatives:view", group: "Tráfego" },

  { label: "Leads", href: "/leads", icon: "UserPlus", permission: "leads:view", group: "Operação" },
  { label: "Vendas", href: "/sales", icon: "ShoppingCart", permission: "sales:view", group: "Operação" },
  { label: "Tarefas", href: "/tasks", icon: "ListChecks", permission: "tasks:view", group: "Operação" },
  { label: "Aprovações", href: "/approvals", icon: "ShieldCheck", permission: "approvals:view", group: "Operação" },

  { label: "Conhecimento", href: "/knowledge", icon: "BookOpen", permission: "knowledge:view", group: "Gestão" },
  { label: "Integrações", href: "/integrations", icon: "Plug", permission: "integrations:view", group: "Sistema" },
  { label: "Logs", href: "/logs", icon: "ScrollText", permission: "logs:view", group: "Sistema" },
  { label: "Relatórios", href: "/reports", icon: "FileBarChart", permission: "reports:view", group: "Gestão" },
  { label: "Uso de IA", href: "/ai-usage", icon: "Coins", permission: "ai_usage:view", group: "Gestão" },
  { label: "Equipe", href: "/team", icon: "Users", permission: "team:view", group: "Gestão" },
  { label: "Configurações", href: "/settings", icon: "Settings", permission: "settings:view", group: "Sistema" },
  { label: "Admin", href: "/admin", icon: "ShieldAlert", permission: "admin:access", group: "Sistema" },
];
