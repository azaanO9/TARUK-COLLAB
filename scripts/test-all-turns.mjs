import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const OUTPUT_DIR = "C:/Users/azaan/Documents/ChatGPT/Azaan College/six-shifts/outputs";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1280,1200",
    "http://127.0.0.1:5173/",
  ]);

  await wait(2000);

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

    async function evaluate(code) {
      const res = await send("Runtime.evaluate", {
        expression: code,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    }

    async function screenshot(name) {
      await wait(1000);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(res.data, "base64");
      const filePath = path.join(OUTPUT_DIR, name);
      await fs.writeFile(filePath, buf);
      console.log(`Saved screenshot: ${filePath} (${buf.length} bytes)`);
    }

    // Advance to design
    await evaluate(`document.querySelector("button.cyan-button")?.click()`);
    await wait(1000);

    // Click launch
    await evaluate(`
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm Design & Launch"));
      btn?.click();
    `);
    await wait(1500);

    // Now play through all 6 turns
    for (let i = 1; i <= 6; i++) {
      console.log(`Playing turn ${i}...`);
      // Select first available choice card
      const choiceSelected = await evaluate(`
        const c = document.querySelector(".choices button:not(:disabled)");
        if (c) {
          c.click();
          return c.textContent.trim().slice(0, 30);
        }
        return null;
      `);
      console.log(`  Selected choice:`, choiceSelected);
      await wait(600);

      // Click execute
      const executed = await evaluate(`
        const exec = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Execute Orbit Maneuver"));
        if (exec && !exec.disabled) {
          exec.click();
          return true;
        }
        return false;
      `);
      console.log(`  Executed:`, executed);
      await wait(1200);

      if (i < 6) {
        // Click Continue to next orbit
        const cont = await evaluate(`
          const b = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue to Orbit"));
          if (b) {
            b.click();
            return b.textContent.trim();
          }
          return null;
        `);
        console.log(`  Clicked continue:`, cont);
        await wait(1200);
      } else {
        // On turn 6, click See Final Mission Results
        console.log("Turn 6 complete. Clicking See Final Mission Results...");
        const finalBtn = await evaluate(`
          const b = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("See Final Mission Results"));
          if (b) {
            b.click();
            return b.textContent.trim();
          }
          return null;
        `);
        console.log("  Clicked final button:", finalBtn);
        await wait(2000);
      }
    }

    // Now verify screen 4
    console.log("Checking Screen 4 state...");
    const h1 = await evaluate(`document.querySelector("h1")?.textContent`);
    console.log("Current H1:", h1);

    await screenshot("downlink-screen4-results.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
