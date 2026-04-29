import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import type { CheckStatus } from "@/generated/prisma";

interface CheckResult {
  status: CheckStatus;
  statusCode: number | null;
  responseMs: number | null;
  errorMessage: string | null;
}

export async function checkMonitor(monitorId: string): Promise<void> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
  });

  if (!monitor || !monitor.active) return;

  const previousStatus = monitor.lastStatus;
  const result = await performCheck(monitor.url);

  // Save log
  await prisma.checkLog.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      statusCode: result.statusCode,
      responseMs: result.responseMs,
      errorMessage: result.errorMessage,
    },
  });

  // Update monitor last status
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastCheckedAt: new Date(),
      lastStatus: result.status,
      lastStatusCode: result.statusCode,
      lastResponseMs: result.responseMs,
    },
  });

  // Recalculate uptime (last 24h)
  await recalculateUptime(monitorId);

  // Send Telegram alert on status change
  if (monitor.telegramChatId) {
    const statusChanged = previousStatus !== result.status;
    const wentDown = result.status === "DOWN" && previousStatus !== "DOWN";
    const cameUp = result.status === "UP" && previousStatus === "DOWN";

    if (wentDown) {
      await sendTelegramAlert(monitor.telegramChatId, {
        type: "DOWN",
        monitorName: monitor.name,
        url: monitor.url,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        responseMs: result.responseMs,
      });
    } else if (cameUp) {
      await sendTelegramAlert(monitor.telegramChatId, {
        type: "UP",
        monitorName: monitor.name,
        url: monitor.url,
        statusCode: result.statusCode,
        responseMs: result.responseMs,
      });
    }
  }
}

async function performCheck(url: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      validateStatus: () => true, // don't throw on any status code
      headers: {
        "User-Agent": "UptimeAgent/1.0 (+https://uptime-agent.vercel.app)",
      },
    });

    const responseMs = Date.now() - start;
    const statusCode = response.status;
    const isUp = statusCode >= 200 && statusCode < 400;

    return {
      status: isUp ? "UP" : "DOWN",
      statusCode,
      responseMs,
      errorMessage: isUp ? null : `HTTP ${statusCode}`,
    };
  } catch (error: unknown) {
    const responseMs = Date.now() - start;
    let errorMessage = "Unknown error";
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") errorMessage = "Timeout (>15s)";
      else errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      status: "DOWN",
      statusCode: null,
      responseMs,
      errorMessage,
    };
  }
}

async function recalculateUptime(monitorId: string): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await prisma.checkLog.findMany({
    where: { monitorId, checkedAt: { gte: since } },
    select: { status: true },
  });

  if (logs.length === 0) return;

  const upCount = logs.filter((l) => l.status === "UP").length;
  const uptimePercent = (upCount / logs.length) * 100;

  await prisma.monitor.update({
    where: { id: monitorId },
    data: { uptimePercent: Math.round(uptimePercent * 100) / 100 },
  });
}

export async function scanSeoSnapshot(monitorId: string): Promise<void> {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
  if (!monitor) return;

  try {
    const start = Date.now();
    const response = await axios.get(monitor.url, {
      timeout: 20000,
      headers: { "User-Agent": "UptimeAgent-SEO/1.0" },
    });

    const $ = cheerio.load(response.data as string);

    const title = $("title").first().text().trim() || null;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || null;
    const h1 = $("h1").first().text().trim() || null;
    const canonical = $('link[rel="canonical"]').attr("href") || null;
    const ogImage = $('meta[property="og:image"]').attr("content") || null;

    const bodyText = $("body").text();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    const internalLinks = $("a[href]").filter((_, el) => {
      const href = $(el).attr("href") || "";
      return (
        href.startsWith("/") ||
        href.startsWith(monitor.url) ||
        !href.startsWith("http")
      );
    }).length;

    // Check robots.txt and sitemap
    const baseUrl = new URL(monitor.url).origin;
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/robots.txt`, { timeout: 5000, validateStatus: () => true }),
      axios.get(`${baseUrl}/sitemap.xml`, { timeout: 5000, validateStatus: () => true }),
    ]);

    const hasRobotsTxt =
      robotsRes.status === "fulfilled" && robotsRes.value.status === 200;
    const hasSitemap =
      sitemapRes.status === "fulfilled" && sitemapRes.value.status === 200;

    await prisma.seoSnapshot.create({
      data: {
        monitorId,
        title,
        metaDescription,
        h1,
        canonical,
        ogImage,
        wordCount,
        internalLinks,
        hasRobotsTxt,
        hasSitemap,
      },
    });
  } catch (error) {
    console.error(`[SEO Scan] Failed for ${monitor.url}:`, error);
  }
}
