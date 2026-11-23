import {auth} from '@/auth';
export const dynamic='force-dynamic';
export async function DELETE(){
  if(!(await auth())?.user?.id)return Response.json({error:'Unauthorized'},{status:401});
  return Response.json({error:'Shopify changes are temporarily unavailable. Existing connection records are preserved.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
