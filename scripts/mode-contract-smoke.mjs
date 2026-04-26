#!/usr/bin/env node

/**
 * Mode contract smoke checks for frontend2/backend wiring.
 *
 * Focus:
 * - frontend_scoring: SSE + /api/time + timeline + health reachability
 * - offline: explicit expectation (no backend dependency for gameplay)
 */

const rawBase = process.env.SSE_BASE_URL || process.env.API_BASE_URL || "http://localhost:50510";
const baseUrl = rawBase.replace(/\/+$/, "");

const checks = [];

const runCheck = async (name, fn) => {
  try {
    const result = await fn();
    checks.push({ name, ok: true, detail: result || "ok" });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const fetchJson = async (url, init = {}, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { res, json, text };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHeadersOnly = async (url, init = {}, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const assertOk = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  console.log(`[mode-contract] baseUrl=${baseUrl}`);

  // Automated checks for frontend_scoring wiring
  await runCheck("health endpoint (/api/health)", async () => {
    const { res, json } = await fetchJson(`${baseUrl}/api/health`);
    assertOk(res.ok, `HTTP ${res.status}`);
    assertOk(json && typeof json.status === "string", "missing status in response");
    return `status=${json.status}`;
  });

  await runCheck("clock sync endpoint (/api/time)", async () => {
    const { res, json } = await fetchJson(`${baseUrl}/api/time`);
    assertOk(res.ok, `HTTP ${res.status}`);
    assertOk(json && Number.isFinite(Number(json.serverTime)), "missing serverTime");
    return `serverTime=${json.serverTime}`;
  });

  const probeQuestionId = `smoke-${Date.now()}`;

  await runCheck("timeline open endpoint", async () => {
    const body = {
      questionId: probeQuestionId,
      questionIndex: 0,
      clientOpenedAt: Date.now(),
      approxServerOpenedAt: Date.now(),
    };
    const { res, json } = await fetchJson(`${baseUrl}/api/quiz/timeline/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assertOk(res.ok, `HTTP ${res.status}`);
    assertOk(json && json.success === true, "timeline open did not return success=true");
    return `serverOpenedAt=${json.serverOpenedAt}`;
  });

  await runCheck("timeline close endpoint", async () => {
    const body = {
      questionId: probeQuestionId,
      clientClosedAt: Date.now(),
      approxServerClosedAt: Date.now(),
    };
    const { res, json } = await fetchJson(`${baseUrl}/api/quiz/timeline/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assertOk(res.ok, `HTTP ${res.status}`);
    assertOk(json && json.success === true, "timeline close did not return success=true");
    return `serverClosedAt=${json.serverClosedAt}`;
  });

  await runCheck("SSE endpoint (/sse)", async () => {
    const res = await fetchHeadersOnly(`${baseUrl}/sse`, {}, 5000);
    assertOk(res.ok, `HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    assertOk(
      contentType.includes("text/event-stream"),
      `unexpected content-type: ${contentType || "<empty>"}`
    );
    try {
      await res.body?.cancel();
    } catch {
      // ignore stream cancel errors in smoke check
    }
    return `content-type=${contentType}`;
  });

  // Offline contract is mostly frontend behavior; keep as explicit checklist output.
  console.log("[mode-contract] offline checklist:");
  console.log("- Set app mode to 'offline'.");
  console.log("- Start quiz and verify gameplay works without backend services running.");
  console.log("- Verify no SSE/API error toasts appear during question open/reveal/close.");

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;

  for (const c of checks) {
    const status = c.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${c.name} :: ${c.detail}`);
  }

  if (failed > 0) {
    console.error(`[mode-contract] ${failed}/${checks.length} checks failed.`);
    process.exit(1);
  }

  console.log(`[mode-contract] all ${checks.length} automated checks passed.`);
};

run().catch((err) => {
  console.error("[mode-contract] fatal:", err);
  process.exit(1);
});
