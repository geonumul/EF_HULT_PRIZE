// Supabase 클라이언트. 환경변수가 없으면 null을 돌려주고, 화면은 데모 모드로 동작한다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemoMode = !url || !anonKey;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (isDemoMode) return null;
  if (!client) client = createClient(url as string, anonKey as string);
  return client;
}
