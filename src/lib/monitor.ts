import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import type { CheckStatus } from "@/generated/prisma";


async function getSslInfo(url: string): Promise<{ validUntil: Date | null, issuer: string | null }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return resolve({ validUntil: null, issuer: null });
      }
      const hostname = parsedUrl.hostname;
      const req = https.request({
        hostname,
        port: 443,
        method: "GET",
        rejectUnauthorized: false,
        timeout: 5000,
      }, (res) => {
        const cert = (res.socket as any).getPeerCertificate();
        if (cert && cert.valid_to) {
          resolve({
            validUntil: new Date(cert.valid_to),
            issuer: cert.issuer?.O || cert.issuer?.CN || "Unknown"
          });
        } else {
          resolve({ validUntil: null, issuer: null });
        }
      });
      req.on("error", () => resolve({ validUntil: null, issuer: null }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ validUntil: null, issuer: null });
      });
      req.end();
    } catch {
      resolve({ validUntil: null, issuer: null });
    }
  });
}

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
  const [result, sslInfo] = await Promise.all([
    performCheck(monitor.url),
    getSslInfo(monitor.url)
  ]);

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

  // Update monitor last status and SSL
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastCheckedAt: new Date(),
      lastStatus: result.status,
      lastStatusCode: result.statusCode,
      lastResponseMs: result.responseMs,
      sslValidUntil: sslInfo.validUntil,
      sslIssuer: sslInfo.issuer,
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
    const contentHash = crypto.createHash("md5").update(bodyText).digest("hex");


    // Track keywords
    const keywordsToTrack = monitor.keywords?.split(",").map(k => k.trim()).filter(Boolean) || [];
    const keywordsFound: Record<string, boolean> = {};
    const textToSearch = (title + " " + metaDescription + " " + h1 + " " + bodyText).toLowerCase();
    
    keywordsToTrack.forEach(kw => {
      keywordsFound[kw] = textToSearch.includes(kw.toLowerCase());
    });

    const internalLinksList = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        if (
          href.startsWith("/") ||
          href.startsWith(monitor.url) ||
          !href.startsWith("http")
        ) {
          try {
            return new URL(href, monitor.url).href;
          } catch {
            return null;
          }
        }
        return null;
      })
      .get()
      .filter((link, index, self) => link && self.indexOf(link) === index) as string[];

    // Track assets (images, scripts, styles)
    const assetsList: string[] = [];
    $("img[src], script[src], link[rel='stylesheet']").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("href");
      if (src) {
        try {
          assetsList.push(new URL(src, monitor.url).href);
        } catch {}
      }
    });

    const brokenUrlsList: string[] = [];
    const brokenAssetsList: string[] = [];

    // Limit checks to avoid timeouts
    const internalLinksToCheck = internalLinksList.slice(0, 15);
    const assetsToCheck = [...new Set(assetsList)].slice(0, 15);
    
    const checkResource = async (url: string, isAsset: boolean) => {
      try {
        const res = await axios.head(url, { 
          timeout: 4000, 
          validateStatus: () => true,
          headers: { "User-Agent": "UptimeAgent-Checker/1.0" }
        });
        if (res.status >= 400) {
          if (isAsset) brokenAssetsList.push(url);
          else brokenUrlsList.push(url);
        }
      } catch {
        if (isAsset) brokenAssetsList.push(url);
        else brokenUrlsList.push(url);
      }
    };

    // Parallel checks
    await Promise.all([
      ...internalLinksToCheck.map(url => checkResource(url, false)),
      ...assetsToCheck.map(url => checkResource(url, true))
    ]);

    // Check robots.txt and sitemap
    const baseUrl = new URL(monitor.url).origin;
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/robots.txt`, { timeout: 3000, validateStatus: () => true }),
      axios.get(`${baseUrl}/sitemap.xml`, { timeout: 3000, validateStatus: () => true }),
    ]);

    const hasRobotsTxt =
      robotsRes.status === "fulfilled" && robotsRes.value.status === 200;
    const hasSitemap =
      sitemapRes.status === "fulfilled" && sitemapRes.value.status === 200;

    // Detect new pages by comparing with last snapshot
    const lastSnapshot = await prisma.seoSnapshot.findFirst({
      where: { monitorId },
      orderBy: { snapshotAt: "desc" },
    }).catch(() => null);

    const previousUrls = new Set((lastSnapshot?.foundUrls as string[]) || []);
    const newUrlsList = internalLinksList.filter(url => !previousUrls.has(url));

    try {
      await prisma.seoSnapshot.create({
        data: {
          monitorId,
          title,
          metaDescription,
          h1,
          canonical,
          ogImage,
          wordCount,
          internalLinks: internalLinksCount,
          brokenLinks: brokenUrlsList.length,
          brokenUrls: brokenUrlsList,
          brokenAssets: brokenAssetsList.length,
          brokenAssetsList: brokenAssetsList,
          contentHash,
          foundUrls: internalLinksList,

          newUrls: newUrlsList,
          keywordsFound: keywordsFound,
          hasRobotsTxt,
          hasSitemap,
        },
      });
    } catch (dbError) {
      console.error("[SEO Scan] Database save failed. Fallback triggered.", dbError);
      // Fallback
      await prisma.seoSnapshot.create({
        data: {
          monitorId,
          title,
          metaDescription,
          h1,
          canonical,
          ogImage,
          wordCount,
          internalLinks: internalLinksCount,
          brokenLinks: brokenUrlsList.length,
          hasRobotsTxt,
          hasSitemap,
        } as any,
      }).catch(e => console.error("[SEO Scan] Fallback save also failed:", e));
    }



  } catch (error) {
    console.error(`[SEO Scan] Failed for ${monitor.url}:`, error);
  }
}



