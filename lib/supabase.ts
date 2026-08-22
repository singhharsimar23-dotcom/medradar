import { createClient } from '@supabase/supabase-js';

// Server-side client (uses service key or anon key from env)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Browser client (uses NEXT_PUBLIC_ prefixed vars)
export const createBrowserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
