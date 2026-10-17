import { vi } from "vitest";
import { randomUUID } from "node:crypto";
import "fake-indexeddb/auto";
vi.mock("expo-crypto", () => ({ randomUUID }));
