import {Temperament, Subgroup, Comma, MonzoValue} from 'temperaments';
import {dot} from 'xen-dev-utils';

export * from './names';

export type TemperamentData = {
  title: string;
  subtitle: string | null;
  subgroup: string;
  commas: number[][];
  rank: number;
  prefix: string;
  vals?: number[][];
};

function inferCommas(commas: MonzoValue[], subgroup: Subgroup) {
  for (const comma of commas) {
    if (typeof comma === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, residual] = subgroup.toMonzoAndResidual(comma);
      if (!residual.equals(1)) {
        throw new Error(
          `Comma ${comma} outside subgroup ${subgroup.toString()}`
        );
      }
    }
  }

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
    } catch (e) {
      console.log(
        'Failed commas',
        title,
        subtitle,
        datum.commas,
        (e as Error).message
      );
      continue;
    }
    if (subgroup.basis.length > 11) {
      console.log('Subgroup too large', title, subtitle);
      continue;
    }
    const temperament = Temperament.fromCommas(
      commas,
      subgroup,
      false
    ).canonize();
    const rank = temperament.getRank();
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
    const prefix = temperament
      .rankPrefix(rank)
      .map(c => c.toString())
      .join(',');
    const key = `${subgroup.toString()};${rank};${prefix}`;

    const result = {
      title,
      subtitle,
      subgroup: subgroup.toString(),
      commas,
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
