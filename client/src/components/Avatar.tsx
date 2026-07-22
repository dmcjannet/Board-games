interface Props {
  playerId: number;
  playerName: string;
  imageVersion: string | null;
  size?: number;
}

// Deterministic hue from a player id so two "no-avatar" players don't collide.
function hueFor(id: number): number {
  return (id * 137) % 360;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export default function Avatar({ playerId, playerName, imageVersion, size = 28 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.42 };

  if (imageVersion) {
    return (
      <img
        className="avatar"
        src={`/api/players/${playerId}/image?v=${imageVersion}`}
        alt={playerName}
        style={style}
      />
    );
  }

  return (
    <span
      className="avatar avatar-fallback"
      style={{ ...style, background: `hsl(${hueFor(playerId)}, 45%, 40%)` }}
      aria-label={playerName}
    >
      {initialsOf(playerName)}
    </span>
  );
}
