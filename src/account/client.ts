import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { deviceStorage } from "./device-storage";

export const projectUrl = "https://xqkkemiolzbzdtxaqldy.supabase.co";
export const publishableKey = "sb_publishable_Snqwp8_AeqOiu99rbOFtxA_WBsccUzy";

export const cloud = createClient(projectUrl, publishableKey, {
  auth: {
    storage: deviceStorage,
    flowType: "pkce",
    detectSessionInUrl: false,
    autoRefreshToken: true,
    persistSession: true,
  },
});
