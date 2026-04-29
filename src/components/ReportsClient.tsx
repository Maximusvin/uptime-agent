"use client";

import { useState } from "react";
import { BarChart2, Calendar, ChevronRight, ChevronDown, Activity, ShieldCheck, AlertCircle } from "lucide-react";
import Sidebar from "./Sidebar";

interface MonitorStat {
  name: string;
  url: string;
  uptime: number;
  downEvents: number;
  avgResponseMs?: number;
  lastStatus: string;
}

interface Report {
  id: string;
  reportDate: string;
  totalChecks: number;
  avgUptimePercent: number;
  totalMonitors: number;
  totalDownEvents: number;
  reportJson: {
    monitors: MonitorStat[];
  };
}

interface Props {
  user: { name: string; email: string; image: string | null };
  reports: Report[];
}

export default function ReportsClient({ user, reports }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            {reports.map((report) => {
              const isExpanded = expandedId === report.id;
              const monitors = report.reportJson?.monitors || [];

              return (
                <div key={report.id} className={`report-group ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className="report-card glass fade-in-up" 
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    style={{ cursor: 'pointer' }}
                  >
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
                        <span>{report.totalMonitors} сайтів</span>
                        <span className="dot" />
                        <span style={{ color: report.avgUptimePercent >= 99 ? "var(--color-success)" : "var(--color-warning)" }}>
                          {report.avgUptimePercent.toFixed(1)}% аптайм
                        </span>
                      </div>
                    </div>
                    <button className="btn-icon">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="report-details glass fade-in">
                      <div className="details-grid">
                        {monitors.map((m, idx) => (
                          <div key={idx} className="monitor-stat-row">
                            <div className="ms-info">
                              <div className="ms-name">{m.name}</div>
                              <div className="ms-url">{m.url}</div>
                            </div>
                            <div className="ms-metrics">
                              <div className="ms-metric">
                                <span className="label">Аптайм</span>
                                <span className="value" style={{ color: m.uptime >= 99 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                  {m.uptime.toFixed(1)}%
                                </span>
                              </div>
                              <div className="ms-metric">
                                <span className="label">Відповідь</span>
                                <span className="value">{m.avgResponseMs || '—'} мс</span>
                              </div>
                              <div className="ms-metric">
                                <span className="label">Збої</span>
                                <span className="value" style={{ color: m.downEvents > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                  {m.downEvents}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

