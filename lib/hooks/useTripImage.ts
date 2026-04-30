const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const BUCKET = 'trip-images';

// ── Exact file extensions for every slug in the bucket ────────────────────────
// The anon key cannot list storage; these are queried directly from storage.objects.
// Pattern: slug + zero-padded number + extension, e.g. atlanta01.jpg
const BUCKET_EXTS: Record<string, string[]> = {
  // africa
  'africa/botswana':       ['png','png','png','jpg','png','png','jpg','jpg','jpg','jpg'],
  'africa/cairo':          ['jpg'],
  'africa/cape-town-af':   ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/casablanca':     ['png','webp','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg'],
  'africa/chefchaouen':    ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/ethiopia':       ['png'],
  'africa/fes':            ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/ghana':          ['png','png','jpg','png','jpg','png','jpg','jpg','jpg','jpg'],
  'africa/johannesburg':   ['png','jpg','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/kenya-safari':   ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/kilimanjaro':    ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/luxor':          ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/madagascar':     ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/marrakech':      ['png','png','png','jpg','jpg','png','jpg','jpg','jpg','jpg'],
  'africa/masai-mara':     ['png','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'africa/nairobi':        ['jpg','png','webp','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/namibia':        ['png','png','png','png','jpg','jpg','jpg','jpg','webp','jpg'],
  'africa/rwanda':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/sahara':         ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/senegal':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/serengeti':      ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/south-africa':   ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'africa/victoria-falls': ['png','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg','jpg'],
  'africa/zanzibar':       ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // asia
  'asia/abu-dhabi':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/bali':             ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/bangkok':          ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/beijing':          ['png','png','jpg','png','jpg','jpg','png','jpg','jpg','webp'],
  'asia/busan':            ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/cappadocia':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/chiang-mai':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg'],
  'asia/delhi':            ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/doha':             ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/dubai':            ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/goa':              ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/halong-bay':       ['jpg','png','png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'asia/hanoi':            ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/ho-chi-minh':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/hokkaido':         ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/hong-kong':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/jaipur':           ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/jeju':             ['png','png','png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'asia/kathmandu':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/koh-samui':        ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/komodo':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/krabi':            ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/kuala-lumpur':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/kyoto':            ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/lombok':           ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/luang-prabang':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/maldives':         ['png','png','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/mumbai':           ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/okinawa':          ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/osaka':            ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/palawan':          ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/pamukkale':        ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/phi-phi':          ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/phuket':           ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/seoul':            ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/shanghai':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/siem-reap':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/singapore':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/sri-lanka':        ['png','jpg','jpg','jpg','jpg','png','jpg','jpg','jpg','jpg'],
  'asia/taipei':           ['jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg','jpg','jpg'],
  'asia/tokyo':            ['jpg','jpg','png','png','png','png','jpg','jpg','jpg','jpg'],
  'asia/ubud':             ['png','png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'asia/zhangjiajie':      ['png','png','png','jpg','jpg','jpg','jpg','jpg','webp','webp'],
  // beach
  'beach/algarve':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/amalfi-beach':    ['jpg','png','png','png','jpg','png','jpg','jpg','jpg','jpg'],
  'beach/aruba':           ['jpg','png','png','jpg','png','jpg','png','jpg','jpg','jpg'],
  'beach/bahamas':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/barbados':        ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/bora-bora':       ['png','png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/byron-bay':       ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/cabo-san-lucas':  ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/cancun':          ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/cebu':            ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/costa-rica-beach':['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/fiji':            ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/gold-coast':      ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/hawaii-big':      ['png','jpg','png','png','png','png','jpg','jpg','jpg','jpg'],
  'beach/ibiza':           ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/jamaica':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/koh-lanta':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/maui':            ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/miami-beach':     ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/nusa-penida':     ['jpg','jpg','jpg','jpg'],
  'beach/playa-del-carmen':['png','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/puerto-rico':     ['jpg'],
  'beach/puerto-vallarta': ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/punta-cana':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/seychelles':      ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/st-lucia':        ['png','png','jpg','jpg','jpg','png','jpg','jpg','jpg','jpg'],
  'beach/tahiti':          ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg'],
  'beach/tulum':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/turks-caicos':    ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'beach/zanzibar-beach':  ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // city
  'city/atlanta':          ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/austin':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/boston':           ['jpg','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/buenos-aires':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/cape-town':        ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/chicago':          ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/denver':           ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/las-vegas':        ['jpg','jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/los-angeles':      ['jpg'],
  'city/melbourne':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/mexico-city':      ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/miami':            ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/minneapolis':      ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/montreal':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/nashville':        ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/new-orleans':      ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','webp'],
  'city/new-york':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/new-york-night':   ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/philadelphia':     ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/portland':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/san-antonio':      ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/san-diego':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/san-francisco':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/seattle':          ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/sydney':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/toronto':          ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/vancouver':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'city/washington-dc':    ['jpg','jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  // desert
  'desert/abu-dhabi-desert':['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/arizona':        ['jpg','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/atacama':        ['png','png','jpg','png','webp','jpg','jpg','jpg','jpg','jpg'],
  'desert/death-valley':   ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/dubai-desert':   ['png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'desert/joshua-tree':    ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/moab':           ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/monument-valley':['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/namib-desert':   ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/oman':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/palm-springs':   ['png','png','png','jpg','png','jpg','png','jpg','jpg','jpg'],
  'desert/petra':          ['png','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'desert/sahara-desert':  ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/sedona':         ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/wadi-rum':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'desert/white-sands':    ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // europe
  'europe/amalfi':         ['jpg','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/amsterdam':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/athens':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/barcelona':      ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/belgrade':       ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/berlin':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/bruges':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/bucharest':      ['png','jpg','jpg','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/budapest':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/cinque-terre':   ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/copenhagen':     ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/dubrovnik':      ['png','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/edinburgh':      ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/florence':       ['png','png','png','jpg','png','jpg','webp','jpg','jpg','jpg'],
  'europe/hallstatt':      ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/istanbul':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/kotor':          ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/krakow':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/lake-como':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/lisbon':         ['png','png','png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/london':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg'],
  'europe/luxembourg':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  'europe/madrid':         ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/milan':          ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/monaco':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/mykonos':        ['png','jpg','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/nice':           ['png','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/oslo':           ['jpg','png','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  'europe/paris':          ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/porto':          ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/positano':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/prague':         ['png','png','png','jpg','png','jpg','jpg','jpg','jpg','jpg'],
  'europe/reykjavik':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/riga':           ['jpg','png','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  'europe/rome':           ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/santorini':      ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/seville':        ['png','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/split':          ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/stockholm':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/tallinn':        ['png','jpg','jpg','png','jpg','jpg','jpg','jpg','webp','jpg'],
  'europe/tbilisi':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/venice':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/vienna':         ['jpg','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/warsaw':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'europe/zurich':         ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // latin-america
  'latin-america/antigua':      ['jpg','webp','jpg','jpg','webp','jpg','jpg','jpg','jpg','webp'],
  'latin-america/asuncion':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/bariloche':    ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/bogota':       ['jpg','jpg','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/cartagena':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/cusco':        ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/guadalajara':  ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/havana':       ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/la-paz':       ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/lima':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/lima-peru':    ['jpg','jpg','webp','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/machu-picchu': ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/medellin':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/merida':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  'latin-america/montevideo':   ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/oaxaca':       ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/panama-city':  ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/quito':        ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/rio':          ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/salvador':     ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/san-cristobal':['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/san-jose-cr':  ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/santa-marta':  ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/santiago':     ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/sao-paulo':    ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/sucre':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/trinidad':     ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'latin-america/valparaiso':   ['jpg','png','png','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  // mountain
  'mountain/aspen':            ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/atlas-mountains':  ['jpg','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/banff':            ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/cascades':         ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/chamonix':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/dolomites':        ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/fjords':           ['png','png','jpg','jpg','webp','jpg','jpg','jpg','jpg','jpg'],
  'mountain/himalayas':        ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/innsbruck':        ['jpg','jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/interlaken':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/jasper':           ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/lake-louise':      ['png','png','jpg','png','png','png','jpg','jpg','jpg','jpg'],
  'mountain/lauterbrunnen':    ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/moraine-lake':     ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/patagonia':        ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/pyrenees':         ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/queenstown':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/rocky-mountains':  ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/salzburg':         ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','webp','webp'],
  'mountain/sierra-nevada':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/st-moritz':        ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/swiss-alps':       ['png','png','png','jpg','webp','png','jpg','jpg','jpg','webp'],
  'mountain/torres-del-paine': ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/vail':             ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/whistler':         ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'mountain/zermatt':          ['jpg','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // nature
  'nature/acadia':             ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/amazon':             ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/amazon-river':       ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/antelope-canyon':    ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/aurora-borealis':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/bali-rice':          ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/banff-lake':         ['png','png','png','png','png','png','jpg','jpg','jpg','jpg'],
  'nature/bryce-canyon':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/canadian-rockies':   ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/costa-rica':         ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/faroe-islands':      ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/galapagos':          ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/grand-canyon':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/great-barrier':      ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/iceland-nature':     ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/iguazu-falls':       ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/irish-countryside':  ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/milford-sound':      ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/new-zealand-nature': ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/niagara-falls':      ['png','png','png','webp','jpg','jpg','jpg','jpg','jpg','webp'],
  'nature/olympic-park':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/patagonia-nature':   ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/plitvice':           ['jpg','jpg','jpg','jpg','jpg','webp','jpg','webp','jpg','webp'],
  'nature/provence':           ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/scottish-highlands': ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg'],
  'nature/tofino':             ['jpg','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/tuscany':            ['png','png','png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'nature/yellowstone':        ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/yosemite':           ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'nature/zion':               ['png','png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  // winter
  'winter/aspen-winter':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/banff-winter':       ['png','jpg','jpg','jpg','jpg','jpg','jpg','webp','jpg','jpg'],
  'winter/christmas-markets':  ['png','png','png','png','png','png','jpg','jpg','jpg','webp'],
  'winter/hallstatt-winter':   ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/hokkaido-winter':    ['jpg','jpg','jpg','jpg','webp','jpg','jpg','jpg','jpg','jpg'],
  'winter/iceland-winter':     ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/japan-snow':         ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/lapland':            ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/new-york-winter':    ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/norway-winter':      ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/patagonia-winter':   ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/prague-winter':      ['png','png','png','png','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/quebec-winter':      ['png','jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/rovaniemi':          ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/scotland-winter':    ['png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/swiss-alps-winter':  ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/tromso':             ['png','png','png','png','png','jpg','jpg','jpg','jpg','jpg'],
  'winter/vienna-winter':      ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/yellowknife':        ['jpg','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
  'winter/zermatt-winter':     ['png','png','jpg','jpg','jpg','jpg','jpg','jpg','jpg','jpg'],
};

// ── Destination entries (for keyword/slug matching) ───────────────────────────
type DestEntry = { category: string; slug: string };

const ALL_DESTINATIONS: DestEntry[] = Object.keys(BUCKET_EXTS).map(key => {
  const [category, slug] = key.split('/') as [string, string];
  return { category, slug };
});

const CATEGORIES = ['africa', 'asia', 'beach', 'city', 'desert', 'europe', 'latin-america', 'mountain', 'nature', 'winter'] as const;

// Common shorthand / alternate spellings → canonical slug
const ALIASES: Record<string, string> = {
  'nyc': 'new-york',
  'new york city': 'new-york',
  'sf': 'san-francisco',
  'dc': 'washington-dc',
  'philly': 'philadelphia',
  'vegas': 'las-vegas',
  'nola': 'new-orleans',
  'saigon': 'ho-chi-minh',
  'ho chi minh city': 'ho-chi-minh',
  'rio de janeiro': 'rio',
  'cdmx': 'mexico-city',
  'mexico df': 'mexico-city',
};

// ── URL building ──────────────────────────────────────────────────────────────

function buildUrl(path: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}/${encodeURIComponent(filename)}`;
}

function getUrlsForSubfolder(category: string, slug: string): string[] {
  const key = `${category}/${slug}`;
  const exts = BUCKET_EXTS[key];
  if (!exts || exts.length === 0) return [];
  return exts.map((ext, i) => buildUrl(key, `${slug}${String(i + 1).padStart(2, '0')}.${ext}`));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getUrlsForCategory(category: string): string[] {
  return ALL_DESTINATIONS
    .filter(e => e.category === category)
    .flatMap(e => getUrlsForSubfolder(e.category, e.slug));
}

// ── Destination matching ───────────────────────────────────────────────────────

function normalizeToSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
}

function findDestinationEntries(destination: string): DestEntry[] {
  const normalized = normalizeToSlug(destination);
  if (normalized.length < 3) return [];

  const aliasSlug = ALIASES[normalized.replace(/-/g, ' ')] ?? ALIASES[normalized];
  const target = aliasSlug ?? normalized;

  const results: DestEntry[] = [];
  const seen = new Set<string>();
  const add = (e: DestEntry) => {
    const k = `${e.category}/${e.slug}`;
    if (!seen.has(k)) { seen.add(k); results.push(e); }
  };

  // 1. Exact slug match
  for (const e of ALL_DESTINATIONS) {
    if (e.slug === target) add(e);
  }
  if (results.length > 0) return results;

  // 2. Prefix match: "iceland" → iceland-nature, iceland-winter; "amalfi coast" → amalfi, amalfi-beach
  for (const e of ALL_DESTINATIONS) {
    if (e.slug.startsWith(target + '-') || target.startsWith(e.slug + '-')) add(e);
  }
  if (results.length > 0) return results;

  // 3. Word-level match: significant words from destination appear in a slug
  const stopWords = new Set(['the', 'and', 'del', 'des', 'von', 'sur']);
  const words = target.split('-').filter(w => w.length >= 3 && !stopWords.has(w));
  for (const e of ALL_DESTINATIONS) {
    const slugWords = e.slug.split('-');
    if (words.some(w => slugWords.includes(w))) add(e);
  }

  return results;
}

// ── Category keyword matching ─────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export async function getTripImageUrl(destination: string, vibes: string[]): Promise<string> {
  const destEntries = findDestinationEntries(destination);
  for (const entry of shuffle(destEntries)) {
    const urls = getUrlsForSubfolder(entry.category, entry.slug);
    if (urls.length > 0) return urls[Math.floor(Math.random() * urls.length)];
  }

  const categories = shuffle(getCategories(destination, vibes));
  for (const cat of categories) {
    const urls = shuffle(getUrlsForCategory(cat));
    if (urls.length > 0) return urls[Math.floor(Math.random() * urls.length)];
  }
  return '';
}

export async function getTripImageSuggestions(
  destination: string,
  vibes: string[],
  count = 12,
): Promise<string[]> {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  const add = (url: string) => {
    if (url && !seen.has(url)) { seen.add(url); suggestions.push(url); }
  };

  // 1. Destination-specific photos first
  const destEntries = findDestinationEntries(destination);
  if (destEntries.length > 0) {
    for (const url of shuffle(destEntries.flatMap(e => getUrlsForSubfolder(e.category, e.slug)))) {
      add(url);
      if (suggestions.length >= count) return suggestions;
    }
  }

  // 2. Category-level photos from keyword matching
  const categories = getCategories(destination, vibes);
  const perCat = Math.ceil(count / Math.max(categories.length, 1));
  for (const cat of categories) {
    for (const url of shuffle(getUrlsForCategory(cat)).slice(0, perCat)) {
      add(url);
      if (suggestions.length >= count) return suggestions;
    }
  }

  // 3. Pad from remaining categories
  if (suggestions.length < count) {
    const catSet = new Set(categories);
    for (const cat of [...CATEGORIES].filter(c => !catSet.has(c))) {
      for (const url of shuffle(getUrlsForCategory(cat))) {
        add(url);
        if (suggestions.length >= count) return suggestions;
      }
    }
  }

  return suggestions;
}

/** No-op — kept for API compatibility. Data is now statically bundled. */
export function prefetchAllCategories(): void {}
