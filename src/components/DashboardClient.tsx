"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Plus,
  Settings,
  LogOut,
  Globe,
  ChevronDown,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { signOut } from "next-auth/react";

type CheckStatus = "UP" | "DOWN" | "UNKNOWN";

interface CheckLog {
  status: CheckStatus;
  checkedAt: string;
}

interface Monitor {
  id: string;
  name: string;
  url: string;
  interval: number;
  active: boolean;
  telegramChatId: string | null;
  lastStatus: CheckStatus | null;
  lastStatusCode: number | null;
  lastResponseMs: number | null;
  lastCheckedAt: string | null;
  uptimePercent: number | null;
  checkLogs: CheckLog[];
}

interface Stats {
  totalMonitors: number;
  upCount: number;
  downCount: number;
  avgUptime: number;
}

interface Props {
  user: { name: string; email: string; image: string | null };
  monitors: Monitor[];
  stats: Stats;
}

const INTERVAL_LABELS: Record<number, string> = {
  1: "1 хв",
  5: "5 хв",
  10: "10 хв",
  60: "1 год",
  300: "5 год",
};

export default function DashboardClient({ user, monitors: initial, stats }: Props) {
  const [monitors, setMonitors] = useState<Monitor[]>(initial);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити монітор?")) return;
    const res = await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMonitors((m) => m.filter((x) => x.id !== id));
      toast.success("Монітор видалено");
    } else {
      toast.error("Помилка видалення");
    }
  };

  const handleToggle = async (monitor: Monitor) => {
    const res = await fetch(`/api/monitors/${monitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !monitor.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMonitors((m) => m.map((x) => (x.id === monitor.id ? { ...x, active: updated.active } : x)));
      toast.success(updated.active ? "Монітор увімкнено" : "Монітор зупинено");
    }
  };

  const onMonitorAdded = (newMonitor: Monitor) => {
    setMonitors((m) => [newMonitor, ...m]);
    setShowAddModal(false);
    toast.success("Монітор додано!");
  };

  const liveStats = {
    totalMonitors: monitors.length,
    upCount: monitors.filter((m) => m.lastStatus === "UP").length,
    downCount: monitors.filter((m) => m.lastStatus === "DOWN").length,
    avgUptime:
      monitors.length > 0
        ? monitors.reduce((s, m) => s + (m.uptimePercent ?? 100), 0) / monitors.length
        : 100,
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar glass" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none", borderLeft: "none" }}>
        <div className="sidebar-logo">
          <span className="logo-dot" style={{ width: 10, height: 10, background: "var(--color-primary)", borderRadius: "50%", boxShadow: "0 0 12px var(--color-primary)", display: "inline-block" }} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>UptimeAgent</span>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active">
            <Activity size={16} />
            Монітори
          </a>
          <a href="/dashboard/reports" className="nav-item">
            <TrendingUp size={16} />
            Звіти
          </a>
          <a href="/dashboard/settings" className="nav-item">
            <Settings size={16} />
            Налаштування
          </a>
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
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            title="Вийти"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Моніторинг сайтів</h1>
            <p className="page-subtitle">
              {monitors.length > 0
                ? `${monitors.length} ${monitors.length === 1 ? "монітор" : "моніторів"} активні`
                : "Додайте перший монітор"}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Додати монітор
          </button>
        </header>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card fade-in-up">
            <div className="stat-icon stat-icon--total">
              <Globe size={20} />
            </div>
            <div className="stat-value">{liveStats.totalMonitors}</div>
            <div className="stat-label">Усього моніторів</div>
          </div>

          <div className="stat-card fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="stat-icon stat-icon--up">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-value" style={{ color: "var(--color-success)" }}>{liveStats.upCount}</div>
            <div className="stat-label">Онлайн</div>
          </div>

          <div className="stat-card fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="stat-icon stat-icon--down">
              <AlertTriangle size={20} />
            </div>
            <div className="stat-value" style={{ color: "var(--color-danger)" }}>{liveStats.downCount}</div>
            <div className="stat-label">Недоступні</div>
          </div>

          <div className="stat-card fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="stat-icon stat-icon--uptime">
              <TrendingUp size={20} />
            </div>
            <div className="stat-value">{liveStats.avgUptime.toFixed(1)}%</div>
            <div className="stat-label">Середній аптайм</div>
          </div>
        </div>

        {/* Monitors list */}
        {monitors.length === 0 ? (
          <div className="empty-state glass fade-in-up">
            <Activity size={48} style={{ color: "var(--color-primary)", opacity: 0.6 }} />
            <h2>Немає моніторів</h2>
            <p>Додайте перший сайт для відстеження доступності</p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Додати монітор
            </button>
          </div>
        ) : (
          <div className="monitors-grid">
            {monitors.map((monitor, i) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                index={i}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add monitor modal */}
      {showAddModal && (
        <AddMonitorModal
          onClose={() => setShowAddModal(false)}
          onAdded={onMonitorAdded}
        />
      )}

      <style jsx>{`
        .dashboard-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
        }

        .sidebar {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          border-right: 1px solid var(--color-border);
          background: rgba(10, 10, 20, 0.9);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px 24px;
          font-weight: 700;
          font-size: 16px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }

        .nav-item:hover, .nav-item.active {
          background: rgba(99, 102, 241, 0.12);
          color: var(--color-text);
        }

        .nav-item.active { color: var(--color-primary-light); }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 8px 8px;
          border-top: 1px solid var(--color-border);
          margin-top: auto;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid var(--color-border);
        }

        .user-info { flex: 1; min-width: 0; }
        .user-name { font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-email { font-size: 11px; color: var(--color-text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-subtle);
          padding: 6px;
          border-radius: 6px;
          transition: background 0.15s, color 0.15s;
          display: flex;
        }
        .btn-icon:hover { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }

        .dashboard-main {
          padding: 32px 36px;
          max-width: 1200px;
          overflow-x: hidden;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .page-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--color-text-muted);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        @media (max-width: 900px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .stat-icon--total { background: rgba(99, 102, 241, 0.12); color: var(--color-primary-light); }
        .stat-icon--up { background: var(--color-success-glow); color: var(--color-success); }
        .stat-icon--down { background: var(--color-danger-glow); color: var(--color-danger); }
        .stat-icon--uptime { background: rgba(245, 158, 11, 0.12); color: var(--color-warning); }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .monitors-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 40px;
          text-align: center;
        }

        .empty-state h2 { font-size: 20px; font-weight: 700; color: var(--color-text); }
        .empty-state p { color: var(--color-text-muted); font-size: 14px; }
      `}</style>
    </div>
  );
}

// ─── Monitor Card ─────────────────────────────────────────────────────────────

function MonitorCard({
  monitor,
  index,
  onDelete,
  onToggle,
}: {
  monitor: Monitor;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (m: Monitor) => void;
}) {
  const status = monitor.lastStatus ?? "UNKNOWN";
  const badgeClass =
    status === "UP" ? "badge-up" : status === "DOWN" ? "badge-down" : "badge-unknown";

  // Build uptime bar from last 90 checks
  const ticks = monitor.checkLogs.slice(0, 90).reverse();

  return (
    <div
      className="monitor-card glass fade-in-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="mc-header">
        <div className="mc-info">
          <div className="mc-title">
            <span className={status === "UP" ? "pulse-up" : status === "DOWN" ? "pulse-down" : ""} style={{ width: 8, height: 8, borderRadius: "50%", background: status === "UP" ? "var(--color-success)" : status === "DOWN" ? "var(--color-danger)" : "var(--color-text-subtle)", display: "inline-block", flexShrink: 0 }} />
            <span className="mc-name">{monitor.name}</span>
            <span className={badgeClass}>{status}</span>
          </div>
          <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="mc-url">
            {monitor.url}
          </a>
        </div>

        <div className="mc-actions">
          <div className="mc-meta">
            <span className="mc-meta-item">
              <Clock size={12} />
              {INTERVAL_LABELS[monitor.interval] ?? `${monitor.interval}хв`}
            </span>
            {monitor.lastResponseMs != null && (
              <span className="mc-meta-item">
                <Activity size={12} />
                {monitor.lastResponseMs}мс
              </span>
            )}
            {monitor.uptimePercent != null && (
              <span className="mc-meta-item" style={{ color: monitor.uptimePercent >= 99 ? "var(--color-success)" : monitor.uptimePercent >= 95 ? "var(--color-warning)" : "var(--color-danger)" }}>
                <TrendingUp size={12} />
                {monitor.uptimePercent.toFixed(1)}%
              </span>
            )}
          </div>

          <button
            className="btn-icon"
            onClick={() => onToggle(monitor)}
            title={monitor.active ? "Зупинити" : "Увімкнути"}
          >
            {monitor.active ? (
              <ToggleRight size={20} style={{ color: "var(--color-primary-light)" }} />
            ) : (
              <ToggleLeft size={20} style={{ color: "var(--color-text-subtle)" }} />
            )}
          </button>

          <button className="btn-icon" onClick={() => onDelete(monitor.id)} title="Видалити">
            <Trash2 size={15} style={{ color: "var(--color-danger)" }} />
          </button>
        </div>
      </div>

      {/* Uptime bar */}
      {ticks.length > 0 && (
        <div className="mc-uptime-bar uptime-bar" title="Останні перевірки (ліво = давніше)">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="uptime-tick"
              style={{
                background:
                  tick.status === "UP"
                    ? "var(--color-success)"
                    : tick.status === "DOWN"
                    ? "var(--color-danger)"
                    : "var(--color-text-subtle)",
                opacity: 0.7 + (i / ticks.length) * 0.3,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .monitor-card {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .mc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .mc-info { flex: 1; min-width: 0; }

        .mc-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }

        .mc-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
        }

        .mc-url {
          font-size: 13px;
          color: var(--color-text-muted);
          text-decoration: none;
          transition: color 0.15s;
        }
        .mc-url:hover { color: var(--color-primary-light); }

        .mc-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .mc-meta {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .mc-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .mc-uptime-bar {
          height: 24px;
        }
      `}</style>
    </div>
  );
}

