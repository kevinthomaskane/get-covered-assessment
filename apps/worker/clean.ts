import * as cheerio from "cheerio";

const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "img",
  "picture",
  "video",
  "audio",
  "link",
  "meta",
  "iframe",
  "canvas",
];

const AUTH_HINT_RE = /login|signin|sign[-_ ]?in|signup|sign[-_ ]?up|auth|account|password|email/i;

const TIER_TWO_CHAR_THRESHOLD = 50_000 * 4;

function stripNoise(html: string): string {
  const $ = cheerio.load(html);
  $(STRIP_SELECTORS.join(",")).remove();
  $("*")
    .contents()
    .each((_, node) => {
      if (node.type === "comment") $(node).remove();
    });
  return $.html();
}

function extractRelevantSubtrees(html: string): string {
  const $ = cheerio.load(html);
  const seen = new Set<unknown>();
  const blocks: string[] = [];

  const candidates = $("form, input, button").toArray();
  const attrMatches = $("[id], [class]")
    .filter((_, el) => {
      const id = $(el).attr("id") ?? "";
      const cls = $(el).attr("class") ?? "";
      return AUTH_HINT_RE.test(id) || AUTH_HINT_RE.test(cls);
    })
    .toArray();

  for (const el of [...candidates, ...attrMatches]) {
    const root = $(el).closest("form").get(0) ?? $(el).parent().get(0) ?? el;
    if (!root || seen.has(root)) continue;
    seen.add(root);
    blocks.push($.html(root));
  }

  return blocks.join("\n\n");
}

export function cleanHtml(rawHtml: string): {
  html: string;
  tier: 1 | 2 | 3;
} {
  const tier1 = stripNoise(rawHtml);
  if (tier1.length <= TIER_TWO_CHAR_THRESHOLD) {
    return { html: tier1, tier: 1 };
  }

  const tier2 = extractRelevantSubtrees(tier1);
  if (tier2.length === 0) {
    return { html: tier1.slice(0, TIER_TWO_CHAR_THRESHOLD), tier: 3 };
  }
  if (tier2.length <= TIER_TWO_CHAR_THRESHOLD) {
    return { html: tier2, tier: 2 };
  }
  return { html: tier2.slice(0, TIER_TWO_CHAR_THRESHOLD), tier: 3 };
}
