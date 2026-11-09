import { spawn } from "node:child_process";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9226;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
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

    const evalFn = async (code) =>
      (await send("Runtime.evaluate", { expression: code, returnByValue: true }))
        .result?.value;

    console.log("Initial H1:", await evalFn("document.querySelector('h1')?.textContent"));
    await evalFn("document.querySelector('.cyan-button')?.click()");
    await wait(1000);
    console.log("After Click 1 H1:", await evalFn("document.querySelector('h1')?.textContent"));

    const btnInfo = await evalFn(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Confirm Design'));
      return b ? { text: b.textContent, disabled: b.disabled } : null;
    })()`);
    console.log("Launch button:", btnInfo);

    await evalFn(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Confirm Design'));
      b?.click();
    })()`);
    await wait(1000);

    console.log("After Launch H1:", await evalFn("document.querySelector('h1')?.textContent"));
    const choicesCount = await evalFn("document.querySelectorAll('.choices button').length");
    console.log("Choices count on Screen 3:", choicesCount);

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
