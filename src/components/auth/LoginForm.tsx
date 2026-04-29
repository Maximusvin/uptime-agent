"use client";

import { signIn } from "next-auth/react";
import { ShieldCheck, Zap, Bell, BarChart2 } from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Zap,
    label: "Моніторинг 24/7",
    desc: "Перевірка кожну хвилину, 5 хв, 1 год",
  },
  {
    icon: Bell,
    label: "Telegram-сповіщення",
    desc: "Миттєві алерти у канал чи групу",
  },
  {
    icon: BarChart2,
    label: "Щоденні звіти",
    desc: "Автоматичний ранковий звіт за добу",
  },
  {
    icon: ShieldCheck,
    label: "SEO-аналіз",
    desc: "Title, meta, H1, robots, sitemap",
  },
];

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="signin-page">
      {/* Background grid */}
      <div className="grid-bg" aria-hidden="true" />

      <div className="signin-container">
        {/* Left panel */}
        <div className="signin-left fade-in-up">
          <div className="signin-logo">
            <span className="logo-dot" />
            <span className="logo-text">UptimeAgent</span>
          </div>

          <h1 className="signin-title">
            Моніторинг вашого&nbsp;
            <span className="gradient-text">сайту</span>
            <br />
            без зупинки
          </h1>
          <p className="signin-subtitle">
            Відстежуйте доступність, отримуйте миттєві Telegram‑сповіщення та
            щоденні SEO‑звіти — все в одному місці.
          </p>

          <ul className="feature-list">
            {features.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="feature-item fade-in-up">
                <div className="feature-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="feature-label">{label}</div>
                  <div className="feature-desc">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right panel — auth card */}
        <div className="signin-right fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="auth-card glass">
            <div className="auth-card-header">
              <div className="signin-logo" style={{ justifyContent: "center" }}>
                <span className="logo-dot" />
                <span className="logo-text">UptimeAgent</span>
              </div>
              <h2 className="auth-card-title">Вхід до кабінету</h2>
              <p className="auth-card-subtitle">
                Увійдіть за допомогою вашого Google‑акаунту
              </p>
            </div>

            <button
              id="google-signin-btn"
              className="btn-google"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <GoogleIcon />
              )}
              {loading ? "Завантаження…" : "Продовжити через Google"}
            </button>

            <p className="auth-terms">
              Входячи, ви погоджуєтесь з умовами використання сервісу.
              Ваші дані захищені Google OAuth 2.0.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(99, 102, 241, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .signin-container {
          max-width: 1000px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 60px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .signin-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .signin-left { display: none; }
        }

        .signin-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }

        .logo-dot {
          width: 10px;
          height: 10px;
          background: var(--color-primary);
          border-radius: 50%;
          box-shadow: 0 0 12px var(--color-primary);
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text);
        }

        .signin-title {
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 16px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #6366f1, #a78bfa, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .signin-subtitle {
          font-size: 16px;
          line-height: 1.65;
          color: var(--color-text-muted);
          margin-bottom: 36px;
        }

        .feature-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          min-width: 36px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary-light);
        }

        .feature-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 2px;
        }

        .feature-desc {
          font-size: 13px;
          color: var(--color-text-muted);
        }

        /* Auth card */
        .auth-card {
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .auth-card-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-card-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .auth-card-subtitle {
          font-size: 14px;
          color: var(--color-text-muted);
        }

        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-inter);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.1s;
          margin-bottom: 20px;
        }

        .btn-google:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          transform: translateY(-1px);
        }

        .btn-google:active { transform: translateY(0); }
        .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

        .auth-terms {
          font-size: 12px;
          color: var(--color-text-subtle);
          text-align: center;
          line-height: 1.6;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
