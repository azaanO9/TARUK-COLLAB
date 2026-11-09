import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const OUTPUT_DIR = "C:/Users/azaan/Documents/ChatGPT/Azaan College/six-shifts/outputs";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Launching headless Chrome on port", PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1280,1200",
    "http://127.0.0.1:5173/",
  ]);

  await wait(2500);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json`);
    const pages = await listRes.json();
    const page = pages.find((p) => p.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, (res) => resolve(res.result));
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    async function evaluate(fnStr) {
      const res = await send("Runtime.evaluate", {
        expression: `(${fnStr})()`,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    }

    async function screenshot(name) {
      await wait(1200);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(res.data, "base64");
      const filePath = path.join(OUTPUT_DIR, name);
      await fs.writeFile(filePath, buf);
      console.log(`Saved screenshot: ${filePath} (${buf.length} bytes)`);
    }

    // 1. Click to enter design
    console.log("Entering design studio...");
    await evaluate(`() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Enter Satellite Design Studio"));
      btn?.click();
    }`);
    await wait(1500);

    // 2. Click confirm design & launch
    console.log("Confirming design & launching to orbit...");
    await evaluate(`() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm Design & Launch"));
      btn?.click();
    }`);
    await wait(1500);

    // 3. Play through turns 1 to 6
    for (let turn = 1; turn <= 6; turn++) {
      console.log(`--- TURN ${turn} ---`);

      // Find available choice and click
      const selectedTitle = await evaluate(`() => {
        const choices = Array.from(document.querySelectorAll(".choices button:not(:disabled)"));
        if (choices.length > 0) {
          // Prefer sun/charge or science if affordable
          const c = choices.find(el => el.textContent.includes("Sun") || el.textContent.includes("Recharge") || el.textContent.includes("downlink")) || choices[0];
          c.click();
          return c.querySelector("strong")?.textContent;
        }
        return null;
      }`);
      console.log(`Turn ${turn}: Selected choice: "${selectedTitle}"`);
      await wait(800);

      // Execute maneuver
      const executed = await evaluate(`() => {
        const execBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Execute Orbit Maneuver"));
        if (execBtn && !execBtn.disabled) {
          execBtn.click();
          return true;
        }
        return false;
      }`);
      console.log(`Turn ${turn}: Maneuver executed: ${executed}`);
      await wait(1500);

      if (turn < 6) {
        // Click Continue
        const nextTurn = turn + 1;
        const cont = await evaluate(`() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue to Orbit"));
          if (btn) {
            btn.click();
            return btn.textContent.trim();
          }
          return null;
        }`);
        console.log(`Turn ${turn}: Clicked continue: "${cont}"`);
        await wait(1500);
      } else {
        // Turn 6: Click "See Final Mission Results"
        console.log("Turn 6 consequence reached! Clicking 'See Final Mission Results'...");
        const finalBtn = await evaluate(`() => {
          const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("See Final Mission Results"));
          if (btn) {
            btn.click();
            return btn.textContent.trim();
          }
          return null;
        }`);
        console.log(`Clicked: "${finalBtn}"`);
        await wait(2000);
      }
    }

    // Now on Screen 4: Results & Design Comparison!
    const resultsHeading = await evaluate(`() => document.querySelector(".results-screen h1")?.textContent`);
    console.log("Results screen heading:", resultsHeading);

    await screenshot("downlink-screen4-results.png");

    // Also capture mobile version of results
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1000);
    await screenshot("downlink-mobile-results.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
