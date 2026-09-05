import { describe, expect, it } from 'vitest';
import { assessListing, buildVariantProfile, detectVariantMismatch, extractSignals } from '../matching';

describe('detecting listings that are not the product', () => {
  const cases: [string, string][] = [
    ['Nintendo Switch carry case only - no console', 'accessoryOnly'],
    ['Empty box for PlayStation 5 Digital Edition', 'emptyPackaging'],
    ['Xbox Series X replacement shell housing', 'partOrComponent'],
    ['Job lot 12 x PS4 games bundle', 'multipleItems'],
    ['Nintendo Switch spares or repair not working', 'notWorking'],
    ['FIFA 24 digital download code', 'digitalOrCode'],
    ['Replica Game Boy unofficial third-party console', 'replicaOrUnofficial'],
  ];

  it.each(cases)('%s -> %s', (title, reason) => {
    const assessment = assessListing(title);
    expect(assessment.isComparable).toBe(false);
    expect(assessment.exclusions.map((e) => e.reason)).toContain(reason);
  });

  it('leaves a genuine listing alone', () => {
    const assessment = assessListing('Nintendo Switch OLED Console 64GB White - Boxed');
    expect(assessment.isComparable).toBe(true);
    expect(assessment.exclusions).toHaveLength(0);
  });

  it('reports the exact words it matched so the reason can be checked', () => {
    const assessment = assessListing('PS5 console - SPARES OR REPAIR');
    const exclusion = assessment.exclusions.find((e) => e.reason === 'notWorking')!;
    expect(exclusion.matched.toLowerCase()).toContain('spares or repair');
    expect(exclusion.explanation).toBeTruthy();
  });
});

describe('cautions that warn without excluding', () => {
  const cases: [string, string][] = [
    ['iPhone 12 untested no charger', 'untested'],
    ['Nintendo DSi sold as seen', 'soldAsSeen'],
    ['iPhone 11 icloud locked', 'accountLocked'],
    ['Nintendo Switch no charger included', 'missingAccessory'],
    ['Game Boy Advance cracked screen', 'cosmeticDamage'],
    ['Zelda Ocarina of Time cart only', 'incomplete'],
    ['Casio calculator - please read description', 'readDescription'],
  ];

  it.each(cases)('%s -> %s', (title, reason) => {
    const assessment = assessListing(title);
    expect(assessment.cautions.map((c) => c.reason)).toContain(reason);
  });

  it('keeps a cautioned listing comparable', () => {
    const assessment = assessListing('Nintendo Switch console, untested, no charger');
    expect(assessment.isComparable).toBe(true);
    expect(assessment.cautions.length).toBeGreaterThan(0);
  });

  it('reads cautions from the description too', () => {
    const assessment = assessListing('Nintendo Switch console', 'Great condition. Note: sold as seen, no returns.');
    const reasons = assessment.cautions.map((c) => c.reason);
    expect(reasons).toContain('soldAsSeen');
    expect(reasons).toContain('noReturns');
  });
});

describe('extractSignals', () => {
  it('normalises capacity to gigabytes', () => {
    expect(extractSignals('PS5 825GB console').capacityGb).toBe(825);
    expect(extractSignals('Xbox Series X 1TB').capacityGb).toBe(1024);
  });

  it('picks up generation, edition and region', () => {
    expect(extractSignals('Xbox Series X console').generation).toBe('series x');
    expect(extractSignals('Skyrim Game of the Year edition').edition).toBe('game of the year');
    expect(extractSignals('Mario Kart PAL version').region).toBe('pal');
  });

  it('finds model codes, which matter for calculators', () => {
    expect(extractSignals('Casio FX-991EX Classwiz scientific calculator').modelCodes).toContain('fx-991ex');
    expect(extractSignals('Texas Instruments TI-84 Plus CE').modelCodes).toContain('ti-84');
  });

  it('does not mistake a year for a model code', () => {
    expect(extractSignals('FIFA 2024 game').modelCodes).not.toContain('2024');
  });
});

describe('variant mismatch', () => {
  function profileOf(titles: string[]) {
    return buildVariantProfile(titles.map((t) => assessListing(t)));
  }

  it('flags the odd capacity out when the sample agrees', () => {
    const titles = Array.from({ length: 10 }, () => 'PS5 825GB console');
    const profile = profileOf(titles);
    expect(profile.capacityGb).toBe(825);

    const odd = assessListing('PS5 2TB console');
    expect(detectVariantMismatch(odd, profile)?.reason).toBe('variantMismatch');
  });

  it('stays quiet when the sample is too small or too mixed to judge', () => {
    const mixed = profileOf(['PS5 825GB console', 'PS5 1TB console', 'PS5 2TB console']);
    const odd = assessListing('PS5 500GB console');
    expect(detectVariantMismatch(odd, mixed)).toBeNull();
  });

  it('says nothing about a listing with no capacity stated', () => {
    const profile = profileOf(Array.from({ length: 10 }, () => 'PS5 825GB console'));
    expect(detectVariantMismatch(assessListing('PS5 console boxed'), profile)).toBeNull();
  });
});
