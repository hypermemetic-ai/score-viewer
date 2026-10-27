// What main.ts declares for the rehearsal (app-state.ts), for tests that run
// its source in a context of their own: declaring is a no-op there, on a root
// that keeps nothing unless the test brings its own, and the command keys are
// the application's own.
import {PRACTICE_MENU_KEYS,READER_COMMAND_KEYS,REPEAT_COMMAND_KEYS,keyLetter} from '../../src/command-keys';
export const declaredState=()=>({app:{getAttribute:()=>null,setAttribute(){},removeAttribute(){}},declareState(){},declareRan(){},declareFailure(){},startingPractice:(start:()=>Promise<void>)=>start(),READER_COMMAND_KEYS,REPEAT_COMMAND_KEYS,PRACTICE_MENU_KEYS,keyLetter});
