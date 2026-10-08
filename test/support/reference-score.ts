import {readFileSync} from 'node:fs';
import {addReferencePerformanceTempo} from '../../src/reference-tempo-update';
export const testReference={version:'reference-performance-tempo-v1' as const,bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial' as const,reference:'Operator-approved No.14 practice target, associated with Daniel Blumenthal recording; not a composer numeric marking.'}};
export async function referenceFixture(url:URL){return (await addReferencePerformanceTempo(readFileSync(url),testReference)).after;}
