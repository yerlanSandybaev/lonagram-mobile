import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountProfile = {
  id: string;
  username: string;
  displayName: string;
  onboardingComplete: boolean;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  onboarding_complete: boolean;
};

export async function loadAccountProfile(client: SupabaseClient, userId: string): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, onboarding_complete")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    onboardingComplete: data.onboarding_complete,
  };
}
