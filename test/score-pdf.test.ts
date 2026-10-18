import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {importPackage} from '../src/package';
import {initialPersonal,collectionId} from '../src/state';
import {scoreOptionsMarkup} from '../src/score-options';
import {pdfSaveMessage,scorePageSize,scorePdfFilename,svgPageSize} from '../src/score-pdf';

const svg=(attributes:string)=>new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" ${attributes}/>`,'image/svg+xml').documentElement as unknown as Element;

test('PDF pages take the engraved page size in points',async()=>{
 assert.deepEqual(svgPageSize(svg('viewBox="0.00 0.00 595.28 841.89" width="595.28pt" height="841.89pt"')),{widthPoints:595.28,heightPoints:841.89});
 assert.deepEqual(svgPageSize(svg('width="210mm" height="11in"')),{widthPoints:210*72/25.4,heightPoints:792});
 assert.deepEqual(svgPageSize(svg('viewBox="0 0 800 1000"')),{widthPoints:600,heightPoints:750});
 for(const bad of ['','width="50%" height="100%"','width="10pt" height="10pt"','width="1e9pt" height="800pt"'])assert.throws(()=>svgPageSize(svg(bad)),/printable size/);
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});
 const page=new DOMParser().parseFromString(p.pages[0],'image/svg+xml').documentElement as unknown as Element,size=svgPageSize(page);
 assert.ok(Math.abs(size.widthPoints-595.28)<.01&&Math.abs(size.heightPoints-841.89)<.01,JSON.stringify(size));
 const a4=svg('width="595.28pt" height="841.89pt"');
 assert.deepEqual(scorePageSize([a4,a4]),{widthPoints:595.28,heightPoints:841.89});
 assert.throws(()=>scorePageSize([a4,svg('width="612pt" height="792pt"')]),/different sizes/);assert.throws(()=>scorePageSize([]),/no pages/);
});

test('PDF filenames follow the shared score filename rules',()=>{
 assert.equal(scorePdfFilename('Kleine Studie, Op. 68 No. 14'),'Kleine-Studie-Op-68-No-14.pdf');
 assert.equal(scorePdfFilename('Für Élise'),'Fur-Elise.pdf');
 assert.equal(scorePdfFilename('CON'),'Score.pdf');assert.equal(scorePdfFilename('—'),'Score.pdf');
 assert.match(scorePdfFilename('x'.repeat(300)),/^x{90}\.pdf$/);
});

test('PDF messages name the pages and the label mode the pianist saved',()=>{
 assert.equal(pdfSaveMessage({status:'saved'},'Study.pdf',3,'pitch'),'PDF saved: Study.pdf (3 pages with pitch labels).');
 assert.equal(pdfSaveMessage({status:'saved'},'Study.pdf',1,'finger'),'PDF saved: Study.pdf (1 page with finger numbers).');
 assert.equal(pdfSaveMessage({status:'cancelled'},'Study.pdf',3,'finger'),'PDF save cancelled.');
 assert.match(pdfSaveMessage({status:'printed'},'Study.pdf',3,'pitch'),/^Print dialog opened/);
});

test('Options offers Save as PDF beside Share score only where the reader can export',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true}),s=initialPersonal(p);
 const entry={id:collectionId(p),file:'package-'+p.archiveSha256+'.tuna',metadata:p.manifest.metadata,importedAt:'2026-10-16'};
 const reader=scoreOptionsMarkup(entry,p,s,{steps:0,min:-12,max:12},undefined,'',true),practice=scoreOptionsMarkup(entry,p,s,{steps:0,min:-12,max:12});
 assert.match(reader,/data-action="share">Share score<\/button><button type="button" data-action="pdf">Save as PDF<\/button>/);
 assert.doesNotMatch(practice,/data-action="pdf"/);
});
