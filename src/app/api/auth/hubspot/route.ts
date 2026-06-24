import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/hubspot`;
  
  // These must match exactly what you set in the HubSpot Developer Portal
  const scopes = 'crm.objects.contacts.read crm.objects.contacts.write';
  
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}`;
  
  return NextResponse.redirect(authUrl);
}
