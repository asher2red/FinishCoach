import { beforeEach, expect, it, vi } from "vitest";
import { emptyState } from "../src/domain/model";
import { accountRepository, workspaceOf } from "../src/account/repository";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("../src/account/client", () => ({
  cloud: { auth: { getSession: mocks.getSession } },
  projectUrl: "https://example.test",
  publishableKey: "test",
}));
vi.mock("../src/account/device-storage", () => ({
  deviceStorage: { getItem: mocks.getItem, setItem: mocks.setItem },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "owner" }, access_token: "owner-token" } },
    error: null,
  });
});

it("does not create an empty cloud workspace and saves using the current revision", async () => {
  const stored = workspaceOf(emptyState());
  mocks.fetch
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json(1))
    .mockResolvedValueOnce(Response.json(null));
  const repo = accountRepository("owner");
  const state = (await repo.load())!;
  expect(state).toMatchObject(stored);
  await repo.commit(state);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);

  state.projects.push({
    id: "project",
    title: "Read a book",
    description: null,
    startedAt: "2026-11-24",
    targetDate: null,
    status: "active",
    completedAt: null,
    completionCriteria: null,
    createdAt: "2026-11-24T00:00:00.000Z",
    updatedAt: "2026-11-24T00:00:00.000Z",
    deletedAt: null,
  });
  await repo.commit(state);
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({
    expected_revision: 0,
    workspace: workspaceOf(state),
  });
  state.projects[0].title = "Read two books";
  await expect(repo.commit(state)).rejects.toThrow();
  expect(JSON.parse(mocks.fetch.mock.calls[2][1].body).expected_revision).toBe(
    1,
  );
});

it("never uses another account session to access this workspace", async () => {
  const repo = accountRepository("other");
  await expect(repo.load()).rejects.toThrow("Account session unavailable");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
