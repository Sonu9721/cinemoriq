import type { Metadata } from 'next';
import { ProviderSettingsScreen } from '../../components/settings/provider-settings-screen';
import { getAuthConfigurationStatus } from '../../lib/server/auth';
import { getRuntimeEnv } from '../../lib/server/runtime-env';

export const metadata: Metadata = {
  title: 'Provider Connections — Cinemoriq',
  description:
    'Review secure fal.ai and MiniMax Direct provider connections for Cinemoriq.',
};

export const dynamic = 'force-dynamic';

function getProviderStatus(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return {
    configured: Boolean(normalized),
  };
}

export default function SettingsPage() {
  const runtime = getRuntimeEnv();
  return (
    <ProviderSettingsScreen
      falStatus={getProviderStatus(runtime.FAL_KEY)}
      minimaxStatus={getProviderStatus(runtime.MINIMAX_API_KEY)}
      accessStatus={getAuthConfigurationStatus()}
    />
  );
}
