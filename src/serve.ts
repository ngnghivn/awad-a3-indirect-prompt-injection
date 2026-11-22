/** npm run serve : open the test pages in a browser, and see exactly what text the agent receives. */
import { loadDataset } from "./dataset.ts";
import { htmlToText } from "./extract.ts";
import { PAGE_ORIGIN } from "./paths.ts";
import { startPageServer } from "./server.ts";

const ds = loadDataset();
await startPageServer(ds);
console.log(`Test pages: ${PAGE_ORIGIN}/  (Ctrl+C to stop)\n`);
for (const c of ds.cases) console.log(`${c.id.padEnd(24)} ${c.url}`);
if (process.argv[2]) {
  const c = ds.cases.find((x) => x.id === process.argv[2]);
  if (c) console.log(`\n--- text the agent sees for ${c.id} ---\n${htmlToText(c.html)}`);
}
