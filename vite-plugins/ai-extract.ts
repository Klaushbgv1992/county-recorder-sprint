/**
 * Vite dev plugin: mount POST /api/extract in the dev server.
 *
 * This is a development-only surface — `vite build` produces static
 * assets and has no server. For a staging / interview demo, run
 * `npm run dev` and the handler is live.
 *
 * To ship to a real backend, re-export runExtraction from a serverless
 * entrypoint (Vercel / Netlify / Cloudflare) — the handler is framework
 * free and consumes only a `recordingNumber` + an emit function.
 */
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { runExtraction } from "../server/ai-extract-handler";

const API_PATH = "/api/extract";

function loadEnvLocal(): void {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendLine(res: ServerResponse, payload: unknown): void {
  res.write(JSON.stringify(payload) + "\n");
}

export function aiExtractPlugin(): Plugin {
  return {
    name: "county-recorder:ai-extract",
    configureServer(server: ViteDevServer) {
      loadEnvLocal();
      server.middlewares.use(API_PATH, async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          res.end("Method Not Allowed");
          return;
        }
        if (!process.env.ANTHROPIC_API_KEY) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "ANTHROPIC_API_KEY missing. Create .env.local with ANTHROPIC_API_KEY=sk-... and restart `npm run dev`.",
            }),
          );
          return;
        }

        let body: { recordingNumber?: unknown };
        try {
          body = (await readJsonBody(req)) as { recordingNumber?: unknown };
        } catch (err) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Invalid JSON body: ${(err as Error).message}` }));
          return;
        }

        const recordingNumber =
          typeof body.recordingNumber === "string" ? body.recordingNumber.trim() : "";

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        // Helpful for some proxies / reverse proxies (nginx) during local demo.
        res.setHeader("X-Accel-Buffering", "no");

        await runExtraction(
          { recordingNumber },
          (event) => {
            sendLine(res, event);
          },
        );
        res.end();
      });
    },
  };
}
