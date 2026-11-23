import {auth} from '@/auth';
export const dynamic='force-dynamic';
export async function POST(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:'Unauthorized'},{status:401});
  return Response.json({error:'Legacy reset/clear is disabled. Use workspace-specific data management; no data was deleted.'},{status:410});
}
