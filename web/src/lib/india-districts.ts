import rawData from './india-districts.json';

// Founder request: real District suggestions, not just campaign history. Vendored directly
// (rather than installed as an npm dependency) after independently verifying the actual data
// against well-known real figures — Bihar 38 districts, Kerala 14, Uttar Pradesh 75, Maharashtra
// 36, Tamil Nadu 38, Delhi 11, J&K 20 all check out — while avoiding the source package's own
// oddly-shaped dependency list (it lists itself, and even "npm", as runtime dependencies, which
// isn't something to install directly). 738 districts across 28 states + 8 union territories; no
// Tehsil-level data exists in this or any similarly-sized public dataset, so Tehsil suggestions
// stay sourced from this campaign's own history (see PjpPage's knownLocations) — an honest gap,
// not a silently-invented one.
interface RawStateEntry {
  name: string;
  districts: string[];
}
interface RawIndiaDistrictsData {
  states: RawStateEntry[];
  union_territories: RawStateEntry[];
}

const data = rawData as RawIndiaDistrictsData;

const DISTRICTS_BY_STATE: Record<string, string[]> = {};
for (const entry of [...data.states, ...data.union_territories]) {
  DISTRICTS_BY_STATE[entry.name] = entry.districts;
}

/** Case-insensitive lookup — matches how the rest of this page already compares typed state
 * names against suggestions. Returns [] for a state not in this dataset (nothing to suggest, not
 * an error) rather than throwing. */
export function districtsForState(stateName: string | undefined): string[] {
  if (!stateName) return [];
  const key = Object.keys(DISTRICTS_BY_STATE).find((k) => k.toLowerCase() === stateName.trim().toLowerCase());
  return key ? DISTRICTS_BY_STATE[key] : [];
}
