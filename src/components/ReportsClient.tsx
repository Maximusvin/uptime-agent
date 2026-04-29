"use client";

import { BarChart2, Calendar, FileText, ChevronRight, LogOut, Activity, TrendingUp, Settings } from "lucide-react";
import { signOut } from "next-auth/react";

interface Report {
  id: string;
  reportDate: string;
  summary: string;
  totalChecks: number;
  upPercentage: number;
}

interface Props {
  user: { name: string; email: string; image: string | null };
  reports: Report[];
}

export default function ReportsClient({ user, reports }: Props) {
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
          <a href="/dashboard/reports" className="nav-item active">
            <TrendingUp size={16} />
            Звіти
          </a>
          <a href="/dashboard/settings" className="nav-item">
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
            <h1 className="page-title">Щоденні звіти</h1>
            <p className="page-subtitle">Аналітика доступності та SEO за останні 30 днів</p>
          </div>
        </header>

        {reports.length === 0 ? (
          <div className="empty-state glass">
            <BarChart2 size={48} style={{ color: "var(--color-primary)", opacity: 0.6 }} />
            <h2>Звітів поки немає</h2>
            <p>Перший звіт буде згенеровано автоматично о 05:00 ранку</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="report-card glass fade-in-up">
                <div className="report-icon">
                  <Calendar size={20} />
                </div>
                <div className="report-content">
                  <div className="report-date">
                    {new Date(report.reportDate).toLocaleDateString("uk-UA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <div className="report-stats">
                    <span>{report.totalChecks} перевірок</span>
                    <span className="dot" />
                    <span style={{ color: report.upPercentage >= 99 ? "var(--color-success)" : "var(--color-warning)" }}>
                      {report.upPercentage.toFixed(1)}% аптайм
                    </span>
                  </div>
                </div>
                <button className="btn-secondary">
                  Детальніше
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .reports-list { display: flex; flex-direction: column; gap: 12px; }
        .report-card { padding: 20px 24px; display: flex; align-items: center; gap: 20px; }
        .report-icon { width: 44px; height: 44px; background: rgba(99, 102, 241, 0.12); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--color-primary-light); }
        .report-content { flex: 1; }
        .report-date { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
        .report-stats { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); }
        .dot { width: 4px; height: 4px; background: var(--color-border); border-radius: 50%; }
      `}</style>
    </div>
  );
}
