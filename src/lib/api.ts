import { createMobileApi } from "@/lib/mobile-api";
import { getSupabase } from "@/lib/supabase";

export const mobileApi = createMobileApi(
  process.env.EXPO_PUBLIC_LONAGRAM_API_URL?.trim(),
  async () => {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    // getSession refreshes expiring sessions through the configured Supabase client.
    return data.session;
  },
);
