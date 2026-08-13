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

export function editorialThumbnailFor(category: InsightCategory): string {
  return EDITORIAL_THUMBNAILS[category];
}
