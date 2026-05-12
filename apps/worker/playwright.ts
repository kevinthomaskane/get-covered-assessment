import { chromium, type Browser, type BrowserContext } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const STEALTH_INIT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = window.chrome ?? { runtime: {} };
`;

const NAV_TIMEOUT_MS = 30_000;

let browser: Browser | null = null;
let context: BrowserContext | null = null;

async function getContext(): Promise<BrowserContext> {
  if (context) return context;
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });
  await context.addInitScript(STEALTH_INIT);
  return context;
}

export async function renderPage(url: string): Promise<string> {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    return await page.content();
  } finally {
    await page.close();
  }
}

export async function shutdownBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}
