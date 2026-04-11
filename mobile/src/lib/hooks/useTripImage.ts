 const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const BUCKET = 'trip-images';

const CURATED_IMAGES: Record<string, string[]> = {
  africa: [
    '_ (2).jpeg', '_ (3).jpeg', '_ (4).jpeg', '_ (5).jpeg',
    'A Kenyan Safari.jpeg', 'African Savannah.jpeg',
    'Best Time to Visit South Africa.jpeg', 'Elephants.jpeg',
  ],
  asia: [
    '_ (10).jpeg', '_ (6).jpeg', '_ (7).jpeg', '_ (8).jpeg', '_ (9).jpeg',
    '123456752.jpeg',
    'Japan Travel - The Ultimate Guide to Cherry Blossom Festivals Across Japan.jpeg',
    'Kyoto, Japan_ The thousands of Torii gates at Fushimi Inari Shrine.jpeg',
    'River Ban.jpeg',
  ],
  beach: [
    '_ (11).jpeg', '_ (12).jpeg', '_ (13).jpeg', '_ (14).jpeg', '_ (15).jpeg',
    '_ (16).jpeg', '_ (17).jpeg', '_ (18).jpeg', '_ (19).jpeg',
    '41 Stunning Summer Phone Wallpapers.jpeg', 'capri.jpeg',
    'Surf.jpeg', 'surfing.jpeg',
  ],
  city: [
    '_ (20).jpeg', '_ (21).jpeg', 'Amsterdamer Stil.jpeg',
    'Best Things to Do in Seattle Washington for Scenic City Views.jpeg',
    'Best Things to Do in Seattle Washington for Skyline Photography.jpeg',
    'manhattan.jpeg', 'new york, manhattan, central p.jpeg',
  ],
  desert: [
    '_ (22).jpeg', '_ (23).jpeg', '_ (24).jpeg', '_ (25).jpeg',
    '348023.jpeg', '890543.jpeg', 'Morocco Desert.jpeg',
    'sand surfing.jpeg', 'sunset in merzouga.jpeg',
  ],
  europe: [
    '_ (26).jpeg', '_ (28).jpeg', '_ (29).jpeg', '_ (30).jpeg',
    '_ (31).jpeg', '_ (32).jpeg', 'amsterdam_.jpeg',
    'Spain travel Inspiration.jpeg', 'The Tower Bridge.jpeg',
  ],
  'latin-america': [
    '_ (33).jpeg', '_ (34).jpeg', '_ (35).jpeg', '_ (36).jpeg',
    '456382941.jpeg', 'Guatemala12343.jpeg',
    'Igannahvcp.jpeg', 'Uyuni Salt Flat.jpeg',
  ],
  mountain: [
    '_ (37).jpeg', '_ (38).jpeg', '_ (39).jpeg', '_ (40).jpeg',
    '_ (41).jpeg', '_ (42).jpeg', '_ (43).jpeg', '_ (44).jpeg',
    '_ (45).jpeg', '_ (46).jpeg', '_ (48).jpeg',
    '88888897.jpeg', '9999435.jpeg', 'Gang on top da mountain.jpeg',
    'PNW Backpacking Adventures.jpeg', 'Switzerland8738.jpeg',
  ],
  nature: [
    '_ (49).jpeg', '_ (50).jpeg', '_ (51).jpeg',
    'Beautiful Forest Nature Photography Peaceful Trees.jpeg',
    'The Ultimate 4-Day .jpeg',
  ],
  winter: [
    '_ (52).jpeg', '_ (53).jpeg', '_ (54).jpeg', '_ (55).jpeg',
    '_ (56).jpeg', '_ (57).jpeg', '555555679.jpeg',
    'Best Travel Destinations for winter Holidays.jpeg',
  ],
};

function buildUrl(category: string, filename: string): string {
  const encoded = encodeURIComponent(filename);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${category}/${encoded}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCategories(destination: string, vibes: string[]): string[] {
  const combined = `${destination} ${vibes.join(' ')}`.toLowerCase();
  const categories: string[] = [];

  if (/bali|hawaii|maldives|ibiza|cancun|phuket|miami|caribbean|island|beach|coast|surf/.test(combined)) categories.push('beach');
  if (/japan|tokyo|kyoto|thailand|vietnam|korea|china|singapore|india|asia/.test(combined)) categories.push('asia');
  if (/paris|london|rome|barcelona|amsterdam|italy|france|spain|portugal|greece|prague|europe/.test(combined)) categories.push('europe');
  if (/new york|nyc|chicago|dubai|city|urban|downtown|metro|manhattan/.test(combined)) categories.push('city');
  if (/morocco|sahara|egypt|jordan|desert|namibia|dune/.test(combined)) categories.push('desert');
  if (/alps|himalaya|colorado|patagonia|switzerland|norway|mountain|hiking|trek|summit|peak/.test(combined)) categories.push('mountain');
  if (/amazon|costa rica|borneo|jungle|forest|nature|national park|wildlife/.test(combined)) categories.push('nature');
  if (/mexico|colombia|peru|brazil|argentina|chile|cuba|latin|guatemala|panama/.test(combined)) categories.push('latin-america');
  if (/kenya|tanzania|safari|south africa|ethiopia|africa/.test(combined)) categories.push('africa');
  if (/iceland|norway|alaska|ski|snow|winter|christmas|northern lights/.test(combined)) categories.push('winter');

  if (categories.length === 0) {
    if (/adventure|hiking|backpack/.test(combined)) categories.push('mountain');
    else if (/relax|luxury|chill/.test(combined)) categories.push('beach');
    else if (/culture|history|food/.test(combined)) categories.push('europe');
    else if (/party|nightlife/.test(combined)) categories.push('city');
    else categories.push('mountain', 'beach', 'europe');
  }

  return categories;
}

export function getTripImageUrl(destination: string, vibes: string[]): string {
  const categories = getCategories(destination, vibes);
  const category = pickRandom(categories);
  const files = CURATED_IMAGES[category];
  const filename = pickRandom(files);
  return buildUrl(category, filename);
}

export function getTripImageSuggestions(destination: string, vibes: string[], count = 6): string[] {
  const categories = getCategories(destination, vibes);
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const files = [...CURATED_IMAGES[category]].sort(() => Math.random() - 0.5);
    for (const file of files.slice(0, Math.ceil(count / categories.length))) {
      const url = buildUrl(category, file);
      if (!seen.has(url)) { seen.add(url); suggestions.push(url); }
    }
  }

  if (suggestions.length < count) {
    const remaining = Object.keys(CURATED_IMAGES).filter(c => !categories.includes(c));
    for (const category of remaining) {
      if (suggestions.length >= count) break;
      const url = buildUrl(category, pickRandom(CURATED_IMAGES[category]));
      if (!seen.has(url)) { seen.add(url); suggestions.push(url); }
    }
  }

  return suggestions.slice(0, count);
}