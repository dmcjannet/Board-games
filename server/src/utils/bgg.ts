import { XMLParser } from 'fast-xml-parser';

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const USER_AGENT = 'BoardGameScoreTracker/1.0 (self-hosted personal app)';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => name === 'item' || name === 'link' || name === 'name',
});

export interface BGGSearchResult {
  bggId: number;
  name: string;
  yearPublished: number | null;
}

export interface BGGGame {
  bggId: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  image: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  categories: string[];
  mechanics: string[];
}

// BGG occasionally responds with 202 while it prepares data; retry after a
// short pause. Fail fast if the second attempt still isn't 200.
async function fetchBGG(path: string, signal?: AbortSignal): Promise<string> {
  const url = `${BGG_BASE}${path}`;
  const opts = { headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml' }, signal };
  let res = await fetch(url, opts);
  if (res.status === 202) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, opts);
  }
  if (!res.ok) {
    throw new Error(`BGG returned HTTP ${res.status}`);
  }
  return res.text();
}

// Utility: turn "Card Drafting" into "card-drafting" for tag storage.
export function normalizeTag(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

type RawItem = {
  id?: string | number;
  type?: string;
  thumbnail?: string;
  image?: string;
  name?: Array<{ type?: string; value?: string }>;
  yearpublished?: { value?: string };
  minplayers?: { value?: string };
  maxplayers?: { value?: string };
  playingtime?: { value?: string };
  link?: Array<{ type?: string; value?: string }>;
};

function primaryName(item: RawItem): string {
  const names = item.name ?? [];
  const primary = names.find((n) => n.type === 'primary');
  return (primary?.value ?? names[0]?.value ?? '').trim();
}

function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function linksOfType(item: RawItem, type: string): string[] {
  return (item.link ?? [])
    .filter((l) => l.type === type && typeof l.value === 'string')
    .map((l) => l.value!.trim());
}

export function parseSearchResults(xml: string): BGGSearchResult[] {
  const parsed = parser.parse(xml) as { items?: { item?: RawItem[] } };
  const items = parsed.items?.item ?? [];
  return items
    .map((item) => ({
      bggId: Number(item.id),
      name: primaryName(item),
      yearPublished: toInt(item.yearpublished?.value),
    }))
    .filter((r) => Number.isFinite(r.bggId) && r.name.length > 0);
}

export function parseGameDetails(xml: string): BGGGame | null {
  const parsed = parser.parse(xml) as { items?: { item?: RawItem[] } };
  const item = parsed.items?.item?.[0];
  if (!item) return null;
  return {
    bggId: Number(item.id),
    name: primaryName(item),
    yearPublished: toInt(item.yearpublished?.value),
    thumbnail: item.thumbnail ?? null,
    image: item.image ?? null,
    minPlayers: toInt(item.minplayers?.value),
    maxPlayers: toInt(item.maxplayers?.value),
    playingTime: toInt(item.playingtime?.value),
    categories: linksOfType(item, 'boardgamecategory'),
    mechanics: linksOfType(item, 'boardgamemechanic'),
  };
}

// Derives our tag set from BGG data: up to 5 categories, 3 mechanics, and a
// duration bucket if playingTime is known.
export function tagsFromBGGGame(game: BGGGame): string[] {
  const tags = new Set<string>();
  for (const c of game.categories.slice(0, 5)) tags.add(normalizeTag(c));
  for (const m of game.mechanics.slice(0, 3)) tags.add(normalizeTag(m));
  if (game.playingTime != null && game.playingTime > 0) {
    if (game.playingTime <= 30) tags.add('quick');
    else if (game.playingTime <= 75) tags.add('medium');
    else tags.add('long');
  }
  return Array.from(tags).filter((t) => t.length > 0);
}

export async function searchBGG(query: string): Promise<BGGSearchResult[]> {
  const xml = await fetchBGG(`/search?query=${encodeURIComponent(query)}&type=boardgame`);
  return parseSearchResults(xml).slice(0, 25);
}

export async function fetchBGGGame(bggId: number): Promise<BGGGame | null> {
  const xml = await fetchBGG(`/thing?id=${bggId}`);
  return parseGameDetails(xml);
}
