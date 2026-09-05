/**
 * Reading what a listing is actually selling.
 *
 * A keyword search for "nintendo switch" returns the console, a carry
 * case for the console, a photo of the console, a broken console for
 * spares, a box with no console in it, and a job lot of five. Averaging
 * their prices produces a number that describes nothing.
 *
 * Trimming price outliers does not fix this. A £15 empty box sits inside
 * the interquartile fence for a £40 game and quietly drags the reference
 * price down. So listings are read, not just priced: this module decides
 * what each one is selling, and anything that is not the product itself
 * is kept out of the comparison set and labelled.
 *
 * SAFETY: titles and descriptions are seller controlled text. They are
 * treated as data only. Nothing here interprets them as instructions, and
 * matched text is only ever returned for display, never executed.
 */

/** Why a listing cannot serve as a comparable for the product. */
export type ExclusionReason =
  | 'accessoryOnly'
  | 'emptyPackaging'
  | 'partOrComponent'
  | 'multipleItems'
  | 'notWorking'
  | 'digitalOrCode'
  | 'replicaOrUnofficial'
  | 'variantMismatch';

/** Something to check before buying, but not a reason to exclude. */
export type CautionReason =
  | 'untested'
  | 'soldAsSeen'
  | 'accountLocked'
  | 'missingAccessory'
  | 'cosmeticDamage'
  | 'incomplete'
  | 'noReturns'
  | 'readDescription';

export interface DetectedPhrase {
  /** The exact words found in the listing, for display. */
  matched: string;
  label: string;
  explanation: string;
}

export interface Exclusion extends DetectedPhrase {
  reason: ExclusionReason;
}

export interface Caution extends DetectedPhrase {
  reason: CautionReason;
}

interface Rule<R> {
  reason: R;
  label: string;
  explanation: string;
  pattern: RegExp;
}

/**
 * Phrases that mean the listing is not selling the product itself.
 * Ordered most specific first so the clearest explanation wins.
 */
