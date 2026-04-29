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
  History,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";

type CheckStatus = "UP" | "DOWN" | "UNKNOWN";

interface CheckLog {
  status: CheckStatus;
  checkedAt: string;
}

interface SeoSnapshot {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  internalLinks: number | null;
  brokenLinks: number | null;
  brokenUrls: string[] | null;
  foundUrls: string[] | null;
  newUrls: string[] | null;
  snapshotAt: string;
  hasRobotsTxt: boolean | null;
  hasSitemap: boolean | null;
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
  seoSnapshots?: SeoSnapshot[];
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
  const [showResult, setShowResult] = useState<Monitor | null>(null);
  const [historyMonitor, setHistoryMonitor] = useState<Monitor | null>(null);
  const [historySnapshots, setHistorySnapshots] = useState<SeoSnapshot[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
        setShowResult(updated);
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

  const handleViewHistory = async (monitor: Monitor) => {
    setHistoryMonitor(monitor);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/monitors/${monitor.id}/history`);
      if (res.ok) {
        setHistorySnapshots(await res.json());
      }
    } finally {
      setLoadingHistory(false);
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
                onViewHistory={handleViewHistory}
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

      {showResult && (
        <CheckResultModal
          monitor={showResult}
          onClose={() => setShowResult(null)}
        />
      )}

      {historyMonitor && (
        <HistoryModal
          monitor={historyMonitor}
          snapshots={historySnapshots}
          loading={loadingHistory}
          onClose={() => setHistoryMonitor(null)}
        />
      )}
    </div>
  );
}

function CheckResultModal({ monitor, onClose }: { monitor: Monitor, onClose: () => void }) {
  const lastSnapshot = monitor.seoSnapshots?.[0];
  
  const getHref = (url: string) => {
    if (url.startsWith('tel:') || url.startsWith('mailto:')) return url;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass fade-in-up" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Результат перевірки: {monitor.name}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="result-grid">
          <div className="result-item">
            <div className="result-label">Статус</div>
            <div className={`result-value ${monitor.lastStatus === 'UP' ? 'text-success' : 'text-danger'}`}>
              {monitor.lastStatus === 'UP' ? 'Доступний' : 'Недоступний'}
            </div>
          </div>
          <div className="result-item">
            <div className="result-label">Час відповіді</div>
            <div className="result-value">{monitor.lastResponseMs} мс</div>
          </div>
          <div className="result-item">
            <div className="result-label">HTTP Код</div>
            <div className="result-value">{monitor.lastStatusCode || '—'}</div>
          </div>
          <div className="result-item">
            <div className="result-label">Аптайм (24г)</div>
            <div className="result-value">{monitor.uptimePercent?.toFixed(1)}%</div>
          </div>
        </div>

        {lastSnapshot && (
          <div className="seo-results">
            <h3 className="section-title">SEO Аналіз</h3>
            
            {lastSnapshot.newUrls && lastSnapshot.newUrls.length > 0 && (
              <div className="new-pages-alert glass" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                <div className="alert-header">
                  <FileSearch size={16} className="text-primary" />
                  <span>Виявлено {lastSnapshot.newUrls.length} нових сторінок!</span>
                </div>
                <div className="new-urls-list" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {lastSnapshot.newUrls.map((url, i) => (
                    <div key={i} className="new-url-item">
                      <ArrowRight size={10} />
                      <a href={getHref(url)} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastSnapshot.brokenUrls && lastSnapshot.brokenUrls.length > 0 && (
              <div className="new-pages-alert glass" style={{ borderLeft: '3px solid var(--color-danger)', marginTop: 12 }}>
                <div className="alert-header">
                  <AlertTriangle size={16} className="text-danger" />
                  <span className="text-danger">Виявлено {lastSnapshot.brokenUrls.length} битих посилань!</span>
                </div>
                <div className="new-urls-list" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {lastSnapshot.brokenUrls.map((url, i) => (
                    <div key={i} className="new-url-item">
                      <X size={10} className="text-danger" />
                      <a href={getHref(url)} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: 'var(--color-danger)', textDecoration: 'none' }}>
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div className="seo-grid">
              <div className="seo-item">
                <div className="result-label">Title</div>
                <div className="result-value small">{lastSnapshot.title || 'Відсутній'}</div>
              </div>
              <div className="seo-item">
                <div className="result-label">H1</div>
                <div className="result-value small">{lastSnapshot.h1 || 'Відсутній'}</div>
              </div>
              <div className="seo-item">
                <div className="result-label">Слів на сторінці</div>
                <div className="result-value">{lastSnapshot.wordCount || 0}</div>
              </div>
              <div className="seo-item">
                <div className="result-label">Внутрішні лінки</div>
                <div className="result-value">
                  {lastSnapshot.internalLinks || 0}
                  {lastSnapshot.brokenLinks != null && lastSnapshot.brokenLinks > 0 && (
                    <span className="text-danger" style={{ fontSize: 11, marginLeft: 8 }}>
                      ({lastSnapshot.brokenLinks} битих)
                    </span>
                  )}
                  {lastSnapshot.brokenLinks === 0 && (
                    <span className="text-success" style={{ fontSize: 11, marginLeft: 8 }}>
                      (всі ок)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="seo-checks">
              <div className="check-item">
                {lastSnapshot.hasRobotsTxt ? <CheckCircle2 size={14} className="text-success" /> : <AlertTriangle size={14} className="text-warning" />}
                <span>robots.txt</span>
              </div>
              <div className="check-item">
                {lastSnapshot.hasSitemap ? <CheckCircle2 size={14} className="text-success" /> : <AlertTriangle size={14} className="text-warning" />}
                <span>sitemap.xml</span>
              </div>
              <div className="check-item">
                {lastSnapshot.metaDescription ? <CheckCircle2 size={14} className="text-success" /> : <AlertTriangle size={14} className="text-warning" />}
                <span>Meta Description</span>
              </div>
              <div className="check-item">
                {lastSnapshot.brokenLinks === 0 ? <CheckCircle2 size={14} className="text-success" /> : (lastSnapshot.brokenLinks ? <AlertTriangle size={14} className="text-danger" /> : <Clock size={14} />)}
                <span>Перевірка посилань</span>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>Зрозуміло</button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ 
  monitor, 
  snapshots, 
  loading, 
  onClose 
}: { 
  monitor: Monitor; 
  snapshots: SeoSnapshot[]; 
  loading: boolean;
  onClose: () => void;
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SeoSnapshot | null>(null);

  const getHref = (url: string) => {
    if (url.startsWith('tel:') || url.startsWith('mailto:')) return url;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass fade-in-up" style={{ maxWidth: 800, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Історія перевірок: {monitor.name}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="history-layout">
          <div className="history-sidebar">
            {loading ? (
              <div className="loading-state"><Loader2 className="animate-spin" /></div>
            ) : snapshots.length === 0 ? (
              <div className="empty-history">Історія порожня</div>
            ) : (
              <div className="snapshot-list">
                {snapshots.map((s) => (
                  <button 
                    key={s.snapshotAt} 
                    className={`snapshot-item ${selectedSnapshot?.snapshotAt === s.snapshotAt ? 'active' : ''}`}
                    onClick={() => setSelectedSnapshot(s)}
                  >
                    <div className="snapshot-date">
                      {new Date(s.snapshotAt).toLocaleString("uk-UA", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </div>
                    <div className="snapshot-meta">
                      {s.internalLinks} сторінок
                      {s.newUrls && s.newUrls.length > 0 && (
                        <span className="new-badge">+{s.newUrls.length}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="history-content">
            {selectedSnapshot ? (
              <div className="snapshot-details fade-in">
                <div className="details-header">
                  <h3>Деталі за {new Date(selectedSnapshot.snapshotAt).toLocaleString()}</h3>
                </div>
                
                <div className="details-scrollable">
                  <div className="metrics-row">
                    <div className="metric-box">
                      <span className="label">Слів</span>
                      <span className="value">{selectedSnapshot.wordCount}</span>
                    </div>
                    <div className="metric-box">
                      <span className="label">Посилань</span>
                      <span className="value">{selectedSnapshot.internalLinks}</span>
                    </div>
                    <div className="metric-box">
                      <span className="label">Битих</span>
                      <span className="value text-danger">{selectedSnapshot.brokenLinks || 0}</span>
                    </div>
                  </div>

                  {selectedSnapshot.newUrls && selectedSnapshot.newUrls.length > 0 && (
                    <div className="diff-section">
                      <h4>Нові сторінки (+{selectedSnapshot.newUrls.length})</h4>
                      <div className="url-list" style={{ maxHeight: '150px' }}>
                        {selectedSnapshot.newUrls.map((url, i) => (
                          <a key={i} href={getHref(url)} target="_blank" rel="noopener noreferrer" className="url-item new hover:underline">
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSnapshot.brokenUrls && selectedSnapshot.brokenUrls.length > 0 && (
                    <div className="diff-section">
                      <h4 style={{ color: 'var(--color-danger)' }}>Биті посилання ({selectedSnapshot.brokenUrls.length})</h4>
                      <div className="url-list" style={{ maxHeight: '150px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {selectedSnapshot.brokenUrls.map((url, i) => (
                          <a key={i} href={getHref(url)} target="_blank" rel="noopener noreferrer" className="url-item hover:underline" style={{ color: 'var(--color-danger)' }}>
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="diff-section">
                    <h4>Структура сайту ({selectedSnapshot.foundUrls?.length || 0})</h4>
                      <div className="url-list" style={{ maxHeight: '300px' }}>
                        {selectedSnapshot.foundUrls && Array.isArray(selectedSnapshot.foundUrls) ? (
                          selectedSnapshot.foundUrls.map((url, i) => (
                            <a key={i} href={getHref(url)} target="_blank" rel="noopener noreferrer" className="url-item hover:underline">
                              {url}
                            </a>
                          ))
                        ) : (
                          <div className="url-item">Дані відсутні або ще не проскановані</div>
                        )}
                      </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="select-prompt">Оберіть перевірку зі списку зліва</div>
            )}
          </div>
        </div>
      </div>
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
  onViewHistory,
}: {
  monitor: Monitor;
  index: number;
  isChecking: boolean;
  onDelete: (id: string) => void;
  onToggle: (m: Monitor) => void;
  onCheck: (id: string) => void;
  onViewHistory: (m: Monitor) => void;
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

           <button className="btn-icon" onClick={() => onViewHistory(monitor)} title="Історія перевірок">
            <History size={16} style={{ color: "var(--color-primary-light)" }} />
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
