import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9227;
const OUTPUT_DIR = "C:/Users/azaan/Documents/ChatGPT/Azaan College/six-shifts/outputs";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--window-size=1280,1200",
    "http://127.0.0.1:5173/",
  ]);

  await wait(2000);

  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = list.find((p) => p.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let id = 1;
    const send = (method, params = {}) =>
      new Promise((r) => {
        const cur = id++;
        const handler = (e) => {
          const m = JSON.parse(e.data);
          if (m.id === cur) {
            ws.removeEventListener("message", handler);
            r(m.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: cur, method, params }));
      });

    await send("Page.enable");
    await send("Runtime.enable");

    const evalFn = async (code) =>
      (await send("Runtime.evaluate", { expression: code, returnByValue: true }))
        .result?.value;

    async function screenshot(name) {
      await wait(1000);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(res.data, "base64");
      const filePath = path.join(OUTPUT_DIR, name);
      await fs.writeFile(filePath, buf);
      console.log(`Saved screenshot: ${filePath} (${buf.length} bytes)`);
    }

    // Capture Screen 1: Briefing
    console.log("Capturing Screen 1: Briefing");
    await screenshot("downlink-screen1-briefing.png");

    // Advance to Screen 2: Design
    await evalFn("document.querySelector('.cyan-button')?.click()");
    await wait(1000);

    console.log("Capturing Screen 2: Design Studio");
    await screenshot("downlink-screen2-design.png");

    // Launch into Screen 3: Operations
    await evalFn(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Confirm Design'));
      b?.click();
    })()`);
    await wait(1500);

    console.log("Capturing Screen 3: Operations (Orbit 1 Choosing)");
    await screenshot("downlink-screen3-operations-choosing.png");

    // Select first choice
    await evalFn(`document.querySelector(".choices button:not(:disabled)")?.click()`);
    await wait(600);

    // Execute choice
    await evalFn(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Execute Orbit Maneuver'));
      b?.click();
    })()`);
    await wait(1200);

    console.log("Capturing Screen 3: Operations (Orbit 1 Consequence)");
    await screenshot("downlink-screen3-operations-consequence.png");

    // Advance through Orbits 2 to 6
    for (let orbit = 2; orbit <= 6; orbit++) {
      console.log(`Advancing to Orbit ${orbit}...`);
      await evalFn(`(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Continue to Orbit'));
        b?.click();
      })()`);
      await wait(1200);

      // Select an affordable choice
      const selected = await evalFn(`(() => {
        const choices = Array.from(document.querySelectorAll('.choices button:not(:disabled)'));
        if (choices.length > 0) {
          const c = choices[0];
          c.click();
          return c.querySelector('strong')?.textContent;
        }
        return null;
      })()`);
      console.log(`  Selected in Orbit ${orbit}:`, selected);
      await wait(600);

      // Execute maneuver
      await evalFn(`(() => {
        const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Execute Orbit Maneuver'));
        b?.click();
      })()`);
      await wait(1200);
    }

    // On Orbit 6 consequence, click "See Final Mission Results"
    console.log("Reaching mission end. Clicking 'See Final Mission Results'...");
    await evalFn(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('See Final Mission Results'));
      b?.click();
    })()`);
    await wait(2000);

    const resultsH1 = await evalFn("document.querySelector('h1')?.textContent");
    console.log("Screen 4 Results Heading:", resultsH1);

    console.log("Capturing Screen 4: Results & Design Comparison");
    await screenshot("downlink-screen4-results.png");

    // Capture mobile version of results
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

run().catch(console.error);
