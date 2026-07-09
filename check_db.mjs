import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function base64ToBytes(value) {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

async function decryptToken(ciphertext, iv, secret) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "decrypt",
  ]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function main() {
  const { data: tokens, error } = await supabase
    .from('crm_connection_tokens')
    .select('*');
  
  if (error) {
    console.error('Error fetching tokens:', error);
    return;
  }

  console.log('Found', tokens.length, 'tokens');
  
  const secrets = {
    "HUBSPOT_TOKEN_ENCRYPTION_KEY from env": env.HUBSPOT_TOKEN_ENCRYPTION_KEY || "not set in env",
    "SUPABASE_SERVICE_ROLE_KEY from env": env.SUPABASE_SERVICE_ROLE_KEY,
  };

  for (const token of tokens) {
    console.log('\nToken ID:', token.id, 'Connection ID:', token.connection_id);
    for (const [name, secret] of Object.entries(secrets)) {
      if (!secret || secret === "not set in env") continue;
      try {
        const decrypted = await decryptToken(token.access_token_ciphertext, token.access_token_iv, secret);
        console.log(`  Decrypted successfully with ${name}! Token prefix:`, decrypted.substring(0, 10));
      } catch (err) {
        console.log(`  Failed with ${name}:`, err.message);
      }
    }
  }
}

main().catch(console.error);
