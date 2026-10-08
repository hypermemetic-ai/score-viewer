import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('export refuses a retained review name before reading new input and preserves every frozen candidate byte',()=>{
 const root=fileURLToPath(new URL('../vendor/iso-notation/',import.meta.url));
 const stem='public/review/schumann-no14-conventional-20261006';
 const paths=['.isoscore','.pdf','.manifest.json','.hands.json','.layer.json','.recipe.json'].map(suffix=>root+stem+suffix);
 const digest=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
 const before=paths.map(digest);
 const run=spawnSync(process.execPath,['--import','tsx','scripts/export-conventional-no14.ts','missing-source.isoscore','missing-receipt.json','missing-layer.json',stem],{cwd:root,encoding:'utf8'});
 assert.notEqual(run.status,0);assert.match(run.stderr,/Review artifacts already exist/);
 assert.deepEqual(paths.map(digest),before);
});
