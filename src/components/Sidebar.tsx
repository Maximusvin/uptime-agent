"use client";

import { Activity, TrendingUp, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  user: { name: string; email: string; image: string | null };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-dot" />
        <span className="logo-text">UptimeAgent</span>
      </div>

      <nav className="sidebar-nav">
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
          <Activity size={16} />
          Монітори
        </Link>
        <Link href="/dashboard/reports" className={`nav-item ${pathname === "/dashboard/reports" ? "active" : ""}`}>
          <TrendingUp size={16} />
          Звіти
        </Link>
        <Link href="/dashboard/settings" className={`nav-item ${pathname === "/dashboard/settings" ? "active" : ""}`}>
          <Settings size={16} />
          Налаштування
        </Link>
      </nav>

      <div className="sidebar-user">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name} className="user-avatar" />
        )}
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
        <button
          className="btn-icon"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          title="Вийти"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
