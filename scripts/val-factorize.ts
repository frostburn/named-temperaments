import {writeFileSync} from 'fs';
import {join} from 'path';
import Temperament, {Subgroup, Val} from 'temperaments';

const MIN_DIVISIONS = 2;
const MAX_DIVISIONS = 9999;
const MAX_RADIUS = 2;

const resources = [
  [2, require('../resources/rank2.json')],
  [3, require('../resources/rank3.json')],
  [4, require('../resources/rank4.json')],
  [5, require('../resources/rank5.json')],
];

let found = 0;
let notFound = 0;
for (const [rank, resource] of resources) {
  for (const subkey in resource) {
    console.log('===', subkey, '===');
    const subgroup = new Subgroup(subkey);
    let maxRadius = MAX_RADIUS;
    let maxDivisions = MAX_DIVISIONS;
    if (subgroup.basis.length === 8) {
      maxRadius = 1;
    } else if (subgroup.basis.length > 8) {
      maxRadius = 0;
      maxDivisions = 200;
    }
    for (const key in resource[subkey]) {
      const prefix = key.split(',').map(c => parseInt(c));
      const temperament = Temperament.fromPrefix(
        rank,
        prefix,
        subgroup
      ).canonize();
      let factors: Val[] = [];
      const data = resource[subkey][key];
      console.log(data.title, '-', data.subtitle);
      for (let radius = 0; radius <= maxRadius; ++radius) {
        try {
          factors = temperament.valFactorize(
            MIN_DIVISIONS,
            maxDivisions,
            radius,
            'warts'
          );
          break;
        } catch {}
      }
      if (factors.length) {
        const reconstructed = Temperament.fromVals(
          factors,
          subgroup
        ).canonize();
        if (!reconstructed.equals(temperament)) {
          throw new Error('Bad factorization');
        }
        const vals = factors.map(f => subgroup.toWarts(f)).join('&');
        data.vals = vals;
        console.log(vals);
        found++;
      } else {
        console.log('Not found!');
        notFound++;
      }
    }
  }
  const path = join(process.argv[2], `rank${rank}.json`);
  const text = JSON.stringify(resource);

  console.log('Writing', path);
  writeFileSync(path, text, 'utf-8');
}

console.log('Found', found);
console.log('Failed', notFound);
