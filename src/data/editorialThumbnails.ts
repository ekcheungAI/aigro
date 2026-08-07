import type { InsightCategory } from "@/data/insights";

/**
 * Shared editorial image system. Keeping this mapping in the data layer makes
 * card art predictable across Home, Insights details, and future collections.
 */
export const EDITORIAL_THUMBNAILS: Record<InsightCategory, string> = {
  模型發布: "/editorial/thumbnails/model-network.jpg",
  產品發布: "/editorial/thumbnails/product-console.jpg",
  行業動態: "/editorial/thumbnails/market-signals.jpg",
  論文研究: "/editorial/thumbnails/research-evidence.jpg",
  觀點與技巧: "/editorial/thumbnails/prompt-workflow.jpg",
};

const THUMBNAIL_POOLS: Record<InsightCategory, string[]> = {
  模型發布: [EDITORIAL_THUMBNAILS.模型發布, "/editorial/thumbnails/research-evidence.jpg"],
  產品發布: [EDITORIAL_THUMBNAILS.產品發布, "/editorial/thumbnails/prompt-workflow.jpg"],
  行業動態: [
    EDITORIAL_THUMBNAILS.行業動態,
    "/editorial/thumbnails/hong-kong-adoption.jpg",
    "/editorial/thumbnails/growth-loop.jpg",
    "/editorial/thumbnails/agent-delivery.jpg",
  ],
  論文研究: [EDITORIAL_THUMBNAILS.論文研究, "/editorial/thumbnails/model-network.jpg"],
  觀點與技巧: [EDITORIAL_THUMBNAILS.觀點與技巧, "/editorial/thumbnails/growth-loop.jpg"],
};

export function editorialThumbnailFor(category: InsightCategory, seed = ""): string {
  const pool = THUMBNAIL_POOLS[category];
  if (!seed) return pool[0];
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return pool[hash % pool.length];
}
