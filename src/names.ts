import {MonzoValue, resolveMonzo, Temperament} from 'temperaments';
import {dot, Fraction, LOG_PRIMES, Monzo, monzoToFraction} from 'xen-dev-utils';
import {TemperamentData} from '.';

export type StoredTemperamentData = {
  title: string;
  subtitle?: string;
  commas: string;
  vals?: string;
};

type RankData = {[key: string]: {[key: string]: StoredTemperamentData}};

let rank2Data: RankData;
let rank3Data: RankData;
let rank4Data: RankData;
let rank5Data: RankData;

export function getTemperamentData(
  temperament: Temperament
): TemperamentData | null {
  const rank = temperament.getRank();
  let rankData: RankData;
  if (rank === 2) {
    if (rank2Data === undefined) {
      rank2Data = require('../resources/rank2.json');
    }
    rankData = rank2Data;
  } else if (rank === 3) {
    if (rank3Data === undefined) {
      rank3Data = require('../resources/rank3.json');
    }
    rankData = rank3Data;
  } else if (rank === 4) {
    if (rank4Data === undefined) {
      rank4Data = require('../resources/rank4.json');
    }
    rankData = rank4Data;
  } else if (rank === 5) {
    if (rank5Data === undefined) {
      rank5Data = require('../resources/rank5.json');
    }
    rankData = rank5Data;
  } else {
    return null;
  }
  const subgroup = temperament.subgroup.toString();
  const subData = rankData[subgroup];
  if (subData === undefined) {
    return null;
  }
  const prefix = temperament
    .rankPrefix(rank)
    .map(c => c.toString())
    .join(',');
  const storedData = subData[prefix];
  if (storedData === undefined) {
    return null;
  }

  let vals: null | string[];

  if (storedData.vals === undefined) {
    vals = null;
  } else {
    vals = storedData.vals.split('&');
  }

  return {
    title: storedData.title,
    subtitle: storedData.subtitle || null,
    commas: storedData.commas
      .split(';')
      .map(comma => comma.split(',').map(c => parseInt(c))),
    vals,
    rank,
    subgroup,
    prefix,
  };
}

let rawCommaData: {[key: string]: string[]};

export function getCommaNames(comma: MonzoValue): string[] {
  let monzo = resolveMonzo(comma);

  const size = dot(monzo, LOG_PRIMES);
  if (Math.abs(size) >= Math.LN2) {
    return [];
  }
  if (size < -1e-9) {
    monzo = monzo.map(m => -m);
  }
  if (rawCommaData === undefined) {
    rawCommaData = require('../resources/commas.json');
  }
  const key = monzo.slice(1).join(',');
  return rawCommaData[key] || [];
}

const commaByName: Map<string, Monzo> = new Map();

export function namedComma(name: string): Fraction;
export function namedComma(name: string, asMonzo: boolean): Monzo;
export function namedComma(name: string, asMonzo?: boolean): Fraction | Monzo {
  if (!commaByName.size) {
    if (rawCommaData === undefined) {
      rawCommaData = require('../resources/commas.json');
    }
    Object.keys(rawCommaData!).forEach(key => {
      const comma = key.split(',').map(c => parseInt(c));
      comma.unshift(0);
      const offTwoSize = dot(comma, LOG_PRIMES);
      comma[0] = -Math.round(offTwoSize / Math.LN2);
      rawCommaData![key].forEach(name => {
        commaByName.set(name.toLowerCase(), comma);
      });
    });
  }
  name = name.toLowerCase();
  if (!commaByName.has(name)) {
    throw new Error(`Unrecognized comma ${name}`);
  }
  const result = commaByName.get(name)!;
  if (asMonzo) {
    return result;
  }
  if (asMonzo !== undefined) {
    throw new Error('Incorrect call signature');
  }
  return monzoToFraction(result);
}

// TODO: Temperament from name
