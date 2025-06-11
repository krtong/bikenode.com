#!/usr/bin/env node
/*  scrape available years from the “Year” filter for each maker  */

import fs                from "fs/promises";
import { Stagehand }     from "@browserbasehq/stagehand";
import "dotenv/config.js";

/* ---------- config ---------- */
const MAKER_IDS = [
  "3t","addmotor","aegis","airborne","airdrop","alchemy","allcity","allied",
  "alutech","amego","amflow","ancheer","antidote","apollo","arc8","argon18",
  "argonaut","ari","arielrider","atherton","aurai","aventon","banshee",
  "barracuda","basis","basso","batchbicycles","batribike","bearclaw","benno",
  "berria","bianchi","biktrix","bird","blix","bluejay","bmc","boardman","bold",
  "bombtrack","borealis","bpmimports","breezer","bridgebikeworks","brodie",
  "brompton","brooklynbicycleco","bulls","bunchbikes","buzz","byocycles",
  "c3strom","cairn","calibre","californiabicyclefactory","canfield",
  "cannondale","canyon","carqon","carver","casati","cero","cervelo","charge",
  "chromag","cinelli","cipollini","civibikes","claudbutler","cleary","colnago",
  "commencal","comotion","condor","coop","corima","corratec","cortina",
  "cowboy","crussis","cube","cuda","curve","cycleofgood","dallingridge",
  "dartmoor","dassi","dawes","delsol","denago","denver","deviate","devinci",
  "diamant","diamondback","dinobikes","dmr","dolan","dost","eahora",
  "earlyrider","earlyriderlimited","eddymerckx","eg","ejoe","electra",
  "electricbikecompany","electricbiketechnologies","ellsworth","elops","elux",
  "eminent","emojo","emubikes","engwe","enve","enzoebikes","esker","espin",
  "eunorau","evelo","evil","evobicycles","factor","fairdale","falcon",
  "fantic","fara","faraday","felt","festka","fezzari","flx","flyerbyradioflyer",
  "foes","fondriest","forbidden","forestal","forme","forth","framed",
  "freespirit","frog","fthpower","fuji","furosystems","garneau","garyfisher",
  "gasgas","gazelle","geometron","gepida","ghost","giant","globber","gocycle",
  "gopower","growlerbikes","gt","guerrillagravity","guru","haro","head",
  "himiway","holdsworth","hopetechnology","hudski","huffy","husqvarna","ibis",
  "igoelectric","intense","intense951","izip","jamis","jetson","juicedbikes",
  "juliana","jupiterbike","k2","kavenz","kellys","kestrel","kettler","khs",
  "kidsrideshotgun","knolly","kona","ktm","kuota","lapierre","last","lauf",
  "lectric","lectricebikes","leecougan","lekker","lemondbicycles","libertytrike",
  "lightweight","litespeed","liteville","liv","lombardo","look","lynskey","m2s",
  "magnum","marin","masi","mason","maxfoot","mde","mec","meekboyz","merida",
  "modbikes","momentum","mondraker","mongoose","montague","moots","motiv",
  "motobecane","nakto","ncm","nicolai","niner","nireeka","norco","nordest","ns",
  "nukeproof","obed","ocoee","ohm","open","orange","orbea","orro","otso",
  "oxylane","pace","panorama","parlee","pashley","patrol","pedego","pendleton",
  "pinarello","pinnacle","pivot","pole","polygon","poseidon","premium","prevelo",
  "prime","priority","privateer","productionprivee","propain","propella","public",
  "puky","pure","pyga","qualisports","quietkat","quintanaroo","raaw","radio",
  "radpowerbikes","ragley","raleigh","rambobikes","rattan","redline","reeb",
  "reid","revel","revolve","ride1up","ridgeback","ridley",  "rieseandmuller",
  "ritchey","riva","riverside","rizebikes","rockrider","rockymountain","rondo",
  "roodog","rossignol","rsd","sage","salsa","santacruz","sava","scamp","schwinn",
  "scor","scott","sensa","serial1","sherpa","silverback","skorpion","soma",
  "sonder","sondors","soulfastebikes","sparkbikes","sparkcycleworks","spawn",
  "specialized","spot","stanton","statebicycleco","stilus","strider","stromer",
  "super73","superior","surface604","surly","synergy","tenways","tern","thesis",
  "thoemus","thok","time","titus","tommaso","toutterrain","tower","trailcraft",
  "transition","trek","trifox","tumbleweed","tunturi","turboant","turner",
  "urbanarrow","urbandrivestyle","urtopia","vaast","vandessel","vanmoof",
  "vannicholas","vbike","velec","ventum","verde","viathon","vielo","viking",
  "vintageelectric","vitus","voltbike","voodoo","votec","vvolt","areone","whyte",
  "wiggins","wildsyde","wilier","wisper","woom","xn","xtracycle","yamaha","yeti",
  "yt"
];  // add more here
const NAV_DELAY   =  800;   // ms after each navigation
const MAKER_DELAY = 1200;   // ms after each maker (extra delay)
const SEL_MENU    = 'div[role="dialog"]';               // popup container

