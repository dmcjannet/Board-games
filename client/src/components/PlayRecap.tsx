import type { Play } from '../types';
import { recapFor } from '../utils/recap';

export default function PlayRecap({ play }: { play: Play }) {
  const text = recapFor(play);
  if (!text) return null;
  return <p className="play-recap">{text}</p>;
}
