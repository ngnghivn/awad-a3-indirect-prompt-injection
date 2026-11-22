import http from "node:http";
import type { Dataset } from "./dataset.ts";
import { PAGE_PORT } from "./paths.ts";

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Serves the test pages on localhost only (the brief: injection attempts run only against our own systems).
 */
export function startPageServer(ds: Dataset, port = PAGE_PORT): Promise<http.Server> {
  const byPath = new Map(ds.cases.map((c) => [c.path, c]));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/static/pixel.png") {
      res.writeHead(200, { "content-type": "image/png" }).end(PIXEL);
      return;
    }
    if (url.pathname === "/") {
      const links = ds.cases
        .map((c) => `<li><a href="${c.path}">${c.id}</a></li>`)
        .join("\n");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
        .end(`<!doctype html><title>Test pages</title><h1>Test pages (localhost only)</h1><ul>${links}</ul>`);
      return;
    }
    const c = byPath.get(url.pathname);
    if (!c) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(c.html);
  });
  return new Promise((resolve, reject) => {
    server.once("error", (e: NodeJS.ErrnoException) =>
      reject(e.code === "EADDRINUSE" ? new Error(`Port ${port} is busy. Stop the other process or set PAGE_PORT.`) : e),
    );
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
