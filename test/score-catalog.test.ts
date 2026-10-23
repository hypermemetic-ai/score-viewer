import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueHeading,catalogueLine,musicXmlCatalogue,workContext,workHeadingMarkup,workName,workOrder,workReference} from '../src/score-catalog';
import {libraryMarkup,LibrarySelection} from '../src/library-menu';
import type {Entry} from '../src/state';
import type {Metadata} from '../src/package';

// A small library: one score with a catalogue and a numbered
// title, one MusicXML import that now carries its work number, one catalogue in
// the title, one uncatalogued score and one without a composer.
const no14:Metadata={title:'Nr. 14 · Kleine Studie',composer:'Robert Schumann',opus:68,opusLabel:'Op. 68',piece:14,variant:'Edited hands · finger study',provenance:[]};
const no13:Metadata={title:'Mai, lieber Mai, – Bald bist du wieder da!',composer:'Robert Schumann',opusLabel:'Op. 68',opus:68,piece:13,provenance:[]};
const bach:Metadata={title:'Goldberg Variations, BWV 988: Variatio 1. a 1 Clav.',composer:'J. S. Bach',provenance:[]};
const lullaby:Metadata={title:'Mira\'s Lullaby',composer:'Kai Lund',provenance:[]};
const other:Metadata={title:'Second Wind',composer:'',provenance:[]};

test('a work is named composer, catalogue, number, then its own title',()=>{
 assert.deepEqual(workName(no14),{composer:'Robert Schumann',catalogue:'Op. 68',catalogueNumber:68,number:14,title:'Kleine Studie'});
 assert.equal(catalogueLine(workName(no14)),'Op. 68, No. 14');
 assert.equal(workContext(workName(no14)),'Robert Schumann · Op. 68, No. 14');
 assert.equal(workName(no13).title,'Mai, lieber Mai, – Bald bist du wieder da!','A title not starting with its number is kept whole');
});

test('a catalogue written in the title becomes the catalogue entry and its collection',()=>{
 const name=workName(bach);
 assert.equal(name.catalogue,'BWV 988');assert.equal(name.collection,'Goldberg Variations');assert.equal(name.title,'Variatio 1. a 1 Clav.');assert.equal(name.number,undefined);
 assert.equal(catalogueHeading(name),'BWV 988 · Goldberg Variations');
 assert.equal(workName({...bach,title:'Album für die Jugend, Op. 68, No. 13: Mai'}).number,13);
 assert.deepEqual(workName(lullaby),{composer:'Kai Lund',title:'Mira\'s Lullaby'},'No catalogue is invented');
});

test('the editorial variant is not part of the name',()=>{
 assert.doesNotMatch(workHeadingMarkup(no14),/Edited hands|finger study/);
 assert.match(workHeadingMarkup(no14),/work-context">Robert Schumann · Op\. 68, No\. 14<.*work-title">Kleine Studie</);
 assert.equal(workHeadingMarkup(other),'<span class="work-title">Second Wind</span>');
});

test('MusicXML work numbers give the catalogue and number',()=>{
 assert.deepEqual(musicXmlCatalogue('Op. 68, No. 13'),{opusLabel:'Op. 68',opus:68,piece:13});
 assert.deepEqual(musicXmlCatalogue('Op. 68, Nr. 13'),{opusLabel:'Op. 68',opus:68,piece:13});
 assert.deepEqual(musicXmlCatalogue('BWV 988'),{opusLabel:'BWV 988'});
 assert.deepEqual(musicXmlCatalogue('Op. 13'),{opusLabel:'Op. 13',opus:13},'A sonata movement is not a number within the opus');
 assert.deepEqual(musicXmlCatalogue(undefined),{});
 assert.deepEqual(musicXmlCatalogue('Lullaby'),{});
});

