import {describe, it, expect} from 'vitest';

import {
  getCommaNames,
  getTemperamentData,
  namedComma,
  namedTemperament,
} from '../names';
import {Temperament} from 'temperaments';
import {
  arraysEqual,
  Fraction,
  toMonzo,
  toMonzoAndResidual,
} from 'xen-dev-utils';

describe('Temperament namer', () => {
  it('knows about meantone', () => {
    const temperament = Temperament.fromPrefix(2, [1, 4], 5);
    temperament.canonize();
    const data = getTemperamentData(temperament)!;
    expect(data.title).toBe('Meantone');
    expect(
      data.vals!.map(val => temperament.subgroup.toWarts(val)).join('&')
    ).toBe('5&7');
  });

  it('knows about augmented', () => {
    const temperament = Temperament.fromPrefix(2, [3, 0], 5);
    temperament.canonize();
    expect(getTemperamentData(temperament)!.title).toBe('Augmented');
  });

  it('knows about semaphore', () => {
    const temperament = Temperament.fromPrefix(2, [2, 1], '2.3.7');
    temperament.canonize();
    expect(getTemperamentData(temperament)!.title).toBe('Semaphore');
  });

  it('knows about miracle', () => {
    const temperament = Temperament.fromPrefix(2, [6, -7, -2], 7);
    temperament.canonize();
    expect(getTemperamentData(temperament)!.title).toBe('Miracle');
  });

  it('knows about blackwood', () => {
    const limma = toMonzoAndResidual(new Fraction(256, 243), 3)[0];
    const temperament = Temperament.fromCommas([limma], 5);
    temperament.canonize();
    const data = getTemperamentData(temperament)!;
    expect(data.title).toBe('Blacksmith');
    expect(data.subtitle).toBe('5-limit (blackwood)');
  });

  it('knows about fractional subgroup temperaments like haumea', () => {
    const subgroup = '2.3.7/5.11/5.13/5';
    const commas = [
      [5, -3, 0, 1, -1],
      [2, -3, 0, 0, 2],
      [0, 0, 1, 2, -2],
    ];
    const temperament = Temperament.fromCommas(commas, subgroup);
    temperament.canonize();
    expect(getTemperamentData(temperament)!.title).toBe('Haumea');
  });

  it('knows about rank 3 temperaments like starling', () => {
    const temperament = Temperament.fromCommas(['126/125']).canonize();
    expect(getTemperamentData(temperament)!.title).toBe('Starling');
  });
});

describe('Temperament retriever', () => {
  it('can retrieve meantone', () => {
    const temperament = namedTemperament('Meantone', 5);
    expect(temperament.tune('81/80')).toBeCloseTo(0);
  });

  it('can retrieve tritonic', () => {
    const temperament = namedTemperament('Tritonic', 7);
    expect(temperament.tune('225/224')).toBeCloseTo(0);
    expect(temperament.tune('50421/50000')).toBeCloseTo(0);
  });

  it('can retrieve marvel', () => {
    const temperament = namedTemperament('Marvel', 7);
    expect(temperament.getRank()).toBe(3);
    expect(temperament.tune('225/224')).toBeCloseTo(0);
  });
});

describe('Comma namer', () => {
  it('knows about the syntonic comma', () => {
    expect(getCommaNames([-4, 4, -1]).includes('syntonic comma')).toBeTruthy();
  });

  it('knows about the breedsma', () => {
    expect(
      getCommaNames(toMonzo(new Fraction(2401, 2400))).includes('breedsma')
    ).toBeTruthy();
  });

  it('knows about neutrino', () => {
    expect(
      getCommaNames([1889, -2145, 138, 424]).includes('neutrino')
    ).toBeTruthy();
  });

  it("doesn't know about intervals larger than the octave", () => {
    expect(getCommaNames([-2, 2]).length).toBe(0);
  });

  it("doesn't know about about this comma I just made up", () => {
    expect(getCommaNames([1, 2, 3, 4, 5]).length).toBe(0);
  });
});

describe('Comma retriever', () => {
  it('knows about ragisma', () => {
    const comma = namedComma('ragisma', true);
    expect(arraysEqual(comma, [-1, -7, 4, 1])).toBeTruthy();
  });

  it('can reproduce an example from README.md', () => {
    const pinkan = Temperament.fromCommas(
      [namedComma('island comma'), namedComma('password')],
      '2.3.13/5.19/5'
    );

    expect(pinkan.tune('15/13', {constraints: ['2/1']})).toBeCloseTo(248.846);
  });
});
