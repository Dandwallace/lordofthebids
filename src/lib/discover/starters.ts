/**
 * Starter categories for someone who does not yet know what to look for.
 *
 * IMPORTANT, AND THE WHOLE POINT OF THIS FILE'S HONESTY:
 * These are curated starting points written by hand. They are NOT market
 * evidence. No demand figure, sold price, margin or opportunity score is
 * claimed for any of them, because this app has no access to sold data
 * and inventing one would be worse than saying nothing.
 *
 * What each entry gives you is a place to point the scanner and a list of
 * things that decide whether a particular listing is worth buying. The
 * evidence only appears after a scan, and it comes from live listings.
 */

export interface StarterCategory {
  id: string;
  title: string;
  icon: 'gamepad' | 'calculator' | 'dice' | 'camera' | 'tool';
  /** Why this is a reasonable place for a beginner to start looking. */
  why: string;
  /** What actually decides whether a listing is worth buying. */
  checks: string[];
  /** Searches that put you in the right part of the site. */
  searches: string[];
  /** The fee category these usually fall under. */
  suggestedCategory: 'videoGamesAndConsoles' | 'boardGamesAndPuzzles' | 'techAndElectronics' | 'general';
}

export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    id: 'console-games',
    title: 'Physical console games',
    icon: 'gamepad',
    why: 'Titles are exact, so two listings of the same game are genuinely comparable. They are small, light, hard to damage in the post, and easy to check: the disc or cartridge either reads or it does not.',
    checks: [
      'Disc or cartridge present, not just the case or the inlay',
      'Region matches what UK buyers want (PAL, or region free)',
      'Scratches on the play surface, and whether the case and manual are there',
      'The exact edition: game of the year, remastered and standard are different products',
    ],
    searches: [
      'nintendo switch game complete',
      'ps4 game disc complete',
      'gamecube game complete boxed',
      'nintendo ds game boxed complete',
    ],
    suggestedCategory: 'videoGamesAndConsoles',
  },
  {
    id: 'branded-calculators',
    title: 'Branded calculators',
    icon: 'calculator',
    why: 'Model numbers such as FX-991EX or TI-84 identify the exact product with no ambiguity, which makes comparison unusually reliable. School and university demand is steady, and they are cheap to post.',
    checks: [
      'Exact model number, including the suffix: FX-991EX and FX-991ES are different',
      'Screen works and every key responds',
      'Battery cover and slide case present, as both are commonly lost',
      'Not a counterfeit: cheap copies of popular Casio and TI models are common',
    ],
    searches: [
      'casio fx-991ex classwiz',
      'texas instruments ti-84 plus',
      'casio fx-83gtx scientific calculator',
      'hp 12c financial calculator',
    ],
    suggestedCategory: 'techAndElectronics',
  },
  {
    id: 'board-games',
    title: 'Complete board games',
    icon: 'dice',
    why: 'Completeness is the entire value: the same game is worth much more with all its pieces. That gap is visible in the listings, and sellers who cannot confirm completeness price low.',
    checks: [
      'Every piece present, counted against the rulebook contents list',
      'Which edition and printing, since reprints and originals differ in value',
      'Box condition, as collectors care and casual players do not',
      'Weight and box size, because postage can quietly eat the margin',
    ],
    searches: [
      'board game complete all pieces',
      'catan board game complete',
      'ticket to ride board game complete',
      'warhammer boxed set complete',
    ],
    suggestedCategory: 'boardGamesAndPuzzles',
  },
  {
    id: 'film-cameras',
    title: 'Film cameras and lenses',
    icon: 'camera',
    why: 'Model names are specific and there is an active buyer base. Sellers who inherited a camera often cannot test it, which is exactly where a careful buyer finds room.',
    checks: [
      'Shutter fires at every speed, and the light meter responds',
      'Fungus, haze or separation in the lens elements',
      'Light seals, which perish with age and are cheap to replace',
      'Whether "untested" means unknown or means broken',
    ],
    searches: [
      'canon ae-1 film camera',
      '35mm slr film camera working',
      'olympus om-1 camera',
      'vintage camera lens m42',
    ],
    suggestedCategory: 'techAndElectronics',
  },
  {
    id: 'power-tools',
    title: 'Branded power tools',
    icon: 'tool',
    why: 'Trade brands hold value and buyers search by exact model. Bare tools sold without a battery often go cheap because the seller has no way to demonstrate them.',
    checks: [
      'Whether a battery and charger are included, as this changes the value substantially',
      'Model number and voltage, which vary widely within one range',
      'Whether it runs, and whether the chuck or blade guard is intact',
      'Weight, since tools are among the most expensive things to post',
    ],
    searches: [
      'makita cordless drill body only',
      'dewalt 18v tool bare unit',
      'bosch professional drill',
      'milwaukee m18 tool',
    ],
    suggestedCategory: 'general',
  },
];

/** Bounded so one Discover run can never eat the daily API allowance. */
export const MAX_DISCOVER_SEARCHES = 6;
