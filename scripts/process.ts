import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {processScraped, StoredTemperamentData} from '../src/index';

const raw = JSON.parse(readFileSync(process.argv[2], 'utf-8'));

const processed = processScraped(raw);

const byRank = new Map<
  number,
  Map<string, Map<string, StoredTemperamentData>>
>();

for (const result of processed.values()) {
  const bySubgroup = byRank.get(result.rank) || new Map();
  const byPrefix = bySubgroup.get(result.subgroup) || new Map();
  const commas = result.commas;
  for (const comma of commas) {
    while (comma[comma.length - 1] === 0) {
      comma.pop();
    }
  }
  const datum: StoredTemperamentData = {
    title: result.title,
    commas: commas
      .map(comma => comma.map(c => c.toString()).join(','))
      .join(';'),
  };
  if (result.subtitle !== null) {
    datum.subtitle = result.subtitle;
  }
  byPrefix.set(result.prefix, datum);
  bySubgroup.set(result.subgroup, byPrefix);
  byRank.set(result.rank, bySubgroup);
}

for (const rank of byRank.keys()) {
  const bySubgroup = byRank.get(rank)!;
  const data: {[key: string]: {[key: string]: StoredTemperamentData}} = {};
  for (const subgroup of bySubgroup.keys()) {
    const byPrefix = bySubgroup.get(subgroup)!;
    const subData: {[key: string]: StoredTemperamentData} = {};
    for (const prefix of byPrefix.keys()) {
      subData[prefix] = byPrefix.get(prefix)!;
    }
    data[subgroup] = subData;
  }
  const path = join(process.argv[3], `rank${rank}.json`);
  const text = JSON.stringify(data);

  console.log('Writing', path);
  writeFileSync(path, text, 'utf-8');
}

console.log('Done!');
