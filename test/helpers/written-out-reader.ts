import {editOwners,writtenView} from '../../src/repeat-fold';

/** The reader's repeat fold for the VM fixtures: their scores write out no
 * passage twice, so the reader shows them as stored. test/repeat-fold.test.ts
 * covers folding itself. */
export const writtenOutReader={FoldedReader:class{folds(){return false;}async view(){return undefined;}},editOwners,writtenView,
 foldedTwins:()=>(id:string)=>[id]};
