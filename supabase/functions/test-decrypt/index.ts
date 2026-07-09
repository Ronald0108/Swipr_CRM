import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

Deno.serve(async (req) => {
  const hubspotKey = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY") || "";
  return new Response(JSON.stringify({ key: hubspotKey }), {
    headers: { "Content-Type": "application/json" },
  });
});
