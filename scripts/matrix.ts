import Temperament, {Subgroup} from 'temperaments';
import {getTemperamentData} from '../src';

const MIN_DIVISIONS = 2;
const MAX_DIVISIONS = 14;

const columns = [...Array(MAX_DIVISIONS - MIN_DIVISIONS + 1).keys()].map(k =>
  (k + MIN_DIVISIONS).toString()
);

const subgroup = new Subgroup(process.argv[2]);

const rows: {[key: string]: {[key: string]: string}} = {};
for (const first of columns) {
  const cells: {[key: string]: string} = {};
  for (const second of columns) {
    const temperament = Temperament.fromVals([first, second], subgroup);
    const title = getTemperamentData(temperament)?.title || '';
    cells[second] = title;
  }
  rows[first] = cells;
}
console.table(rows);
