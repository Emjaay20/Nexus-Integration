import {redirect} from 'next/navigation';
// The former page displayed a static failed event. Actual records have tenant-scoped IDs.
export default function IntegrationDetailsPage(){redirect('/integration-hub/logs');}
