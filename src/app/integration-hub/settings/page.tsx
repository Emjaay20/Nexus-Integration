import { getSettings } from '@/actions/settings';
import { SettingsForm } from '@/components/settings/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getSettings();

    if (!settings) {
        return <div className="p-8 text-red-500">Failed to load settings. Please try again.</div>;
    }

    return <SettingsForm initialSettings={settings} />;
}
