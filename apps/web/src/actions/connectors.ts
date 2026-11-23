'use server';
import {getCurrentUserId} from '@/lib/session';
// Never persist a healthy connection unless provider authentication and a real read succeeded.
export async function connectIntegration(_connectorId:string,_name:string,_shopDomain?:string,_credentials?:{apiKey?:string}):Promise<{success:boolean;error?:string;redirectUrl?:string;live?:boolean;simulated?:boolean}> {
  await getCurrentUserId();
  return {success:false,error:'Connector setup is unavailable pending provider-specific verification.'};
}