// ─── Add Monitor Modal ────────────────────────────────────────────────────────

function AddMonitorModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (m: Monitor) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    interval: "5",
    telegramChatId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          interval: form.interval,
          telegramChatId: form.telegramChatId || null,
        }),
      });

      if (res.ok) {
        const monitor = await res.json();
        onAdded(monitor);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Помилка створення");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass fade-in-up">
        <div className="modal-header">
          <h2 className="modal-title">Новий монітор</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="input-label" htmlFor="mon-name">Назва монітора</label>
            <input
              id="mon-name"
              className="input"
              placeholder="Мій сайт"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="mon-url">URL сайту</label>
            <input
              id="mon-url"
              className="input"
              placeholder="https://example.com"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="mon-interval">Інтервал перевірки</label>
            <select
              id="mon-interval"
              className="input"
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              style={{ cursor: "pointer" }}
            >
              <option value="1">Кожну 1 хв</option>
              <option value="5">Кожні 5 хв</option>
              <option value="10">Кожні 10 хв</option>
              <option value="60">Кожну 1 год</option>
              <option value="300">Кожні 5 год</option>
            </select>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="mon-tg">
              Telegram Chat ID{" "}
              <span style={{ color: "var(--color-text-subtle)", fontWeight: 400 }}>(необов'язково)</span>
            </label>
            <input
              id="mon-tg"
              className="input"
              placeholder="-1001234567890"
              value={form.telegramChatId}
              onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
            />
            <span style={{ fontSize: 12, color: "var(--color-text-subtle)", marginTop: 4, display: "block" }}>
              Додайте вашого бота до каналу/групи та вкажіть ID чату
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              ) : (
                <Plus size={16} />
              )}
              {loading ? "Збереження…" : "Додати монітор"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 24px;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          padding: 28px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
