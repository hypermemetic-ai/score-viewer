/** Keys of the reader's own commands, beside the controls a player can
 * assign in Options (control-bindings.ts). One table, read by the reader and
 * by anything that drives it (the rehearsal), so a key changes in one place. */
export const READER_COMMAND_KEYS={count:'KeyC',scale:'KeyS',import:'KeyM',practice:'KeyP'} as const;
/** Offered only while a written-out repeat could fold. */
export const REPEAT_COMMAND_KEYS={'repeat-use':'KeyU','repeat-keep':'KeyK'} as const;
/** What P offers, each with its own key. */
export const PRACTICE_MENU_KEYS={'practice-fingers':'KeyF','practice-sections':'KeyS'} as const;
/** The letter a key code shows as. */
export const keyLetter=(code:string)=>code.replace(/^Key/,'');