/* ---------- helpers ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- set-up ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("✖  OPENAI_API_KEY missing"); process.exit(1);
}
const stage = new Stagehand({ env: "LOCAL", apiKey: process.env.OPENAI_API_KEY });
await stage.init();
const page = stage.page;

/* ---------- load existing data ---------- */
let makerYears = {};
try {
  const existingData = await fs.readFile("maker_years.json", "utf8");
  makerYears = JSON.parse(existingData);
  console.log(`📂 Loaded existing data for ${Object.keys(makerYears).length} makers`);
} catch (err) {
  console.log("📄 Starting with empty maker_years.json");
}

/* ---------- scrape ---------- */

for (const makerId of MAKER_IDS) {
  console.log(`\n========== ${makerId.toUpperCase()} ==========`);

  // Skip if we already have data for this maker
  if (makerYears[makerId] && makerYears[makerId].length > 0) {
    console.log(`  ✅ Already have ${makerYears[makerId].length} years - skipping`);
    continue;
  }

  try {
    await page.goto(`https://99spokes.com/bikes?makerId=${makerId}`, {
      waitUntil: "networkidle",
      timeout  : 30_000
    });
    await sleep(NAV_DELAY);

    /* wait until a Year pill is present anywhere */
    const yearPill = page.locator('button:has-text("Year")').first();
    await yearPill.waitFor({ state: "visible", timeout: 10_000 });

    /* ensure it’s scrolled into view, then click */
    await yearPill.scrollIntoViewIfNeeded();
    await yearPill.click();
    
    /* wait a moment for dropdown to appear */
    await sleep(500);

    /* wait for the menu itself to render */
    await page.waitForSelector(SEL_MENU, { state: "visible", timeout: 10_000 });

    /* extract 4-digit years from the labels inside the menu */
    const years = await page.$$eval(
      `${SEL_MENU} label`,
      nodes => [...new Set(
        nodes
          .map(n => n.textContent.match(/\b(19|20)\d{2}\b/)?.[0])
          .filter(Boolean)
      )].sort()
    );
    
    /* also try other selectors if labels don't work */
    if (years.length === 0) {
      const altYears = await page.$$eval(
        `${SEL_MENU} *`,
        nodes => [...new Set(
          nodes
            .map(n => n.textContent?.match(/\b(19|20)\d{2}\b/)?.[0])
            .filter(Boolean)
        )].sort()
      );
      console.log('  → alternative extraction found:', altYears);
      years.push(...altYears);
    }

    console.log(
      years.length
        ? `→ years: ${years.join(", ")}`
        : "→ (no Year options found)"
    );
    makerYears[makerId] = years;

    /* close the menu (escape key) */
    await page.keyboard.press("Escape").catch(() => {});
  } catch (err) {
    console.log("  ! failed →", err.message.split("\n")[0]);
    makerYears[makerId] = [];
  }

  await sleep(MAKER_DELAY + Math.random() * 700);  // polite pause
}

/* ---------- save & exit ---------- */
await fs.writeFile("maker_years.json", JSON.stringify(makerYears, null, 2));
console.log("\n✅  Saved maker_years.json");
await stage.close();
process.exit(0);
