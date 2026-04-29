import axios from "axios";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface AlertPayload {
  type: "DOWN" | "UP";
  monitorName: string;
  url: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  responseMs?: number | null;
}

export async function sendTelegramAlert(
  chatId: string,
  payload: AlertPayload
): Promise<void> {
  const { type, monitorName, url, statusCode, errorMessage, responseMs } = payload;

  const emoji = type === "DOWN" ? "🔴" : "🟢";
  const title = type === "DOWN" ? "САЙТ НЕДОСТУПНИЙ" : "САЙТ ВІДНОВЛЕНО";
  const time = new Date().toLocaleString("uk-UA", {
    timeZone: "Europe/Kiev",
    dateStyle: "short",
    timeStyle: "medium",
  });

  let text =
    `${emoji} *${title}*\n\n` +
    `📌 *Монітор:* ${escapeMarkdown(monitorName)}\n` +
    `🌐 *URL:* ${escapeMarkdown(url)}\n` +
    `🕐 *Час:* ${time}\n`;

  if (statusCode != null) {
    text += `📊 *HTTP код:* ${statusCode}\n`;
  }
  if (responseMs != null) {
    text += `⚡ *Відповідь:* ${responseMs}мс\n`;
  }
  if (errorMessage) {
    text += `❌ *Помилка:* ${escapeMarkdown(errorMessage)}\n`;
  }

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("[Telegram] Failed to send alert:", error);
  }
}

export async function sendTelegramDailyReport(
  chatId: string,
  report: {
    date: string;
    totalMonitors: number;
    totalChecks: number;
    totalDownEvents: number;
    avgUptimePercent: number;
    monitors: Array<{
      name: string;
      url: string;
      uptime: number;
      downEvents: number;
      lastStatus: string;
    }>;
  }
): Promise<void> {
  const emoji = report.avgUptimePercent >= 99 ? "✅" : report.avgUptimePercent >= 95 ? "⚠️" : "❌";

  let text =
    `📋 *Щоденний звіт — ${report.date}*\n\n` +
    `${emoji} *Загальний аптайм:* ${report.avgUptimePercent.toFixed(2)}%\n` +
    `🌐 *Моніторів:* ${report.totalMonitors}\n` +
    `🔍 *Перевірок за добу:* ${report.totalChecks}\n` +
    `🔴 *Падінь:* ${report.totalDownEvents}\n\n` +
    `─────────────────\n`;

  for (const m of report.monitors) {
    const statusEmoji =
      m.lastStatus === "UP" ? "🟢" : m.lastStatus === "DOWN" ? "🔴" : "⚪";
    text +=
      `\n${statusEmoji} *${escapeMarkdown(m.name)}*\n` +
      `   Аптайм: ${m.uptime.toFixed(1)}% | Падінь: ${m.downEvents}\n` +
      `   ${escapeMarkdown(m.url)}\n`;
  }

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("[Telegram] Failed to send daily report:", error);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
