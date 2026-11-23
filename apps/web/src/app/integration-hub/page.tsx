import Link from 'next/link';
import {getCurrentUserId} from '@/lib/session';
export const dynamic='force-dynamic';
export default async function IntegrationHubPage(){
  await getCurrentUserId();
  return <section className="section">
    <div className="section-head"><div><h2>Connection workspace</h2><p>Provider integrations are undergoing verification. Existing records have not been deleted.</p></div></div>
    <div className="note">Historical activity can include earlier simulated events. It is not evidence of live provider delivery, uptime or customer traffic.</div>
    <div className="hero-ctas" style={{marginTop:24}}>
      <Link className="btn btn-primary" href="/workspace">Open sourcing workspace</Link>
      <Link className="btn btn-secondary" href="/integration-hub/logs">View historical activity</Link>
      <Link className="btn btn-secondary" href="/developer/playground">Record a test event</Link>
    </div>
  </section>;
}
