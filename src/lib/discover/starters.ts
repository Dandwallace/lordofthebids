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

/** Human readable text, in each supported interface language. */
export interface Localised<T> {
  en: T;
  es: T;
}

export interface StarterCategory {
  id: string;
  title: Localised<string>;
  icon: 'gamepad' | 'calculator' | 'dice' | 'camera' | 'tool';
  /** Why this is a reasonable place for a beginner to start looking. */
  why: Localised<string>;
  /** What actually decides whether a listing is worth buying. */
  checks: Localised<string[]>;
  /** Searches that put you in the right part of the site. */
  searches: string[];
  /** The fee category these usually fall under. */
  suggestedCategory: 'videoGamesAndConsoles' | 'boardGamesAndPuzzles' | 'techAndElectronics' | 'general';
}

export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    id: 'console-games',
    title: { en: 'Physical console games', es: 'Juegos físicos de consola' },
    icon: 'gamepad',
    why: {
      en: 'Titles are exact, so two listings of the same game are genuinely comparable. They are small, light, hard to damage in the post, and easy to check: the disc or cartridge either reads or it does not.',
      es: 'Los títulos son exactos, así que dos anuncios del mismo juego son realmente comparables. Son pequeños, ligeros, difíciles de dañar en el envío y fáciles de comprobar: el disco o cartucho lee o no lee.',
    },
    checks: {
      en: [
        'Disc or cartridge present, not just the case or the inlay',
        'Region matches what local buyers want (PAL, or region free)',
        'Scratches on the play surface, and whether the case and manual are there',
        'The exact edition: game of the year, remastered and standard are different products',
      ],
      es: [
        'Que esté el disco o el cartucho, no solo la caja o la carátula',
        'Que la región sirva a los compradores locales (PAL o libre de región)',
        'Rayaduras en la cara de lectura, y si están la caja y el manual',
        'La edición exacta: game of the year, remasterizado y estándar son productos distintos',
      ],
    },
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
    title: { en: 'Branded calculators', es: 'Calculadoras de marca' },
    icon: 'calculator',
    why: {
      en: 'Model numbers such as FX-991EX or TI-84 identify the exact product with no ambiguity, which makes comparison unusually reliable. School and university demand is steady, and they are cheap to post.',
      es: 'Los números de modelo como FX-991EX o TI-84 identifican el producto exacto sin ambigüedad, lo que hace la comparación inusualmente fiable. La demanda escolar y universitaria es constante y el envío es barato.',
    },
    checks: {
      en: [
        'Exact model number, including the suffix: FX-991EX and FX-991ES are different',
        'Screen works and every key responds',
        'Battery cover and slide case present, as both are commonly lost',
        'Not a counterfeit: cheap copies of popular Casio and TI models are common',
      ],
      es: [
        'Número de modelo exacto, con sufijo: FX-991EX y FX-991ES no son lo mismo',
        'Que la pantalla funcione y respondan todas las teclas',
        'Que estén la tapa de pilas y la funda, porque se pierden a menudo',
        'Que no sea falsificación: abundan las copias baratas de modelos Casio y TI',
      ],
    },
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
    title: { en: 'Complete board games', es: 'Juegos de mesa completos' },
    icon: 'dice',
    why: {
      en: 'Completeness is the entire value: the same game is worth much more with all its pieces. That gap is visible in the listings, and sellers who cannot confirm completeness price low.',
      es: 'Estar completo lo es todo: el mismo juego vale mucho más con todas sus piezas. Esa diferencia se ve en los anuncios, y quien no puede confirmar que está completo pone precio bajo.',
    },
    checks: {
      en: [
        'Every piece present, counted against the rulebook contents list',
        'Which edition and printing, since reprints and originals differ in value',
        'Box condition, as collectors care and casual players do not',
        'Weight and box size, because postage can quietly eat the margin',
      ],
      es: [
        'Que estén todas las piezas, contadas contra la lista del reglamento',
        'Qué edición e impresión, porque reediciones y originales valen distinto',
        'Estado de la caja: a los coleccionistas les importa, a los jugadores casuales no',
        'Peso y tamaño de la caja, porque el envío se puede comer el margen',
      ],
    },
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
    title: { en: 'Film cameras and lenses', es: 'Cámaras de carrete y objetivos' },
    icon: 'camera',
    why: {
      en: 'Model names are specific and there is an active buyer base. Sellers who inherited a camera often cannot test it, which is exactly where a careful buyer finds room.',
      es: 'Los nombres de modelo son específicos y hay una base de compradores activa. Quien hereda una cámara a menudo no puede probarla, y ahí es donde un comprador cuidadoso encuentra margen.',
    },
    checks: {
      en: [
        'Shutter fires at every speed, and the light meter responds',
        'Fungus, haze or separation in the lens elements',
        'Light seals, which perish with age and are cheap to replace',
        'Whether "untested" means unknown or means broken',
      ],
      es: [
        'Que el obturador dispare a todas las velocidades y responda el fotómetro',
        'Hongos, neblina o separación en las lentes',
        'Las juntas de luz, que se degradan con los años y son baratas de cambiar',
        'Si "sin probar" significa desconocido o significa roto',
      ],
    },
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
    title: { en: 'Branded power tools', es: 'Herramientas eléctricas de marca' },
    icon: 'tool',
    why: {
      en: 'Trade brands hold value and buyers search by exact model. Bare tools sold without a battery often go cheap because the seller has no way to demonstrate them.',
      es: 'Las marcas profesionales mantienen su valor y los compradores buscan por modelo exacto. Las herramientas sin batería suelen ir baratas porque el vendedor no puede demostrarlas.',
    },
    checks: {
      en: [
        'Whether a battery and charger are included, as this changes the value substantially',
        'Model number and voltage, which vary widely within one range',
        'Whether it runs, and whether the chuck or blade guard is intact',
        'Weight, since tools are among the most expensive things to post',
      ],
      es: [
        'Si incluye batería y cargador, porque cambia mucho el valor',
        'Número de modelo y voltaje, que varían mucho dentro de una misma gama',
        'Si arranca, y si el portabrocas o el protector están intactos',
        'El peso, porque las herramientas están entre lo más caro de enviar',
      ],
    },
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
