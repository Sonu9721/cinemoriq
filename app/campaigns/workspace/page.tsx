import type { Metadata } from 'next';
import { CampaignWorkspaceScreen } from '../../../components/campaigns/campaign-workspace-screen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Campaign Workspace — Cinemoriq',
  description:
    'Review campaign workflow, creative concepts, and production events in Cinemoriq.',
};

export default function CampaignWorkspacePage() {
  return <CampaignWorkspaceScreen />;
}
