import type { State } from "../domain/model";
import { emptyState } from "../domain/model";
import { normalizeSettings } from "../domain/settings";
import type { Repository } from "../data/repository";
import { LocalizedError } from "../i18n/core";
import { cloud, projectUrl, publishableKey } from "./client";
import { deviceStorage } from "./device-storage";

export function workspaceOf(state: State) {
  const { version, routines, occurrences, logs, projects, milestones } = state;
  return { version, routines, occurrences, logs, projects, milestones };
}

export function hasWorkspaceData(state: State) {
  return Boolean(
    state.routines.length ||
    state.occurrences.length ||
    state.logs.length ||
    state.projects.length ||
    state.milestones.length,
  );
}

export function accountRepository(userId: string): Repository {
  let revision = 0;
  let loaded = false;
  let saved = "";
  const settingsKey = `finishcoach.settings.${userId}`;

  async function request(path: string, body?: unknown) {
    const { data, error } = await cloud.auth.getSession();
    if (error || data.session?.user.id !== userId)
      throw new Error("Account session unavailable");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${projectUrl}/rest/v1/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Workspace request failed (${response.status})`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async load() {
      const rows = await request(
        `account_workspaces?select=revision,payload&user_id=eq.${encodeURIComponent(userId)}`,
      );
      const entry = rows[0];
      const state: State = entry ? workspaceOf(entry.payload) : emptyState();
      const settings = await deviceStorage.getItem(settingsKey);
      state.settings = normalizeSettings(
        settings ? JSON.parse(settings) : undefined,
      );
      revision = entry?.revision ?? 0;
      saved = JSON.stringify(workspaceOf(state));
      loaded = true;
      return state;
    },
    async commit(state) {
      if (!loaded) throw new Error("Workspace not loaded");
      const workspace = workspaceOf(state);
      const next = JSON.stringify(workspace);
      if (next !== saved) {
        const result = await request("rpc/save_account_workspace", {
          expected_revision: revision,
          workspace,
        });
        if (result === null) throw new LocalizedError("account.conflict");
        revision = result;
        saved = next;
      }
      await deviceStorage.setItem(
        settingsKey,
        JSON.stringify(normalizeSettings(state.settings)),
      );
    },
  };
}
