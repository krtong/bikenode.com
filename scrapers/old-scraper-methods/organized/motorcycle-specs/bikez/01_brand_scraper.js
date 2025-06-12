#!/usr/bin/env node
/**
 * Validate maker IDs by checking that the URL
 *   https://99spokes.com/bikes?makerId=<id>
 * **does not return HTTP 404**.
 *
 * – One request every 3 s (polite crawl, ~19 min for 381 IDs)
 * – Writes three files to ./out/:
 *     • valid_makers.txt
 *     • invalid_makers.txt
 *     • maker_validation_results.txt
 */

const { Stagehand } = require("@browserbasehq/stagehand");
const fs             = require("fs/promises");
const path           = require("path");

// ──────────────── CONFIG ────────────────
const INPUT_FILE      = "./maker_ids.txt";
const OUT_DIR         = "./out";
const VALID_FILE      = path.join(OUT_DIR, "valid_makers.txt");
const INVALID_FILE    = path.join(OUT_DIR, "invalid_makers.txt");
const SUMMARY_FILE    = path.join(OUT_DIR, "maker_validation_results.txt");

const NAV_TIMEOUT_MS  = 20_000;   // page.goto timeout
const DELAY_MS        = 3_000;    // pause between requests

// ──────────────── HELPERS ───────────────
const log   = (m) => process.stdout.write(`[${new Date().toISOString()}] ${m}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ──────────────── CORE CHECK ─────────────
async function urlIs404(page, url) {
  const resp = await page.goto(url, { timeout: NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
  return resp?.status() === 404;
}

// ──────────────── MAIN ──────────────────
(async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const makerIds = (await fs.readFile(INPUT_FILE, "utf8"))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  log(`Validating ${makerIds.length} maker IDs (3 s delay)…`);

  const stagehand = new Stagehand({ env: "LOCAL", verbose: 0 });
  await stagehand.init().then(() => log("Stagehand ready"));

  const valid   = [];
  const invalid = [];

  for (let i = 0; i < makerIds.length; i++) {
    const id  = makerIds[i];
    const url = `https://99spokes.com/bikes?makerId=${id}`;

    log(`${i + 1}/${makerIds.length}: ${id}`);

    try {
      const notFound = await urlIs404(stagehand.page, url);
      if (notFound) {
        invalid.push(id);
        log(`  ❌ 404`);
      } else {
        valid.push(id);
        log(`  ✅ OK`);
      }
    } catch (err) {
      invalid.push(id);
      log(`  ❌ error — ${err.message.split("\n")[0]}`);
    }

    if (i < makerIds.length - 1) await sleep(DELAY_MS);
  }

  await fs.writeFile(VALID_FILE,   valid.join("\n"));
  await fs.writeFile(INVALID_FILE, invalid.join("\n"));

  const summary = `MAKER ID VALIDATION RESULTS
Valid:   ${valid.length}
Invalid: ${invalid.length}
Total:   ${makerIds.length}

Valid makers:
${valid.join("\n")}

Invalid makers:
${invalid.join("\n")}
`;
  await fs.writeFile(SUMMARY_FILE, summary);

  log("\nDONE");
  log(`Valid:   ${valid.length}`);
  log(`Invalid: ${invalid.length}`);
  log(`See report → ${SUMMARY_FILE}`);

  await stagehand.close();
})().catch((err) => {
  log(`Fatal: ${err.message || err}`);
  process.exit(1);
});
