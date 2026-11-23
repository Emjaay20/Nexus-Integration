'use server';
import {getCurrentUserId} from '@/lib/session';
export async function getSettings(){await getCurrentUserId();return null;}
export async function updateSettings(_data:{email_alerts:boolean;slack_alerts:boolean;retention_days:number}){await getCurrentUserId();return {success:false,error:'Legacy settings are paused'};}
export async function rotateApiKey():Promise<{success:boolean;apiKey?:string;isNew?:boolean;error?:string}>{await getCurrentUserId();return {success:false,error:'Legacy API keys are paused'};}
