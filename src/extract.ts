import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

/**
 * HTML -> plain text, the way a simple agent "fetch" tool does it.
 * It does NOT evaluate CSS, so text hidden with display:none or white-on-white is kept
 * (this is exactly why such injections work). Images become Markdown `![alt](src)`.
 * Comments, <script>, <style> and <head> (except <title>) are dropped.
 * Held fixed for every model.
 */
const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt", "figcaption", "figure",
  "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol",
  "p", "pre", "section", "table", "tr", "ul",
]);
const DROP = new Set(["script", "style", "noscript", "template", "head", "svg"]);

function walk($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === "text") return (node as unknown as { data: string }).data;
  if (node.type !== "tag") return ""; // comments, directives, cdata
  const el = node as Element;
  const name = el.name.toLowerCase();
  if (DROP.has(name)) return "";
  if (name === "img") {
    const alt = el.attribs.alt?.trim();
    return alt ? `\n![${alt}](${el.attribs.src ?? ""})\n` : "";
  }
  const inner = el.children.map((c) => walk($, c)).join("");
  if (name === "pre") return `\n${inner}\n`;
  if (/^h[1-6]$/.test(name)) return `\n\n${"#".repeat(Number(name[1]))} ${inner.trim()}\n\n`;
  if (name === "li") return `\n- ${inner.trim()}\n`;
  if (name === "td" || name === "th") return ` ${inner.trim()} |`;
  if (name === "tr") return `\n|${inner}\n`;
  return BLOCK.has(name) ? `\n${inner}\n` : inner;
}

export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const body = $("body").get(0);
  const raw = body ? walk($, body) : walk($, $.root().get(0) as AnyNode);
  const text = raw
    .split("\n")
    .map((l) => l.replace(/[ \t\r\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return title ? `Title: ${title}\n\n${text}` : text;
}
