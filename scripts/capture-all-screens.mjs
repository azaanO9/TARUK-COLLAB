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
  console.log("Launching headless Chrome on port", PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1280,1200",
    "http://127.0.0.1:5173/",
  ]);

  chrome.on("error", (err) => console.error("Chrome error:", err));

  // Wait for Chrome to listen
  await wait(2000);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json`);
    const pages = await listRes.json();
    const page = pages.find((p) => p.type === "page");
    if (!page) throw new Error("No page target found");

    console.log("Connecting to target:", page.title, page.webSocketDebuggerUrl);
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

    async function screenshot(name) {
      await wait(1200);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(res.data, "base64");
      const filePath = path.join(OUTPUT_DIR, name);
      await fs.writeFile(filePath, buf);
      console.log(`Saved screenshot: ${filePath} (${buf.length} bytes)`);
    }

    async function evaluate(code) {
      const res = await send("Runtime.evaluate", {
        expression: code,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    }

    // Wait for page hydration
    await wait(2000);

    // 1. Briefing Screen Screenshot
    console.log("Capturing Screen 1: Briefing");
    await screenshot("downlink-screen1-briefing.png");

    // 2. Click to enter Design Studio
    console.log("Navigating to Screen 2: Design Studio");
    await evaluate(`
      const b = Array.from(document.querySelectorAll("button")).find(el => el.textContent.includes("Enter Satellite Design Studio"));
      if (b) b.click();
    `);
    await wait(1000);

    console.log("Capturing Screen 2: Design Studio");
    await screenshot("downlink-screen2-design.png");

    // 3. Confirm Design & Launch to Orbit
    console.log("Navigating to Screen 3: Mission Operations");
    await evaluate(`
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm Design & Launch"));
      if (btn) btn.click();
    `);
    await wait(1200);

    console.log("Capturing Screen 3: Operations (Orbit 1 Choosing)");
    await screenshot("downlink-screen3-operations-choosing.png");

    // Select first choice and capture consequence
    await evaluate(`
      const choice = document.querySelector(".choices button:not(:disabled)");
      if (choice) choice.click();
    `);
    await wait(600);

    console.log("Executing Orbit 1 maneuver");
    await evaluate(`
      const execBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Execute Orbit Maneuver"));
      if (execBtn) execBtn.click();
    `);
    await wait(1200);

    console.log("Capturing Screen 3: Operations (Orbit 1 Consequence)");
    await screenshot("downlink-screen3-operations-consequence.png");

    // Play through remaining orbits (Orbit 2 to 6)
    for (let orbit = 2; orbit <= 6; orbit++) {
      console.log(`Advancing to Orbit ${orbit}...`);
      await evaluate(`
        const continueBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue to Orbit"));
        if (continueBtn) continueBtn.click();
      `);
      await wait(1200);

      // Choose an available action
      await evaluate(`
        const choices = Array.from(document.querySelectorAll(".choices button:not(:disabled)"));
        if (choices.length > 0) {
          // Click second choice or first
          const pick = choices.length > 1 ? choices[1] : choices[0];
          pick.click();
        }
      `);
      await wait(600);

      console.log(`Executing Orbit ${orbit} maneuver...`);
      await evaluate(`
        const exec = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Execute Orbit Maneuver"));
        if (exec && !exec.disabled) exec.click();
      `);
      await wait(1200);
    }

    // Now on Orbit 6 consequence, click "See Final Mission Results"
    console.log("Clicking 'See Final Mission Results'...");
    await evaluate(`
      const resultsBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("See Final Mission Results"));
      if (resultsBtn) resultsBtn.click();
    `);
    await wait(2000);

    console.log("Capturing Screen 4: Results & Design Comparison");
    await screenshot("downlink-screen4-results.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Error running script:", err);
  process.exit(1);
});
