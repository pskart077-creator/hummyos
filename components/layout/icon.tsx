import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Megaphone,
  Image,
  UserPlus,
  ShoppingCart,
  ListChecks,
  ShieldCheck,
  BookOpen,
  Plug,
  ScrollText,
  FileBarChart,
  Coins,
  Users,
  Settings,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Megaphone,
  Image,
  UserPlus,
  ShoppingCart,
  ListChecks,
  ShieldCheck,
  BookOpen,
  Plug,
  ScrollText,
  FileBarChart,
  Coins,
  Users,
  Settings,
  ShieldAlert,
};

export function NavIcon({
  name,
  className,
  size = 18,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} size={size} />;
}
