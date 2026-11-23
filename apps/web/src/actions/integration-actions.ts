'use server';
import {getCurrentUserId} from '@/lib/session';
// Do not fabricate a provider response. Re-enable only with a verified adapter.
export async function triggerSync(integrationId:string) {
  await getCurrentUserId();
  if(!integrationId)return {success:false,error:'Integration is required'};
  return {success:false,error:'Manual sync is unavailable until the provider adapter is verified.'};
}
