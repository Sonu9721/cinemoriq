import type { Metadata } from 'next';
import { CreativeStudioScreen } from '../../components/studio/creative-studio-screen';

export const metadata: Metadata = {
  title: 'AI Creative Studio — Cinemoriq',
  description:
    'Shape scenes, review cinematic previews, and manage human approval states in the Cinemoriq AI Creative Studio.',
};

export default function StudioPage() {
  return <CreativeStudioScreen />;
}

