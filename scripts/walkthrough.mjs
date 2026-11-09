import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9228;
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
      await wait(1200);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(res.data, "base64");
      const filePath = path.join(OUTPUT_DIR, name);
      await fs.writeFile(filePath, buf);
      console.log(`Saved screenshot: ${filePath} (${buf.length} bytes)`);
    }

    console.log("1. Screen 1 - Briefing");
    console.log("   H1:", await evalFn("document.querySelector('h1')?.textContent"));
    await screenshot("downlink-screen1-briefing.png");

    console.log("2. Navigating to Screen 2 - Design");
    await evalFn(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Enter Satellite Design Studio'));
      btn?.click();
    })()`);
    await wait(1500);
    console.log("   H1:", await evalFn("document.querySelector('h1')?.textContent"));
    await screenshot("downlink-screen2-design.png");

    console.log("3. Launching into Screen 3 - Operations");
    await evalFn(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Design & Launch'));
      btn?.click();
    })()`);
    await wait(1500);
    console.log("   Scenario:", await evalFn("document.querySelector('.mission-panel h2')?.textContent"));
    await screenshot("downlink-screen3-operations-choosing.png");

    // Execute Orbit 1
    console.log("4. Selecting and executing Orbit 1 choice");
    await evalFn(`(() => {
      const c = document.querySelector('.choices button:not(:disabled)');
      c?.click();
    })()`);
    await wait(800);
    await evalFn(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Execute Orbit Maneuver'));
      btn?.click();
    })()`);
    await wait(1500);
    console.log("   Consequence:", await evalFn("document.querySelector('.consequence h2')?.textContent"));
    await screenshot("downlink-screen3-operations-consequence.png");

    // Advance through Orbits 2 to 6
    for (let orbit = 2; orbit <= 6; orbit++) {
      console.log(`5.${orbit}. Advancing to Orbit ${orbit}`);
      await evalFn(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue to Orbit'));
        btn?.click();
      })()`);
      await wait(1500);

      // Select first available choice
      const choiceTitle = await evalFn(`(() => {
        const c = document.querySelector('.choices button:not(:disabled)');
        if (c) {
          c.click();
          return c.querySelector('strong')?.textContent;
        }
        return null;
      })()`);
      console.log(`   Orbit ${orbit} selected:`, choiceTitle);
      await wait(800);

      // Execute maneuver
      await evalFn(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Execute Orbit Maneuver'));
        btn?.click();
      })()`);
      await wait(1500);
      console.log(`   Orbit ${orbit} consequence:`, await evalFn("document.querySelector('.consequence h2')?.textContent"));
    }

    // Now on Orbit 6 consequence, click "See Final Mission Results"
    console.log("6. Clicking 'See Final Mission Results'");
    await evalFn(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('See Final Mission Results'));
      btn?.click();
    })()`);
    await wait(2000);

    console.log("7. Screen 4 - Results");
    console.log("   H1:", await evalFn("document.querySelector('h1')?.textContent"));
    await screenshot("downlink-screen4-results.png");

    // Capture mobile version
    console.log("8. Capturing mobile layout");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1200);
    await screenshot("downlink-mobile-results.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
