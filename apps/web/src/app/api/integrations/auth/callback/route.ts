import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const response=NextResponse.redirect(new URL('/integration-hub/connectors?error=provider_setup_unavailable',request.url));
  response.cookies.delete('oauth_state');
  return response;
}
