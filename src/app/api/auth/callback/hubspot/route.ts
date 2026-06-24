import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Initialize your Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided by HubSpot' }, { status: 400 });
  }

  try {
    // 1. Exchange the code for the Access Token
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/hubspot`,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to retrieve token from HubSpot');
    }

    // 2. Determine who just connected this. 
    // In a real app, you would get the user's ID from their active session.
    // For this example, we'll assume you have a way to get the current user's Organization ID.
    const mockOrganizationId = "org_12345"; // REPLACE with actual session org ID

    // 3. Save the token securely to your database (Multi-Tenant Architecture)
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        organization_id: mockOrganizationId,
        provider: 'hubspot',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id, provider' });

    if (dbError) throw dbError;

    // 4. Redirect the user back to your settings page with a success message
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/integrations?integration=success`);

  } catch (error) {
    console.error('HubSpot OAuth Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/integrations?integration=error`);
  }
}
