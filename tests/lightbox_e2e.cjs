const fs = require("fs");
const path = require("path");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const url = process.env.E2E_URL || "http://127.0.0.1:8767/blog/byovd-reloaded/";
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = process.env.E2E_OUT || ".";
const runId = process.env.E2E_RUN || "1";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".article-body figure img", { timeout: 10000 });

  const closedPath = path.join(outDir, `page-lightbox-closed-run${runId}.png`);
  await page.screenshot({ path: closedPath, fullPage: false });

  const before = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
  }));

  const clicked = await page.evaluate(() => {
    const img = document.querySelector(".article-body figure img");
    if (!img) return null;
    const src = img.getAttribute("src");
    img.click();
    return src;
  });
  if (!clicked) throw new Error("no article figure img to click");

  await page.waitForSelector("#image-lightbox.is-open", { timeout: 5000 });

  const openState = await page.evaluate(() => {
    const overlay = document.getElementById("image-lightbox");
    const img = overlay && overlay.querySelector(".image-lightbox-frame img");
    const backdrop = overlay && overlay.querySelector(".image-lightbox-backdrop");
    const cs = backdrop ? getComputedStyle(backdrop) : null;
    return {
      href: location.href,
      pathname: location.pathname,
      hidden: overlay ? overlay.hidden : null,
      openClass: overlay ? overlay.classList.contains("is-open") : false,
      overlaySrc: overlay ? overlay.getAttribute("data-src") : null,
      imgSrc: img ? img.getAttribute("src") : null,
      backdropBg: cs ? cs.backgroundColor : null,
      backdropFilter: cs ? cs.backdropFilter || cs.webkitBackdropFilter : null,
      overlayDisplay: overlay ? getComputedStyle(overlay).display : null,
    };
  });

  const openPath = path.join(outDir, `page-lightbox-open-run${runId}.png`);
  await page.screenshot({ path: openPath, fullPage: false });

  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => {
      const overlay = document.getElementById("image-lightbox");
      return overlay && !overlay.classList.contains("is-open");
    },
    { timeout: 5000 },
  );

  const afterEsc = await page.evaluate(() => ({
    href: location.href,
    open: document.getElementById("image-lightbox").classList.contains("is-open"),
    hidden: document.getElementById("image-lightbox").hidden,
  }));

  // reopen and dismiss via backdrop
  await page.evaluate(() => document.querySelector(".article-body figure img").click());
  await page.waitForSelector("#image-lightbox.is-open", { timeout: 5000 });
  await page.evaluate(() => document.querySelector(".image-lightbox-backdrop").click());
  await page.waitForFunction(
    () => !document.getElementById("image-lightbox").classList.contains("is-open"),
    { timeout: 5000 },
  );

  const afterBackdrop = await page.evaluate(() => ({
    href: location.href,
    open: document.getElementById("image-lightbox").classList.contains("is-open"),
  }));

  await browser.close();

  const report = {
    runId,
    errors,
    clicked,
    before,
    openState,
    afterEsc,
    afterBackdrop,
    screenshots: { closed: closedPath, open: openPath },
  };

  const fail = [];
  if (errors.length) fail.push("page-errors:" + errors.join("|"));
  if (!before.pathname.includes("/blog/byovd-reloaded/")) fail.push("start-url");
  if (openState.pathname !== before.pathname) fail.push("url-changed-on-open");
  if (openState.pathname.endsWith(".png")) fail.push("navigated-to-png");
  if (!openState.openClass) fail.push("overlay-not-open");
  if (openState.overlaySrc !== clicked) fail.push("src-mismatch");
  if (openState.overlayDisplay === "none") fail.push("overlay-not-visible");
  const bg = openState.backdropBg || "";
  if (!bg.includes("rgba(5, 5, 5") && !bg.includes("rgba(5,5,5") && !bg.startsWith("rgb(5, 5, 5")) {
    // darkened: alpha < 1
    if (!/rgba\(\s*5\s*,\s*5\s*,\s*5\s*,/.test(bg)) fail.push("backdrop-not-dark:" + bg);
  }
  if (afterEsc.open) fail.push("escape-did-not-close");
  if (afterEsc.href !== before.href) fail.push("url-changed-on-escape");
  if (afterBackdrop.open) fail.push("backdrop-did-not-close");

  report.ok = fail.length === 0;
  report.fail = fail;
  fs.writeFileSync(path.join(outDir, `lightbox-e2e-run${runId}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
