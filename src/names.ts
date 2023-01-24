import {
  MonzoValue,
  resolveMonzo,
  Subgroup,
  SubgroupValue,
  Temperament,
} from 'temperaments';
import {dot, Fraction, LOG_PRIMES, Monzo, monzoToFraction} from 'xen-dev-utils';
import {TemperamentData} from '.';

export type StoredTemperamentData = {
  title: string;
  subtitle?: string;
  commas: string;
  vals?: string;
};

type RankData = {[key: string]: {[key: string]: StoredTemperamentData}};

const rank2Data = require('../resources/rank2.json');
const rank3Data = require('../resources/rank3.json');
const rank4Data = require('../resources/rank4.json');
const rank5Data = require('../resources/rank5.json');

function getRankData(rank: number): RankData | undefined {
  if (rank === 2) {
    return rank2Data;
  } else if (rank === 3) {
    return rank3Data;
  } else if (rank === 4) {
    return rank4Data;
  } else if (rank === 5) {
    return rank5Data;
  }
  return undefined;
}

export function getTemperamentData(
  temperament: Temperament
): TemperamentData | null {
  const rank = temperament.getRank();
  const rankData = getRankData(rank);
  if (rankData === undefined) {
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

  const result: TemperamentData = {
    title: storedData.title,
    subtitle: storedData.subtitle || null,
    commas: storedData.commas
      .split(';')
      .map(comma => comma.split(',').map(c => parseInt(c))),
    rank,
    subgroup,
    prefix,
  };
  if (storedData.vals !== undefined) {
    result.vals = storedData.vals
      .split('&')
      .map(warts => temperament.subgroup.fromWarts(warts));
  }
  return result;
}

const prefixAndRankByTitleBySubgroup: Map<
  string,
  Map<string, [string, number]>
> = new Map();

export function namedTemperament(title: string, subgroup: SubgroupValue) {
  const subgroupInstance = new Subgroup(subgroup);
  subgroup = subgroupInstance.toString();
  if (!prefixAndRankByTitleBySubgroup.size) {
    let rank = 2;
    for (const rankData of [rank2Data, rank3Data, rank4Data, rank5Data]) {
      for (const subKey in rankData) {
        const subData = rankData[subKey];
        const subMap = prefixAndRankByTitleBySubgroup.get(subKey) || new Map();
        for (const prefix in subData) {
          const data = subData[prefix];
          subMap.set(data.title, [prefix, rank]);
        }
        prefixAndRankByTitleBySubgroup.set(subKey, subMap);
      }
      rank++;
    }
  }
  if (!prefixAndRankByTitleBySubgroup.has(subgroup)) {
    throw new Error(`No names found for subgroup ${subgroup}`);
  }
  const prefixAndRankByName = prefixAndRankByTitleBySubgroup.get(subgroup)!;
  if (!prefixAndRankByName.has(title)) {
    throw new Error(`Unrecognized temperament ${title}`);
  }
  const prefix = prefixAndRankByName
    .get(title)![0]
    .split(',')
    .map(c => parseInt(c));
  const rank = prefixAndRankByName.get(title)![1];
  return Temperament.fromPrefix(rank, prefix, subgroupInstance);
}

const commaData: {
  [key: string]: string[];
} = require('../resources/commas.json');

export function getCommaNames(comma: MonzoValue): string[] {
  let monzo = resolveMonzo(comma);

  const size = dot(monzo, LOG_PRIMES);
  if (Math.abs(size) >= Math.LN2) {
    return [];
  }
  if (size < -1e-9) {
    monzo = monzo.map(m => -m);
  }
  const key = monzo.slice(1).join(',');
  return commaData[key] || [];
}

const commaByName: Map<string, Monzo> = new Map();

export function namedComma(name: string): Fraction;
export function namedComma(name: string, asMonzo: boolean): Monzo;
export function namedComma(name: string, asMonzo?: boolean): Fraction | Monzo {
  if (!commaByName.size) {
    Object.keys(commaData!).forEach(key => {
      const comma = key.split(',').map(c => parseInt(c));
      comma.unshift(0);
      const offTwoSize = dot(comma, LOG_PRIMES);
      comma[0] = -Math.round(offTwoSize / Math.LN2);
      commaData![key].forEach(name => {
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
