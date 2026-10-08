import type {FingerBehavior,FingerPresentation} from './input';

/** Opening this section reflects saved choices without enabling a preset. */
export function expertSettings(preferences:{fingerBehavior:FingerBehavior;fingerPresentation:FingerPresentation},includeBehavior=true):string {
 return `<section data-expert-settings aria-labelledby="expert-settings-title"><h3 id="expert-settings-title">Expert settings</h3>${includeBehavior?fingerBehaviorSettings(preferences):''}<label class="dialog-row">When fingerings are shown, replace note numbers with finger numbers<input type="checkbox" data-finger-replacement ${preferences.fingerPresentation==='replacement'?'checked':''}/></label><p class="help">Hidden fingerings leave note numbers visible. Works with either visibility choice.</p></section>`;
}

export function fingerBehaviorSettings(preferences:{fingerBehavior:FingerBehavior}):string {return `<label class="dialog-row">Show fingerings<select data-finger-behavior aria-label="Show fingerings"><option value="toggle" ${preferences.fingerBehavior==='toggle'?'selected':''}>Press to show / hide</option><option value="momentary" ${preferences.fingerBehavior==='momentary'?'selected':''}>Show while held</option></select></label>`;}
