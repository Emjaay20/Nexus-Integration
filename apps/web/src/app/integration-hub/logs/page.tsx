import {ActivityFeed} from '@/components/integration-hub/ActivityFeed';
import {getCurrentUserId} from '@/lib/session';
import {integrationService} from '@/services/integrationService';
import {ActivityFeedFilters} from '@/components/integration-hub/ActivityFeedFilters';
export const dynamic='force-dynamic';
export default async function LogsPage({searchParams}:{searchParams:Promise<{status?:string;integrationId?:string}>}){const params=await searchParams;const userId=await getCurrentUserId();const logs=await integrationService.getActivityLogs(userId,params.status,params.integrationId);return <section className="section"><h2>Activity archive</h2><p>Historical records can include synthetic activity. Events prefixed with test: are fixtures, not evidence of provider delivery.</p><ActivityFeedFilters/><ActivityFeed initialLogs={logs}/></section>;}
