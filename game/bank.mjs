// Curated dive packs. Keep this module server-side. Each row contains one tier,
// from Plankton to the single gem. The first spelling is the display name.
const questions = [
  {
    id: 'radio-alphabet', category: 'Language',
    prompt: 'Name a code word from the NATO spelling alphabet.',
    tiers: [
      ['Alfa|Alpha', 'Bravo', 'Charlie', 'Delta'],
      ['Zulu'],
      ['Echo', 'Foxtrot', 'Golf', 'Hotel', 'Oscar', 'Tango', 'Whiskey|Whisky'],
      ['India', 'Juliett|Juliet', 'Kilo', 'Lima', 'Mike', 'Papa', 'Romeo', 'Sierra', 'Victor', 'X-ray|Xray', 'Yankee'],
      ['Quebec', 'Uniform'], ['November']
    ]
  },
  {
    id: 'canada', category: 'Geography',
    prompt: 'Name one of Canada’s ten provinces or three territories.',
    tiers: [
      ['Ontario|ON|Ont', 'Quebec|QC|PQ'],
      ['Yukon|Yukon Territory|YT'],
      ['British Columbia|BC', 'Alberta|AB', 'Manitoba|MB', 'Nova Scotia|NS'],
      ['Saskatchewan|SK|Sask', 'New Brunswick|NB', 'Prince Edward Island|PEI|PE'],
      ['Newfoundland and Labrador|Newfoundland & Labrador|NL', 'Northwest Territories|North West Territories|NWT|NT'],
      ['Nunavut|NU']
    ]
  },
  {
    id: 'moonwalkers', category: 'Space',
    prompt: 'Name an Apollo astronaut who actually walked on the Moon.',
    tiers: [
      ['Neil Armstrong|Armstrong', 'Buzz Aldrin|Aldrin|Edwin Aldrin|Edwin Eugene Aldrin Jr'],
      ['Alan Shepard|Shepard|Alan Bartlett Shepard Jr'],
      ['Gene Cernan|Cernan|Eugene Cernan|Eugene Andrew Cernan', 'John Young|Young|John Watts Young'],
      ['Pete Conrad|Conrad|Charles Conrad|Charles Conrad Jr', 'Alan Bean|Bean|Alan LaVern Bean', 'David Scott|Dave Scott|Scott|David Randolph Scott'],
      ['Charles Duke|Charlie Duke|Duke|Charles Moss Duke Jr', 'James Irwin|Jim Irwin|Irwin|James Benson Irwin', 'Edgar Mitchell|Ed Mitchell|Mitchell|Edgar Dean Mitchell'],
      ['Harrison Schmitt|Jack Schmitt|Schmitt|Harrison H Schmitt|Harrison Hagan Schmitt']
    ]
  },
  {
    id: 'greek-letters', category: 'Language',
    prompt: 'Name any of the 24 letters of the Greek alphabet.',
    tiers: [
      ['Alpha|Alfa|α', 'Beta|β', 'Gamma|γ'],
      ['Omega|ω'],
      ['Delta|δ', 'Pi|π', 'Theta|θ', 'Sigma|σ|ς'],
      ['Epsilon|ε', 'Zeta|ζ', 'Eta|η', 'Iota|ι', 'Kappa|κ', 'Lambda|Lamda|λ', 'Mu|My|μ', 'Phi|φ', 'Tau|τ'],
      ['Nu|Ny|ν', 'Omicron|ο', 'Rho|ρ', 'Upsilon|Ypsilon|υ', 'Chi|Khi|χ', 'Psi|ψ'], ['Xi|Ksi|ξ']
    ]
  },
  {
    id: 'chinese-zodiac', category: 'Folklore',
    prompt: 'Name an animal in the traditional Chinese zodiac.',
    tiers: [
      ['Dragon|Dragons|Loong|Long', 'Tiger|Tigers'],
      ['Rat|Mouse|Rats|Mice'],
      ['Rabbit|Hare|Rabbits|Hares', 'Snake|Snakes|Serpent', 'Horse|Horses', 'Dog|Dogs'],
      ['Monkey|Monkeys', 'Pig|Pigs|Boar|Boars', 'Rooster|Roosters|Chicken|Cock|Cockerel'],
      ['Ox|Oxen|Bull|Cow|Cattle'], ['Goat|Goats|Sheep|Ram|Rams']
    ]
  },
  {
    id: 'n64-karts', category: 'Games',
    prompt: 'Pick a playable racer from Mario Kart 64 on the Nintendo 64.',
    tiers: [
      ['Mario|Super Mario', 'Luigi'],
      ['Bowser|King Koopa'],
      ['Yoshi', 'Princess Peach|Peach|Princess Toadstool'],
      ['Toad|Kinopio', 'Donkey Kong|DK'], [],
      ['Wario']
    ]
  },
  {
    id: 'pokemon-types', category: 'Games',
    prompt: 'Name one of the 18 standard Pokémon types in Pokémon X and Y.',
    tiers: [
      ['Fire|Fire type', 'Water|Water type', 'Grass|Grass type', 'Electric|Electric type'],
      ['Dragon|Dragon type'],
      ['Normal|Normal type', 'Psychic|Psychic type', 'Flying|Flying type', 'Ice|Ice type'],
      ['Dark|Dark type', 'Ghost|Ghost type', 'Poison|Poison type', 'Ground|Ground type', 'Rock|Rock type', 'Fighting|Fighting type'],
      ['Steel|Steel type', 'Fairy|Fairy type'], ['Bug|Bug type']
    ]
  },
  {
    id: 'first-fellowship', category: 'Books',
    prompt: 'Name one of the nine who left Rivendell in Tolkien’s Fellowship of the Ring.',
    tiers: [
      ['Frodo Baggins|Frodo', 'Gandalf|Gandalf the Grey|Gandalf the Gray|Gandalf the White|Mithrandir|Olórin'],
      ['Legolas|Legolas Greenleaf|Greenleaf'],
      ['Aragorn|Strider|Elessar|Aragorn II|Aragorn son of Arathorn', 'Samwise Gamgee|Samwise|Sam|Sam Gamgee'],
      ['Gimli|Gimli son of Glóin', 'Boromir|Boromir son of Denethor'],
      ['Peregrin Took|Pippin|Pippin Took|Peregrin'], ['Meriadoc Brandybuck|Merry|Merry Brandybuck|Meriadoc']
    ]
  },
  {
    id: 'olympic-decathlon', category: 'Sport',
    prompt: 'Name an event in the men’s Olympic track and field decathlon.',
    tiers: [
      ['100 metres|100 meters|100 metre dash|100 meter dash|100m dash|100m|100 m|100 metres sprint|100 meter sprint|100m sprint|100'],
      ['Pole vault|Pole vaulting'],
      ['Long jump|Broad jump', 'High jump', 'Javelin throw|Javelin|Throwing the javelin'],
      ['Shot put|Shotput|Shot putt|Putting the shot', 'Discus throw|Discus', '400 metres|400 meters|400m|400 m|400m dash|400 meter dash|400 metre dash|400'],
      ['110 metres hurdles|110 metre hurdles|110 meters hurdles|110 meter hurdles|110m hurdles|110 m hurdles|110 hurdles|110m high hurdles|Hurdles'],
      ['1500 metres|1500 meters|1500m|1500 m|1500|1500m run|1500 meter run|1500 metre run|Fifteen hundred metres|Fifteen hundred meters']
    ]
  },
  {
    id: 'moon-phases', category: 'Space',
    prompt: 'Name one of the eight standard phases in the lunar cycle.',
    tiers: [
      ['Full Moon|Full', 'New Moon|New'],
      [], ['First quarter|First quarter Moon|1st quarter|1st quarter moon'],
      ['Waxing crescent|Waxing crescent moon', 'Waning crescent|Waning crescent moon'],
      ['Last quarter|Last quarter Moon|Third quarter|Third quarter Moon|3rd quarter|3rd quarter moon', 'Waxing gibbous|Waxing gibbous Moon'],
      ['Waning gibbous|Waning gibbous Moon']
    ]
  },
  {
    id: 'si-units', category: 'Science',
    prompt: 'Name an SI base unit. Its official name or symbol counts.',
    tiers: [
      ['Metre|Meter|m|Metres|Meters', 'Second|s|Seconds'],
      ['Kilogram|kg|Kilograms|Kilogramme|Kilogrammes'],
      ['Kelvin|K|Kelvins'], ['Ampere|Ampères|Amp|Amps|A'],
      ['Mole|mol|Moles'], ['Candela|cd|Candelas|Candelae']
    ]
  },
  {
    id: 'clue-rooms', category: 'Games',
    prompt: 'Name a room on the classic nine-room Clue (Cluedo) board.',
    tiers: [
      ['Kitchen', 'Library'], ['Ballroom|Ball room'],
      ['Dining room|Diningroom', 'Study'],
      ['Lounge', 'Hall'],
      ['Conservatory'], ['Billiard room|Billiards room|Billiardroom|Billiardsroom']
    ]
  },
  {
    id: 'disney-renaissance', category: 'Film',
    prompt: 'Name a Disney Animation feature from the Renaissance era, 1989–1999.',
    tiers: [
      ['The Lion King|Lion King 1994', 'The Little Mermaid|Little Mermaid 1989'],
      ['Aladdin|Aladdin 1992'],
      ['Beauty and the Beast|Beauty & the Beast|Beauty and the Beast 1991', 'Mulan|Mulan 1998'],
      ['Pocahontas|Pocahontas 1995', 'Tarzan|Tarzan 1999', 'Hercules|Hercules 1997'],
      ['The Hunchback of Notre Dame|Hunchback of Notre Dame 1996'], ['The Rescuers Down Under|Rescuers Down Under 1990']
    ]
  },
  {
    id: 'baseball-defense', category: 'Sport',
    prompt: 'Name one of the nine standard defensive positions in baseball.',
    tiers: [
      ['Pitcher|Pitching|P', 'Catcher|C'], ['Shortstop|Short stop|SS'],
      ['First baseman|First base|1st base|1st baseman|1B', 'Center fielder|Centre fielder|Center field|Centre field|Centerfielder|Centrefielder|CF'],
      ['Third baseman|Third base|3rd base|3rd baseman|3B', 'Left fielder|Left field|Leftfielder|LF'],
      ['Right fielder|Right field|Rightfielder|RF'], ['Second baseman|Second base|2nd base|2nd baseman|2B']
    ]
  },
  {
    id: 'western-modes', category: 'Music',
    prompt: 'Name one of the seven musical modes built from the major scale.',
    tiers: [
      ['Ionian|Ionian mode|Major|Major mode|Major scale'],
      ['Dorian|Dorian mode'],
      ['Aeolian|Aeolian mode|Natural minor|Natural minor scale|Natural minor mode'],
      ['Lydian|Lydian mode', 'Mixolydian|Mixolydian mode'],
      ['Phrygian|Phrygian mode'], ['Locrian|Locrian mode']
    ]
  },
  {
    id: 'italian-regions', category: 'Geography',
    prompt: 'Name one of Italy’s twenty regions. English and Italian names count.',
    tiers: [
      ['Tuscany|Toscana', 'Sicily|Sicilia'],
      ['Lombardy|Lombardia'],
      ['Lazio|Latium', 'Sardinia|Sardegna', 'Veneto|Venetia', 'Campania', 'Piedmont|Piemonte'],
      ['Liguria', 'Emilia-Romagna|Emilia Romagna', 'Calabria', 'Puglia|Apulia', 'Umbria', 'Abruzzo|Abruzzi'],
      ['Marche|Le Marche|Marches', 'Aosta Valley|Valle d’Aosta|Vallée d’Aoste', 'Basilicata|Lucania', 'Friuli Venezia Giulia|Friuli-Venezia Giulia', 'Trentino-Alto Adige|Trentino Alto Adige/Südtirol|Trentino South Tyrol|Trentino-Südtirol'],
      ['Molise']
    ]
  },
  {
    id: 'snow-white', category: 'Film',
    prompt: 'Name a dwarf in Disney’s 1937 film Snow White and the Seven Dwarfs.',
    tiers: [
      ['Grumpy', 'Dopey'], [], ['Sleepy', 'Happy'],
      ['Doc'], ['Sneezy'], ['Bashful']
    ]
  },
  {
    id: 'greek-muses', category: 'Mythology',
    prompt: 'Name one of the nine daughters of Mnemosyne known as the Greek Muses.',
    tiers: [
      ['Calliope|Kalliope'], [], ['Clio|Kleio|Cleo', 'Thalia|Thaleia'],
      ['Erato', 'Terpsichore|Terpsikhore', 'Urania|Ourania'],
      ['Melpomene|Melpomenē', 'Euterpe'], ['Polyhymnia|Polymnia']
    ]
  },
  {
    id: 'beatles-records', category: 'Music',
    prompt: 'Name one of the Beatles’ 12 original UK studio LPs released from 1963 to 1970.',
    tiers: [
      ['Abbey Road', 'Sgt. Pepper’s Lonely Hearts Club Band|Sgt Pepper|Sgt Peppers|Sgt Pepper’s Lonely Hearts Club Band|Sergeant Pepper|Sergeant Peppers|Sergeant Pepper’s Lonely Hearts Club Band'],
      ['The Beatles|The White Album|White Album|Self titled|Self-titled'],
      ['Let It Be', 'Help!', 'Revolver'],
      ['Rubber Soul', 'A Hard Day’s Night|Hard Days Night', 'Yellow Submarine'],
      ['Please Please Me', 'With the Beatles'], ['Beatles for Sale']
    ]
  },
  {
    id: 'rainbow-colors', category: 'Art',
    prompt: 'Name one of the seven traditional rainbow colors in the ROYGBIV mnemonic.',
    tiers: [
      ['Red', 'Blue'], ['Violet'], ['Green', 'Yellow'], ['Orange'], [], ['Indigo']
    ]
  },
  {
    id: 'mother-sauces', category: 'Food',
    prompt: 'Name one of the five classic French mother sauces.',
    tiers: [
      ['Béchamel|Béchamel sauce|Sauce béchamel|White sauce'], [], ['Hollandaise|Hollandaise sauce|Sauce hollandaise'],
      ['Tomate|Tomato|Tomato sauce|Sauce tomate|Sauce tomat|Tomat'],
      ['Espagnole|Sauce espagnole|Espagnole sauce|Brown sauce'], ['Velouté|Sauce velouté|Velouté sauce']
    ]
  },
  {
    id: 'planets', category: 'Space',
    prompt: 'Name one of the eight planets that orbit our Sun.',
    tiers: [
      ['Earth|Terra|The Earth', 'Mars'], ['Uranus'],
      ['Jupiter', 'Saturn'], ['Venus'], ['Mercury'], ['Neptune']
    ]
  },
  {
    id: 'us-states', category: 'Geography',
    prompt: 'Name any of the fifty U.S. states. Postal abbreviations count.',
    tiers: [
      ['California|CA|Calif', 'Texas|TX', 'New York|NY|New York State', 'Florida|FL'],
      ['Hawaii|HI|Hawaiʻi', 'Alaska|AK'],
      ['Washington|WA|Washington State', 'Ohio|OH', 'Georgia|GA', 'Michigan|MI', 'Illinois|IL', 'Pennsylvania|PA|Penna', 'Massachusetts|MA|Mass', 'New Jersey|NJ', 'Nevada|NV', 'Colorado|CO', 'Arizona|AZ', 'Oregon|OR'],
      ['Alabama|AL', 'Arkansas|AR', 'Connecticut|CT|Conn', 'Indiana|IN', 'Iowa|IA', 'Kansas|KS', 'Kentucky|KY', 'Louisiana|LA', 'Maryland|MD', 'Minnesota|MN', 'Mississippi|MS', 'Missouri|MO', 'North Carolina|NC', 'Oklahoma|OK', 'South Carolina|SC', 'Tennessee|TN', 'Utah|UT', 'Virginia|VA', 'Wisconsin|WI'],
      ['Delaware|DE|Del', 'Idaho|ID', 'Maine|ME', 'Montana|MT', 'Nebraska|NE|Nebr', 'New Hampshire|NH', 'New Mexico|NM', 'North Dakota|ND', 'Rhode Island|RI', 'South Dakota|SD', 'Vermont|VT', 'West Virginia|WV'],
      ['Wyoming|WY']
    ]
  },
  {
    id: 'chess-pieces', category: 'Games',
    prompt: 'Name one of the six different kinds of pieces on a standard chessboard.',
    tiers: [
      ['King|Kings', 'Queen|Queens'], [], ['Pawn|Pawns'], ['Knight|Knights|Horse|Horses'],
      ['Bishop|Bishops'], ['Rook|Rooks|Castle|Castles']
    ]
  },
  {
    id: 'pixar-first-ten', category: 'Film',
    prompt: 'Name one of Pixar’s first ten feature films, from 1995 through 2009.',
    tiers: [
      ['Toy Story', 'Finding Nemo'], ['WALL-E|WALL·E|Wall E|Walle'],
      ['The Incredibles|Incredibles', 'Up', 'Cars'],
      ['Monsters, Inc.|Monsters Inc|Monsters Incorporated', 'Ratatouille'],
      ['Toy Story 2|Toy Story II|Toy Story Two'], ['A Bug’s Life|Bugs Life']
    ]
  }
];

