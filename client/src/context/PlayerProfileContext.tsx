import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import PlayerProfileModal from '../components/PlayerProfileModal';

interface PlayerProfileApi {
  open: (playerId: number) => void;
}

const PlayerProfileContext = createContext<PlayerProfileApi>({ open: () => {} });

export function usePlayerProfile(): PlayerProfileApi {
  return useContext(PlayerProfileContext);
}

export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<number | null>(null);

  const open = useCallback((playerId: number) => {
    setOpenId(playerId);
  }, []);

  return (
    <PlayerProfileContext.Provider value={{ open }}>
      {children}
      {openId != null && (
        <PlayerProfileModal playerId={openId} onClose={() => setOpenId(null)} />
      )}
    </PlayerProfileContext.Provider>
  );
}
