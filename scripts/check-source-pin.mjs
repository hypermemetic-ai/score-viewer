import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const dependency=fileURLToPath(new URL('../vendor/iso-notation/',import.meta.url));
const {dependencyRevision}=JSON.parse(readFileSync(new URL('../docs/source-provenance.json',import.meta.url),'utf8'));
function git(args,cwd){return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
try {
 const actual=git(['rev-parse','HEAD'],dependency);
 if(actual!==dependencyRevision)throw Error(`Notation dependency is ${actual}; expected ${dependencyRevision}.`);
 const expected=git(['ls-files','--stage','vendor/iso-notation'],root).split(/\s+/)[1];
 if(expected!==dependencyRevision)throw Error(`Tracked notation dependency is ${expected}; expected ${dependencyRevision}.`);
 if(git(['status','--porcelain','--untracked-files=no'],dependency))throw Error('Notation dependency has tracked modifications.');
 console.log(`Notation source verified: ${dependencyRevision}`);
} catch(error) {
 console.error(`${error.message} Run git submodule update --init --recursive from this repository, or review and update the pin deliberately.`);
 process.exitCode=1;
}
