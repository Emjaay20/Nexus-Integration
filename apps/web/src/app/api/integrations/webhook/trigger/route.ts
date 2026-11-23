// A timer is not a durable webhook queue. Preserve data and fail closed until a real
// provider-signature / persistence / retry contract is implemented.
export const dynamic='force-dynamic';
export async function POST(){return Response.json({success:false,message:'Legacy webhook simulator is disabled. No event was accepted.'},{status:503,headers:{'Cache-Control':'no-store'}});}
