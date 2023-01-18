import {Temperament, Subgroup, Val, Comma} from 'temperaments';
import {dot} from 'xen-dev-utils';

export * from './names';

export type TemperamentData = {
  title: string;
  subtitle: string | null;
  subgroup: string;
  commas: number[][];
  vals: string[] | null;
  rank: number;
  prefix: string;
};

function inferCommas(commas: Comma[], subgroup: Subgroup) {
  const candidates = commas.map(comma => subgroup.resolveMonzo(comma, true));
  const jip = subgroup.jip('cents');
  for (const candidate of candidates) {
    const size = dot(jip, candidate);
    if (size < -1e-6 || size > 400) {
      const alternatives = commas.map(comma =>
        subgroup.resolveMonzo(comma, false)
      );
      for (const alternative of alternatives) {
        const size = dot(jip, alternative);
        if (size < -1e-6 || size > 400) {
          throw new Error('Failed to infer commas');
        }
      }
      return alternatives;
    }
  }
  return candidates;
}

export function processScraped(data: {temperaments: TemperamentData[]}) {
  const collection: Map<string, TemperamentData> = new Map();
  for (const datum of data.temperaments) {
    const title = datum.title;
    const subtitle = datum.subtitle;
    const subgroup = new Subgroup(datum.subgroup);
    let commas: Comma[];
    try {
      commas = inferCommas(datum.commas, subgroup);
    } catch {
      console.log('Failed commas', title, subtitle, datum.commas);
      continue;
    }
    let wartss: string[] | null = [];
    let key: string;
    let prefix: string;
    let rank: number;
    if (subgroup.basis.length > 11) {
      console.log('Subgroup too large', title, subtitle);
      continue;
    } else {
      const temperament = Temperament.fromCommas(
        commas,
        subgroup,
        false
      ).canonize();
      rank = temperament.getRank();
      const wedgiePrefix = temperament.rankPrefix(rank);
      const recovered = Temperament.fromPrefix(
        rank,
        wedgiePrefix,
        subgroup
      ).canonize();
      if (!recovered.equals(temperament)) {
        console.log('Failed to recover', title, subtitle, wedgiePrefix);
        continue;
      }
      prefix = temperament
        .rankPrefix(rank)
        .map(c => c.toString())
        .join(',');
      key = `${subgroup.toString()};${rank};${prefix}`;
      let vals: Val[];
      try {
        vals = temperament.valFactorize(10, 1000, 0, 'GPV');
      } catch {
        try {
          vals = temperament.valFactorize(10, 1000, 0, 'GM');
        } catch {
          try {
            vals = temperament.valFactorize(2, 10000, 0, 'patent');
          } catch {
            try {
              vals = temperament.valFactorize(5, 999, 1, 'patent');
            } catch {
              try {
                vals = temperament.valFactorize(2, 999, 1, 'mapping');
              } catch {
                console.log(
                  'Val factorization not found',
                  title,
                  subtitle,
                  rank,
                  commas.map(comma => subgroup.toFraction(comma).valueOf())
                );
                vals = [];
              }
            }
          }
        }
      }
      wartss = vals.map(val => subgroup.toWarts(val));
      for (const warts of wartss) {
        if (warts.length > 10) {
          console.log(
            warts.slice(0, 30),
            'too long',
            title,
            subtitle,
            temperament.getRank(),
            subgroup.toString(),
            commas.map(comma => subgroup.toFraction(comma).valueOf())
          );
          wartss = [];
        }
      }
    }
    if (!wartss.length) {
      wartss = null;
    }
    const result = {
      title,
      subtitle,
      subgroup: subgroup.toString(),
      commas,
      vals: wartss,
      prefix,
      rank,
    };
    if (collection.has(key)) {
      const existing = collection.get(key)!;
      console.log(
        'Duplicate:',
        title,
        subtitle,
        'vs.',
        existing.title,
        existing.subtitle
      );
      if (existing.subtitle === null && subtitle !== null) {
        console.log('Updated!');
        collection.set(key, result);
      }
    } else {
      collection.set(key, result);
    }
  }
  return collection;
}
