import { describe, expect, it } from "vitest";
import {
  EDITORIAL_THUMBNAILS,
  editorialThumbnailFor,
} from "@/data/editorialThumbnails";

describe("editorialThumbnailFor", () => {
  it("returns the standard thumbnail assigned to each category", () => {
    for (const [category, thumbnail] of Object.entries(EDITORIAL_THUMBNAILS)) {
      expect(editorialThumbnailFor(category as keyof typeof EDITORIAL_THUMBNAILS)).toBe(
        thumbnail
      );
    }
  });
});
