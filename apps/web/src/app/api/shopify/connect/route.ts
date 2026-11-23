import {auth} from '@/auth';
export const dynamic='force-dynamic';
export async function POST(){
  if(!(await auth())?.user?.id)return Response.json({error:'Unauthorized'},{status:401});
  return Response.json({error:'Shopify setup is temporarily unavailable pending verified OAuth.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
