import type { Metadata } from 'next';
import { CreateCampaignScreen } from '../../../components/campaigns/create-campaign-screen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Define Campaign Intent — Cinemoriq',
  description: 'Set the primary objective for a new Cinemoriq campaign.',
};

export default function CreateCampaignPage() {
  return <CreateCampaignScreen />;
}