test('stored catalogue facts are kept; a leading number is dropped only when it is a prefix',()=>{
 assert.equal(workName({...bach,piece:2}).number,2,'A stored piece survives a catalogue parsed from the title');
 assert.equal(workName({...lullaby,opus:64,opusLabel:'Opus 64'}).catalogue,'Opus 64','An unfamiliar label is shown as stored');
 assert.equal(workName({...lullaby,title:'No. 1 in B-flat minor',opusLabel:'Op. 9',piece:1}).title,'No. 1 in B-flat minor');
 assert.equal(workName({...lullaby,title:'Waltz, Op. 64, Nr. 2: Tempo giusto'}).number,2);
 assert.equal(workName({...lullaby,opusLabel:'Op.68 '}).catalogue,'Op. 68','Spacing does not make a second catalogue entry');
});

test('within a composer, each catalogue is its own run',()=>{
 const b=(opusLabel:string,title:string):Metadata=>({title,composer:'Ludwig van Beethoven',opusLabel,provenance:[]});
 const sorted=[b('WoO 59','Für Elise'),b('Op. 101','Sonata'),b('Op. 27','Moonlight'),b('WoO 80','Variations')].sort(workOrder).map(m=>m.opusLabel);
 assert.deepEqual(sorted,['Op. 27','Op. 101','WoO 59','WoO 80']);
});

const entry=(id:string,metadata:Metadata):Entry=>({id,file:`${id}.tuna`,metadata,importedAt:'2026-10-20T00:00:00Z'});
const library=[entry('lullaby',lullaby),entry('other',other),entry('no14',no14),entry('bach',bach),entry('no13',no13)];

test('the library lists composers, catalogue entries and numbered pieces in order',()=>{
 assert.deepEqual([...library].sort((a,b)=>workOrder(a.metadata,b.metadata)).map(e=>e.id),['bach','lullaby','no13','no14','other']);
 const selection=new LibrarySelection();selection.update(library);
 const html=libraryMarkup(selection.allRows(),()=>'');
 const order=[...html.matchAll(/class="(composer-entry|catalogue-entry|score-entry[^"]*)"[^>]*>(.*?)<\/(?:button|div)>/g)].map(m=>`${m[1].split(' ')[0]}:${m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/›/,'').trim()}`);
 assert.deepEqual(order,[
  'composer-entry:J. S. Bach','catalogue-entry:BWV 988 · Goldberg Variations','score-entry:Variatio 1. a 1 Clav.',
  'composer-entry:Kai Lund','score-entry:Mira\'s Lullaby',
  'composer-entry:Robert Schumann','catalogue-entry:Op. 68','score-entry:No. 13 Mai, lieber Mai, – Bald bist du wieder da!','score-entry:No. 14 Kleine Studie',
  'composer-entry:Other scores','score-entry:Second Wind']);
 assert.doesNotMatch(html,/Sections|Edited hands|<small>/,'Rows carry no progress figure or editorial note');
 assert.equal((html.match(/data-library-row=/g)??[]).length,9,'Catalogue headings are not stops for the arrow keys');
});

test('a composer written with stray spaces stays one group',()=>{
 const selection=new LibrarySelection();
 selection.update([entry('a',{...lullaby,composer:'Kai Lund '}),entry('b',lullaby),entry('c',{...other,composer:' '}),entry('d',other)]);
 assert.deepEqual(selection.allRows().filter(r=>!r.entry).map(r=>r.key),['composer:Kai Lund','composer:']);
});

test('a work named within a sentence: composer › catalogue › number, or its title when it has no number',()=>{
 assert.equal(workReference(no13),'Robert Schumann › Op. 68 › No. 13');
 assert.equal(workReference(no14),'Robert Schumann › Op. 68 › No. 14');
 assert.equal(workReference(bach),'J. S. Bach › BWV 988 › Variatio 1. a 1 Clav.');
 assert.equal(workReference(lullaby),'Kai Lund › Mira\'s Lullaby');
 assert.equal(workReference(other),'Second Wind');
});
