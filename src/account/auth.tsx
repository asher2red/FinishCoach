import { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { openAuthSessionAsync } from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { LocalizedError } from "../i18n/core";
import { cloud, projectUrl, publishableKey } from "./client";

type AuthState = { ready: boolean; session: Session | null };
const AuthContext = createContext<AuthState>({ ready: false, session: null });
const nativeCallback = "finishcoach://auth/callback";
let pendingCode: { code: string; exchange: Promise<void> } | undefined;

export function finishSignIn(code: string) {
  if (pendingCode?.code === code) return pendingCode.exchange;
  const exchange = cloud.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) throw error;
  });
  pendingCode = { code, exchange };
  return exchange;
}

export async function signInWithGoogle() {
  const availability = await fetch(projectUrl + "/auth/v1/settings", {
    headers: { apikey: publishableKey },
  });
  if (!availability.ok) throw new Error("Could not check login providers");
  const { external } = await availability.json();
  if (external?.google !== true)
    throw new LocalizedError("account.providerUnavailable");
  const web = Platform.OS === "web";
  const redirectTo = web
    ? new URL("/auth/callback", window.location.origin).href
    : nativeCallback;
  const { data, error } = await cloud.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("OAuth URL unavailable");
  if (web) {
    window.location.assign(data.url);
    return;
  }
  const result = await openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return;
  const callback = new URL(result.url);
  if (
    callback.protocol !== "finishcoach:" ||
    callback.hostname !== "auth" ||
    callback.pathname !== "/callback"
  )
    throw new Error("Unexpected OAuth callback");
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("OAuth callback did not include a code");
  await finishSignIn(code);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ ready: false, session: null });
  useEffect(() => {
    const { data } = cloud.auth.onAuthStateChange((_, session) =>
      setAuth({
        ready: true,
        session: session?.user.is_anonymous ? null : session,
      }),
    );
    if (Platform.OS === "web") return () => data.subscription.unsubscribe();
    const setRefresh = (state: string) => {
      if (state === "active") void cloud.auth.startAutoRefresh();
      else void cloud.auth.stopAutoRefresh();
    };
    setRefresh(AppState.currentState ?? "unknown");
    const listener = AppState.addEventListener("change", setRefresh);
    return () => {
      data.subscription.unsubscribe();
      listener.remove();
      void cloud.auth.stopAutoRefresh();
    };
  }, []);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
