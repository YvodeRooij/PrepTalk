import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/login`);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/login`);
}