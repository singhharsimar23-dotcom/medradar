import { supabase } from './supabase';

export async function resolveAlias(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const { data } = await supabase
    .from('medicine_aliases')
    .select('canonical_name')
    .ilike('brand_name', normalized)
    .single();
  return data?.canonical_name ?? input;
}

export async function getCanonicalName(geminiOutput: string): Promise<string> {
  // First check alias table, fall back to gemini output as-is
  return await resolveAlias(geminiOutput);
}
