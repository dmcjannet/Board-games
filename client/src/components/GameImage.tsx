interface Props {
  gameId: number;
  imageVersion: string | null;
  variant?: 'thumb' | 'hero';
  alt?: string;
}

// Renders a game image if one exists, otherwise nothing. `variant` controls
// the CSS class the caller styles (thumb next to the game name in a card
// header, or hero across the top of a play card).
export default function GameImage({ gameId, imageVersion, variant = 'thumb', alt }: Props) {
  if (!imageVersion) return null;
  const className = variant === 'hero' ? 'game-image-hero' : 'game-image-thumb';
  return (
    <img
      className={className}
      src={`/api/games/${gameId}/image?v=${imageVersion}`}
      alt={alt ?? ''}
      loading="lazy"
    />
  );
}
