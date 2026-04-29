"use client";

import { BarChart2, Calendar, FileText, ChevronRight } from "lucide-react";
import { signOut } from "next-auth/react";
import Sidebar from "./Sidebar";

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
      <Sidebar user={user} />

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

    </div>
  );
}