export function normalizeAnswer(text) {
  if (typeof text !== 'string') return '';
  return text.normalize('NFKD')
    .toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/[’'ʻʼ`.]/gu, '')
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}+#%]+/gu, ' ')
    .trim()
    .replace(/^(?:the|an|a)\s+/, '');
}

const answerMaps = new Map();

export const bank = questions.map(({ id, category, prompt, tiers }) => {
  const index = new Map();
  for (const [tier, entries] of tiers.entries()) {
    for (const entry of entries) {
      const [canonical, ...aliases] = entry.split('|');
      const grade = Object.freeze({ tier, canonical });
      for (const spelling of [canonical, ...aliases]) {
        const key = normalizeAnswer(spelling);
        const existing = index.get(key);
        if (!key || (existing && existing.canonical !== canonical)) {
          throw new Error(`Ambiguous answer "${spelling}" in ${id}`);
        }
        index.set(key, grade);
      }
    }
  }
  const [gem] = tiers[5][0].split('|');
  answerMaps.set(id, index);
  return Object.freeze({ id, category, prompt, gem });
});

// Work within a word so correcting a spelling can't introduce a second answer
// or change a qualifier such as a sequel number.
function oneLetterEdit(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  while (i < left.length && left[i] === right[i]) i++;
  if (left.length < right.length) return left.slice(i) === right.slice(i + 1);
  if (right.length < left.length) return left.slice(i + 1) === right.slice(i);
  if (left.slice(i + 1) === right.slice(i + 1)) return true;
  return left[i] === right[i + 1] && left[i + 1] === right[i]
    && left.slice(i + 2) === right.slice(i + 2);
}

function isCloseSpelling(guess, known) {
  if (known.length !== guess.length) return false;
  let edits = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === known[i]) continue;
    if (++edits > 1 || Math.min(guess[i].length, known[i].length) < 4
      || !oneLetterEdit(guess[i], known[i])) return false;
  }
  return edits === 1;
}

export function offlineGrade(questionId, answer) {
  const index = answerMaps.get(questionId);
  if (!index || typeof answer !== 'string') return null;
  const key = normalizeAnswer(answer);
  const exact = index.get(key);
  if (exact) return exact;
  if (key.replaceAll(' ', '').length < 6 || !/^[\p{L}\p{M} '’ʼʻ.-]+$/u.test(answer.trim())) return null;
  const guess = key.split(' ');
  let match = null;
  for (const [alias, grade] of index) {
    if (Math.abs(alias.length - key.length) > 1 || alias.replaceAll(' ', '').length < 6
      || !/^[\p{L} ]+$/u.test(alias) || !isCloseSpelling(guess, alias.split(' '))) continue;
    if (match && match !== grade) return null;
    match = grade;
  }
  return match;
}