const EXCLUSION_RULES: Rule<ExclusionReason>[] = [
  {
    reason: 'emptyPackaging',
    label: 'Empty packaging',
    explanation: 'The listing appears to be packaging or inserts with no product inside.',
    pattern:
      /\b(empty\s+(box|case|packaging)|box\s+only|case\s+only|packaging\s+only|no\s+(game|console|disc|item)\s+included|inlay\s+only|artwork\s+only|manual\s+only|instructions?\s+only)\b/i,
  },
  {
    reason: 'partOrComponent',
    label: 'Part or component',
    explanation: 'This is a replacement part or a single component, not the complete product.',
    pattern:
      /\b(spare\s+parts?|replacement\s+(part|screen|battery|shell|housing|lcd|digitizer)|(screen|battery|shell|housing|lcd|motherboard|logic\s*board|button|hinge|flex\s*cable)\s+only|for\s+spares)\b/i,
  },
  {
    reason: 'accessoryOnly',
    label: 'Accessory only',
    explanation: 'This is an accessory for the product rather than the product itself.',
    pattern:
      /\b((carry|carrying|travel|storage)\s+(case|bag|pouch)|(case|cover|sleeve|skin|stand|dock|mount|strap|lanyard|screen\s*protector|charger|charging\s+(cable|cradle|dock)|cable|adapter|adaptor|power\s+supply|psu|stylus|grip)\s+(only|for)|compatible\s+with)\b/i,
  },
  {
    reason: 'multipleItems',
    label: 'Bundle or job lot',
    explanation: 'Several items sold together, so the price does not describe a single unit.',
    pattern:
      /\b(job\s*lot|joblot|bulk\s+(lot|buy)|wholesale|bundle\s+of|collection\s+of|(\d{1,3})\s*x\s*(games?|consoles?|items?|units?)|x\s?([2-9]|\d{2,})\b|set\s+of\s+\d+|multi[\s-]?buy|\bpallet\b)/i,
  },
  {
    reason: 'notWorking',
    label: 'Not working',
    explanation: 'Sold as faulty or for repair, so it is not comparable to a working unit.',
    pattern:
      /\b(spares?\s*(or|\/|&)\s*repairs?|for\s+parts?(\s+or\s+not\s+working)?|not\s+working|doesn'?t\s+work|does\s+not\s+work|faulty|broken|dead|damaged|repair\s+only|as\s+spares)\b/i,
  },
  {
    reason: 'digitalOrCode',
    label: 'Digital or code',
    explanation: 'A download code or digital item, not a physical product you can resell as one.',
    pattern:
      /\b(digital\s+(code|download|copy|version)|download\s+code|(game|product|activation|redemption)\s+code|code\s+only|key\s+only|no\s+disc)\b/i,
  },
  {
    reason: 'replicaOrUnofficial',
    label: 'Replica or unofficial',
    explanation: 'Not a genuine first party item, so it does not share the same market value.',
    pattern: /\b(replica|reproduction|repro\b|fake|copy\s+of|unofficial|third[\s-]?party|clone|knock[\s-]?off|aftermarket)\b/i,
  },
];

/** Phrases worth surfacing to the buyer without excluding the listing. */
const CAUTION_RULES: Rule<CautionReason>[] = [
  {
    reason: 'untested',
    label: 'Untested',
    explanation: 'The seller has not confirmed it works. Assume it may not.',
    pattern: /\b(untested|not\s+tested|unable\s+to\s+test|no\s+way\s+to\s+test|cannot\s+test|can'?t\s+test)\b/i,
  },
  {
    reason: 'soldAsSeen',
    label: 'Sold as seen',
    explanation: 'The seller is disclaiming condition. Your recourse is limited.',
    pattern: /\b(sold\s+as\s+seen|as\s+is\b|no\s+guarantee|bought\s+as\s+seen)\b/i,
  },
  {
    reason: 'accountLocked',
    label: 'Locked',
    explanation: 'Network, account or activation locked items are often unsellable until cleared.',
    pattern: /\b(icloud\s*locked|activation\s+lock|network\s+locked|sim\s+locked|locked\s+to\s+\w+|google\s+lock|frp\s+lock|account\s+locked|passcode\s+locked)\b/i,
  },
  {
    reason: 'missingAccessory',
    label: 'Missing parts',
    explanation: 'Something that normally comes with it is absent, which lowers what it fetches.',
    pattern:
      /\b(no\s+(charger|cable|power\s+supply|psu|controller|manual|box|case|battery|lead|remote|stylus|dock)|missing\s+(charger|cable|manual|box|parts?|controller|battery|pieces?|cards?)|without\s+(charger|box|manual|controller))\b/i,
  },
  {
    reason: 'cosmeticDamage',
    label: 'Damage noted',
    explanation: 'Visible damage is disclosed, which affects both price and saleability.',
    pattern: /\b(cracked|crack\b|scratched|scratches|chipped|dented|scuffed|worn|yellowed|water\s+damage|marks?\s+on|discoloured|discolored|sticky)\b/i,
  },
  {
    reason: 'incomplete',
    label: 'May be incomplete',
    explanation: 'Sold without its full contents, which matters most for boxed or boxed-set items.',
    pattern: /\b(disc\s+only|cart(ridge)?\s+only|game\s+only|unboxed|no\s+inlay|incomplete|loose\b|unchecked\s+contents)\b/i,
  },
  {
    reason: 'noReturns',
    label: 'No returns',
    explanation: 'You cannot send it back if it is not as described.',
    pattern: /\b(no\s+returns?|returns?\s+not\s+accepted)\b/i,
  },
  {
    reason: 'readDescription',
    label: 'See description',
    explanation: 'The seller is pointing at a caveat in the description. Read it before bidding.',
    pattern: /\b(read\s+(the\s+)?(full\s+)?description|see\s+description|please\s+read|description\s+for\s+details)\b/i,
  },
];

/** Structured attributes pulled out of a title, used to tell variants apart. */
export interface TitleSignals {
  /** Storage or memory size normalised to gigabytes. */
  capacityGb: number | null;
  /** "series x", "gen 3", "mk2" and similar. */
  generation: string | null;
  /** Manufacturer style model codes such as "fx-991ex" or "ti-84". */
  modelCodes: string[];
  /** "limited edition", "goty", "steelbook" and similar. */
  edition: string | null;
  /** "pal", "ntsc", "japanese import" and similar. */
  region: string | null;
}

const CAPACITY = /\b(\d{1,4})\s*(tb|gb|mb)\b/i;
const GENERATION =
  /\b(series\s+[xs]|gen(?:eration)?\s*\d|mk\s?\d|mark\s?\d|\d(?:st|nd|rd|th)\s+gen(?:eration)?|v\d(?:\.\d)?)\b/i;
const EDITION =
  /\b(limited\s+edition|collector'?s?\s+edition|special\s+edition|deluxe\s+edition|game\s+of\s+the\s+year|goty|anniversary\s+edition|steelbook|definitive\s+edition|remastered|platinum|greatest\s+hits)\b/i;
const REGION = /\b(pal|ntsc(?:-[ju])?|region\s+free|japanese?\s+import|jap(?:an)?\s+import|us\s+import|eu\s+version|uk\s+version)\b/i;
/** Letters then digits, the shape of a real model number. */
const MODEL_CODE = /\b([a-z]{1,5}[-\s]?\d{2,5}[a-z]{0,3})\b/gi;

const CAPACITY_MULTIPLIER: Record<string, number> = { tb: 1024, gb: 1, mb: 1 / 1024 };

export function extractSignals(title: string): TitleSignals {
  const text = title.toLowerCase();

  const capacityMatch = text.match(CAPACITY);
  let capacityGb: number | null = null;
  if (capacityMatch) {
    const size = Number(capacityMatch[1]);
    const unit = capacityMatch[2].toLowerCase();
    const value = size * (CAPACITY_MULTIPLIER[unit] ?? 1);
    // Ignore nonsense like "1gb" on a console or "500mb" on a game.
    if (Number.isFinite(value) && value >= 0.25) capacityGb = value;
  }

  const modelCodes: string[] = [];
  for (const match of text.matchAll(MODEL_CODE)) {
    const code = match[1].replace(/\s+/g, '-');
    // A bare year or a capacity is not a model code.
    if (/^(19|20)\d{2}$/.test(code)) continue;
    if (CAPACITY.test(match[0])) continue;
    if (!modelCodes.includes(code)) modelCodes.push(code);
  }

  return {
    capacityGb,
    generation: text.match(GENERATION)?.[0].replace(/\s+/g, ' ').trim() ?? null,
    modelCodes: modelCodes.slice(0, 4),
    edition: text.match(EDITION)?.[0] ?? null,
    region: text.match(REGION)?.[0] ?? null,
  };
}

export interface ListingAssessment {
  signals: TitleSignals;
  exclusions: Exclusion[];
  cautions: Caution[];
  /** True when nothing suggests this is anything other than the product. */
  isComparable: boolean;
}

function runRules<R>(text: string, rules: Rule<R>[]): (DetectedPhrase & { reason: R })[] {
  const found: (DetectedPhrase & { reason: R })[] = [];
  for (const rule of rules) {
    const match = text.match(rule.pattern);
    if (match) {
      found.push({
        reason: rule.reason,
        matched: match[0].trim(),
        label: rule.label,
        explanation: rule.explanation,
      });
    }
  }
  return found;
}

/**
 * Reads a listing's title, and its description when one is available.
 * Descriptions are noisy, so only exclusions with unambiguous wording are
 * taken from them; cautions are read from both.
 */
export function assessListing(title: string, description?: string | null): ListingAssessment {
  const safeTitle = title ?? '';
  const exclusions = runRules(safeTitle, EXCLUSION_RULES) as Exclusion[];
  const cautions = runRules(safeTitle, CAUTION_RULES) as Caution[];

  if (description) {
    // Cap the length read: descriptions can be enormous, and this is a
    // scan for phrases, not a document parser.
    const snippet = description.slice(0, 4000);
    for (const caution of runRules(snippet, CAUTION_RULES) as Caution[]) {
      if (!cautions.some((existing) => existing.reason === caution.reason)) cautions.push(caution);
    }
  }

  return {
    signals: extractSignals(safeTitle),
    exclusions,
    cautions,
    isComparable: exclusions.length === 0,
  };
}

/**
 * The most common variant in a set of comparables, used to spot listings
 * that match the words but not the product.
 */
export interface VariantProfile {
  capacityGb: number | null;
  generation: string | null;
  edition: string | null;
  /** How many of the sample shared the dominant capacity. */
  capacityAgreement: number;
  sampleSize: number;
}

function modeOf<T>(values: T[]): { value: T | null; count: number } {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return { value: best, count: bestCount };
}

export function buildVariantProfile(assessments: ListingAssessment[]): VariantProfile {
  const comparable = assessments.filter((a) => a.isComparable);
  const capacities = comparable.map((a) => a.signals.capacityGb).filter((c): c is number => c !== null);
  const generations = comparable.map((a) => a.signals.generation).filter((g): g is string => g !== null);
  const editions = comparable.map((a) => a.signals.edition).filter((e): e is string => e !== null);

  const capacityMode = modeOf(capacities);

  return {
    capacityGb: capacityMode.value,
    generation: modeOf(generations).value,
    edition: modeOf(editions).value,
    capacityAgreement: capacities.length > 0 ? capacityMode.count / capacities.length : 0,
    sampleSize: comparable.length,
  };
}

/**
 * Flags a listing whose stated variant disagrees with the dominant one.
 * Only fires when the sample is clear enough to be worth trusting: a
 * scattered set of capacities means the search itself is broad, and
 * calling one listing the odd one out would be noise.
 */
export function detectVariantMismatch(
  assessment: ListingAssessment,
  profile: VariantProfile,
): Exclusion | null {
  const { capacityGb } = assessment.signals;
  if (
    capacityGb !== null &&
    profile.capacityGb !== null &&
    profile.capacityAgreement >= 0.6 &&
    profile.sampleSize >= 8 &&
    capacityGb !== profile.capacityGb
  ) {
    const format = (gb: number) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);
    return {
      reason: 'variantMismatch',
      matched: format(capacityGb),
      label: 'Different capacity',
      explanation: `Most comparable listings are ${format(profile.capacityGb)}, so this is a different variant and its price is not comparable.`,
    };
  }
  return null;
}
