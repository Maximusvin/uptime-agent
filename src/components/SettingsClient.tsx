"use client";

import { Settings, LogOut, Activity, TrendingUp, User, Bell, Shield } from "lucide-react";
import { signOut } from "next-auth/react";

interface Props {
  user: { name: string; email: string; image: string | null };
}

export default function SettingsClient({ user }: Props) {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          <span className="logo-dot" />
          <span className="logo-text">UptimeAgent</span>
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <Activity size={16} />
            Монітори
          </a>
          <a href="/dashboard/reports" className="nav-item">
            <TrendingUp size={16} />
            Звіти
          </a>
          <a href="/dashboard/settings" className="nav-item active">
            <Settings size={16} />
            Налаштування
          </a>
        </nav>
        <div className="sidebar-user">
          {user.image && <img src={user.image} alt={user.name} className="user-avatar" />}
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="btn-icon" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Налаштування</h1>
            <p className="page-subtitle">Керуйте своїм профілем та сповіщеннями</p>
          </div>
        </header>

        <div className="settings-grid">
          <div className="settings-section glass fade-in-up">
            <div className="section-header">
              <User size={18} />
              <h3>Профіль</h3>
            </div>
            <div className="profile-box">
              {user.image && <img src={user.image} alt={user.name} className="large-avatar" />}
              <div>
                <div className="info-label">Ім'я</div>
                <div className="info-value">{user.name}</div>
                <div className="info-label" style={{ marginTop: 12 }}>Email</div>
                <div className="info-value">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="settings-section glass fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="section-header">
              <Bell size={18} />
              <h3>Сповіщення</h3>
            </div>
            <p className="section-desc">Налаштування Telegram-бота та глобальних алертів.</p>
            <div className="setting-item">
              <span>Глобальний Telegram ID</span>
              <button className="btn-ghost" disabled>Скоро буде</button>
            </div>
          </div>

          <div className="settings-section glass fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="section-header">
              <Shield size={18} />
              <h3>Безпека</h3>
            </div>
            <p className="section-desc">Керування доступом та сесіями.</p>
            <button className="btn-danger" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
              Вийти з усіх пристроїв
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .settings-grid { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 800px; }
        .settings-section { padding: 24px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--color-primary-light); }
        .section-header h3 { font-size: 18px; font-weight: 700; color: var(--color-text); }
        .section-desc { font-size: 14px; color: var(--color-text-muted); margin-bottom: 20px; }
        .profile-box { display: flex; gap: 24px; align-items: center; }
        .large-avatar { width: 80px; height: 80px; border-radius: 20px; border: 2px solid var(--color-border); }
        .info-label { font-size: 12px; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; }
        .info-value { font-size: 16px; font-weight: 600; color: var(--color-text); }
        .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid var(--color-border); }
        .btn-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .btn-danger:hover { background: #ef4444; color: white; }
      `}</style>
    </div>
  );
}
