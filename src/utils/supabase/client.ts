import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: any;

export const createClient = () => {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      supabaseUrl!,
      supabaseKey!,
    );
  }

  if (!client) {
    client = createBrowserClient(
      supabaseUrl!,
      supabaseKey!,
    );
  }

  return client;
};
