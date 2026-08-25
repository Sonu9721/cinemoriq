import type { Metadata } from 'next';
import { ProviderSettingsScreen } from '../../components/settings/provider-settings-screen';

export const metadata: Metadata = {
  title: 'Provider Connections — Cinemoriq',
  description:
    'Review secure fal.ai and MiniMax Direct provider connections for Cinemoriq.',
};

function getProviderStatus(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return {
    configured: Boolean(normalized),
    maskedSuffix: normalized ? normalized.slice(-4) : null,
  };
}

export default function SettingsPage() {
  return (
    <ProviderSettingsScreen
      falStatus={getProviderStatus(process.env.FAL_KEY)}
      minimaxStatus={getProviderStatus(process.env.MINIMAX_API_KEY)}
    />
  );
}
