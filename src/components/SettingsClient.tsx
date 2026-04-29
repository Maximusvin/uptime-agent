"use client";

import { User, Bell, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import Sidebar from "./Sidebar";

interface Props {
  user: { name: string; email: string; image: string | null };
}

export default function SettingsClient({ user }: Props) {
  return (
    <div className="dashboard-layout">
      <Sidebar user={user} />

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

    </div>
  );
}
