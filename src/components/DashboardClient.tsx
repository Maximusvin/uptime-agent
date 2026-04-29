"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Plus,
  Globe,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";

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

export default function DashboardClient({ user, monitors: initial }: Props) {
  const [monitors, setMonitors] = useState<Monitor[]>(initial);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

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

  const handleManualCheck = async (id: string) => {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setMonitors((m) => m.map((x) => (x.id === id ? updated : x)));
        toast.success("Перевірку завершено");
      } else {
        toast.error("Помилка перевірки");
      }
    } catch (e) {
      toast.error("Не вдалося запустити перевірку");
    } finally {
      setCheckingId(null);
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
      <Sidebar user={user} />

      <main className="dashboard-main">
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
                isChecking={checkingId === monitor.id}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onCheck={handleManualCheck}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddMonitorModal
          onClose={() => setShowAddModal(false)}
          onAdded={onMonitorAdded}
        />
      )}
    </div>
  );
}

function MonitorCard({
  monitor,
  index,
  isChecking,
  onDelete,
  onToggle,
  onCheck,
}: {
  monitor: Monitor;
  index: number;
  isChecking: boolean;
  onDelete: (id: string) => void;
  onToggle: (m: Monitor) => void;
  onCheck: (id: string) => void;
}) {
  const status = monitor.lastStatus ?? "UNKNOWN";
  const badgeClass =
    status === "UP" ? "badge-up" : status === "DOWN" ? "badge-down" : "badge-unknown";
  const ticks = (monitor.checkLogs || []).slice(0, 90).reverse();

  return (
    <div className="monitor-card glass fade-in-up" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="mc-header">
        <div className="mc-info">
          <div className="mc-title">
            <span className={status === "UP" ? "pulse-up" : status === "DOWN" ? "pulse-down" : ""} style={{ width: 8, height: 8, borderRadius: "50%", background: status === "UP" ? "var(--color-success)" : status === "DOWN" ? "var(--color-danger)" : "var(--color-text-subtle)", display: "inline-block", flexShrink: 0 }} />
            <span className="mc-name">{monitor.name}</span>
            <span className={badgeClass}>{status}</span>
          </div>
          <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="mc-url">{monitor.url}</a>
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

          <button className="btn-icon" onClick={() => onCheck(monitor.id)} disabled={isChecking} title="Запустити аналіз зараз">
            {isChecking ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} style={{ color: "var(--color-primary-light)" }} />}
          </button>

          <button className="btn-icon" onClick={() => onToggle(monitor)} title={monitor.active ? "Зупинити" : "Увімкнути"}>
            {monitor.active ? <ToggleRight size={20} style={{ color: "var(--color-primary-light)" }} /> : <ToggleLeft size={20} style={{ color: "var(--color-text-subtle)" }} />}
          </button>

          <button className="btn-icon" onClick={() => onDelete(monitor.id)} title="Видалити">
            <Trash2 size={15} style={{ color: "var(--color-danger)" }} />
          </button>
        </div>
      </div>

      {ticks.length > 0 && (
        <div className="mc-uptime-bar uptime-bar" title="Останні перевірки">
          {ticks.map((tick, i) => (
            <div key={i} className="uptime-tick" style={{ background: tick.status === "UP" ? "var(--color-success)" : tick.status === "DOWN" ? "var(--color-danger)" : "var(--color-text-subtle)", opacity: 0.7 + (i / ticks.length) * 0.3 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddMonitorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (m: Monitor) => void }) {
  const [form, setForm] = useState({ name: "", url: "", interval: "5", telegramChatId: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interval: form.interval }),
      });
      if (res.ok) onAdded(await res.json());
      else toast.error("Помилка створення");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass fade-in-up">
        <div className="modal-header">
          <h2 className="modal-title">Новий монітор</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="input-label">Назва монітора</label>
            <input className="input" placeholder="Мій сайт" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="input-label">URL сайту</label>
            <input className="input" placeholder="https://example.com" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="input-label">Інтервал перевірки</label>
            <select className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
              <option value="1">1 хв</option>
              <option value="5">5 хв</option>
              <option value="10">10 хв</option>
              <option value="60">1 год</option>
              <option value="300">5 год</option>
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">Telegram Chat ID (необов'язково)</label>
            <input className="input" placeholder="-100..." value={form.telegramChatId} onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Скасувати</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Збереження..." : "Додати монітор"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
