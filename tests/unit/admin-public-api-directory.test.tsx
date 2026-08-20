import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import AdminPublicApiDirectory from "@/components/admin/AdminPublicApiDirectory";
import type { AdminPublicApiEntry } from "@/types/publicApiDirectory";

const mocks = vi.hoisted(() => ({
  fetchAdmin: vi.fn(),
  add: vi.fn(),
  hide: vi.fn(),
  restore: vi.fn(),
}));

vi.mock("@/lib/publicApiDirectory", () => ({
  fetchAdminPublicApiDirectory: mocks.fetchAdmin,
  addPublicApiEntry: mocks.add,
  hidePublicApiEntry: mocks.hide,
  restorePublicApiEntry: mocks.restore,
}));

const baseEntry: AdminPublicApiEntry = {
  id: "87100000-0000-4000-8000-000000000001",
  name: "Published API",
  descriptionEn: "Published test",
  editorialSummaryZhHk: "已發佈測試 API。",
  category: "Development",
  useCases: ["測試"],
  authType: "No",
  httpsSupported: true,
  corsStatus: "yes",
  docsUrl: "https://published.example.test/docs",
  hkRelevance: "medium",
  sourceKind: "manual",
  sourceKey: "manual:published",
  sourceUrl: null,
  upstreamRef: null,
  reviewState: "aigro_reviewed",
  lastReviewedAt: "2026-08-20",
  status: "published",
  hiddenAt: null,
  hiddenBy: null,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

describe("admin public API directory", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.fetchAdmin.mockResolvedValue([
      baseEntry,
      {
        ...baseEntry,
        id: "87200000-0000-4000-8000-000000000002",
        name: "Hidden API",
        sourceKey: "manual:hidden",
        status: "hidden",
        hiddenAt: "2026-08-20T01:00:00.000Z",
      },
    ]);
    mocks.add.mockResolvedValue(undefined);
    mocks.hide.mockResolvedValue(undefined);
    mocks.restore.mockResolvedValue(undefined);
  });

  it("wires confirmed unpublish and restore to the backend operations", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AdminToastProvider>
        <AdminPublicApiDirectory />
      </AdminToastProvider>
    );

    await screen.findByText("Published API");
    fireEvent.click(screen.getByRole("button", { name: "下架" }));
    await waitFor(() => {
      expect(mocks.hide).toHaveBeenCalledWith(baseEntry.id);
    });

    fireEvent.click(screen.getByRole("button", { name: "恢復上架" }));
    await waitFor(() => {
      expect(mocks.restore).toHaveBeenCalledWith("87200000-0000-4000-8000-000000000002");
    });
  });

  it("submits a manually attributed reviewed API from the admin form", async () => {
    render(
      <AdminToastProvider>
        <AdminPublicApiDirectory />
      </AdminToastProvider>
    );
    await screen.findByText("Published API");

    fireEvent.click(screen.getByRole("button", { name: "新增 API" }));
    fireEvent.change(screen.getByLabelText("API 名稱"), { target: { value: "Manual API" } });
    fireEvent.change(screen.getByLabelText("官方文件 HTTPS 網址"), {
      target: { value: "https://manual.example.test/docs" },
    });
    fireEvent.change(screen.getByLabelText(/^香港中文編輯摘要/), {
      target: { value: "適合香港團隊建立自動化原型。" },
    });
    fireEvent.change(screen.getByLabelText("英文描述"), {
      target: { value: "Manual developer API" },
    });
    fireEvent.change(screen.getByLabelText("分類"), { target: { value: "Development" } });
    fireEvent.change(screen.getByLabelText(/^使用場景/), {
      target: { value: "自動化, 原型" },
    });
    fireEvent.click(screen.getByRole("button", { name: "新增並發佈" }));

    await waitFor(() => {
      expect(mocks.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Manual API",
          editorialSummaryZhHk: "適合香港團隊建立自動化原型。",
          useCases: ["自動化", "原型"],
        })
      );
    });
  });
});
