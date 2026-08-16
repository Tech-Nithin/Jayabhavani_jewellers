// English to Telugu Transliteration & Auto-Translation Utility

const transliterationCache: Record<string, string> = {
  siddipet: 'సిద్దిపేట',
  patelpura: 'పటేల్‌పురా',
  hyderabad: 'హైదరాబాద్',
  secunderabad: 'సికింద్రాబాద్',
  karimnagar: 'కరీంనగర్',
  warangal: 'వరంగల్',
  gajwel: 'గజ్వేల్',
  dubbak: 'దుబ్బాక',
  medak: 'మెదక్',
  telangana: 'తెలంగాణ',
  india: 'భారతదేశం',
  chinna: 'చిన్న',
  kodur: 'కోడూర్',
  koduru: 'కోడూరు',
  ramesh: 'రమేష్',
  suresh: 'సురేష్',
  mahesh: 'మహేష్',
  kumar: 'కుమార్',
  rao: 'రావు',
  reddy: 'రెడ్డి',
  gupta: 'గుప్తా',
  sharma: 'శర్మ',
  verma: 'వర్మ',
};

async function transliterateSingleWord(word: string): Promise<string> {
  const lower = word.toLowerCase();
  if (transliterationCache[lower]) return transliterationCache[lower];

  // If browser is offline, immediately return original English word
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return word;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1-second strict timeout

    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&ime=te-t-i0-und&num=1`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
        const result = data[1][0][1][0];
        transliterationCache[lower] = result;
        return result;
      }
    }
  } catch {
    // If network fails, times out, or offline -> safely fall back to original English word
  }

  return word;
}

/**
 * Asynchronously translates/transliterates a full multi-word English address or name to Telugu
 */
export async function getTeluguTransliteration(text: string): Promise<string> {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  
  if (/[\u0C00-\u0C7F]/.test(trimmed)) return trimmed;

  const fullKey = trimmed.toLowerCase();
  if (transliterationCache[fullKey]) return transliterationCache[fullKey];

  // Tokenize words, numbers, and punctuation
  const tokens = trimmed.match(/[\w']+|[^\w\s]+/g) || [trimmed];
  const translatedTokens: string[] = [];

  for (const tok of tokens) {
    if (/^[^\w\s]+$/.test(tok) || /^\d+$/.test(tok)) {
      translatedTokens.push(tok);
    } else {
      const translatedWord = await transliterateSingleWord(tok);
      translatedTokens.push(translatedWord);
    }
  }

  let result = '';
  for (let i = 0; i < translatedTokens.length; i++) {
    const tok = translatedTokens[i];
    if (i > 0 && /[\w\u0C00-\u0C7F\d]/.test(tok) && /[\w\u0C00-\u0C7F\d]/.test(translatedTokens[i - 1])) {
      result += ' ';
    } else if (i > 0 && /[\w\u0C00-\u0C7F\d]/.test(tok) && translatedTokens[i - 1] === ',') {
      result += ' ';
    }
    result += tok;
  }

  transliterationCache[fullKey] = result;
  return result;
}

/**
 * Synchronous phonetic fallback dictionary & rule mapper
 */
export function getTeluguTransliterationSync(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  if (/[\u0C00-\u0C7F]/.test(trimmed)) return trimmed;

  const fullKey = trimmed.toLowerCase();
  if (transliterationCache[fullKey]) return transliterationCache[fullKey];

  const tokens = trimmed.match(/[\w']+|[^\w\s]+/g) || [trimmed];
  const translatedTokens = tokens.map((tok) => {
    if (/^[^\w\s]+$/.test(tok) || /^\d+$/.test(tok)) return tok;
    const lower = tok.toLowerCase();
    return transliterationCache[lower] || tok;
  });

  let result = '';
  for (let i = 0; i < translatedTokens.length; i++) {
    const tok = translatedTokens[i];
    if (i > 0 && /[\w\u0C00-\u0C7F\d]/.test(tok) && /[\w\u0C00-\u0C7F\d]/.test(translatedTokens[i - 1])) {
      result += ' ';
    } else if (i > 0 && /[\w\u0C00-\u0C7F\d]/.test(tok) && translatedTokens[i - 1] === ',') {
      result += ' ';
    }
    result += tok;
  }

  return result;
}
