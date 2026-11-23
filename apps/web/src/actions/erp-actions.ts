'use server';
import {getCurrentUserId} from '@/lib/session';
// Outbound ERP calls require a provider-specific adapter, verified endpoint policy,
// encrypted credentials, and a durable delivery contract. Do not probe arbitrary URLs.
export async function configureErp(_formData: FormData) {
  await getCurrentUserId();
  return {success:false,error:'ERP connection setup is disabled pending verified provider support.'};
}
export async function syncToErp(_integrationId:string,_payload:unknown) {
  await getCurrentUserId();
  return {success:false,error:'ERP dispatch is disabled pending verified provider support.'};
}
