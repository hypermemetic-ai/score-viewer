import {
 calibrationKeyboardScene,
 type CalibrationColorLayout, type CalibrationKeyboard, type CalibrationPlacement,
 type CalibrationSurface, type ExploratoryCalibrationTrial,
} from '@hypermemetic-ai/fingering-calculator';

export const pilotEscape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function pilotPitchText(midiPitch: number): string {
 return `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midiPitch % 12]}${Math.floor(midiPitch / 12) - 1}`;
}
export function pilotPlacementText(keyboard: CalibrationKeyboard, placement: CalibrationPlacement): string {
 const key = keyboard.keys.find(q => q.id === placement.keyId);
 if (!key) throw new Error(`Missing physical key ${placement.keyId}`);
 return `finger ${placement.finger} · ${pilotPitchText(key.midiPitch)} (MIDI ${key.midiPitch})${key.row ? ` · row ${key.row}` : ''} · ${key.level ? `${key.level} level` : 'conventional key'}`;
}
/** Scene identity and geometry come from the root API; color is a presentation choice only. */
export function pilotKeyboardModel(keyboard: CalibrationKeyboard, trial: ExploratoryCalibrationTrial, layout: CalibrationColorLayout = 'five-seven') {
 const contacts = [...trial.anchors, ...trial.active].map(q => keyboard.keys.find(k => k.id === q.keyId)!);
 if (contacts.some(q => !q)) throw new Error('The displayed trial has a missing physical contact');
 const low = Math.min(...contacts.map(q => q.midiPitch)) - 3;
 const high = Math.max(...contacts.map(q => q.midiPitch)) + 3;
 const keys = calibrationKeyboardScene(keyboard, keyboard.id === 'janko-four-row' ? layout : 'classic')
  .filter(q => q.midiPitch >= low && q.midiPitch <= high)
  .map(key => ({...key, role: trial.anchors.some(q => q.keyId === key.id) ? 'anchor' as const : trial.active.some(q => q.keyId === key.id) ? 'tested' as const : null,
   centers: key.usable.map(p => ({x: (p.xMin + p.xMax) / 2, depthMin: p.depthMin, depthMax: p.depthMax}))}));
 const patches = keys.flatMap(q => q.body ?? q.usable);
 return {keys, bounds: {xMin: Math.min(...patches.map(q => q.xMin)), xMax: Math.max(...patches.map(q => q.xMax)), depthMin: Math.min(...patches.map(q => q.depthMin)), depthMax: Math.max(...patches.map(q => q.depthMax))}};
}

export function renderPilotKeyboard(keyboard: CalibrationKeyboard, trial: ExploratoryCalibrationTrial, layout: CalibrationColorLayout = 'five-seven'): string {
 const model = pilotKeyboardModel(keyboard, trial, layout);
 const b = model.bounds;
 const left = 34, top = 15, bottom = 31;
 const width = b.xMax - b.xMin + left + 8, height = b.depthMax - b.depthMin + top + bottom;
 const x = (n: number) => n - b.xMin + left;
 const y = (depth: number) => b.depthMax - depth + top;
 const rect = (p: CalibrationSurface, className: string) => `<rect class="${className}" x="${x(p.xMin)}" y="${y(p.depthMax)}" width="${p.xMax-p.xMin}" height="${p.depthMax-p.depthMin}"/>`;
 const label = `${trial.hand === 'RH' ? 'Right' : 'Left'} hand. Anchor ${pilotPlacementText(keyboard, trial.anchors[0])}. Test ${pilotPlacementText(keyboard, trial.active[0])}. Rows run from near to far.`;
 const groups = model.keys.map(key => {
  const patch = key.usable[0];
  const center = (patch.xMin + patch.xMax) / 2;
  const placement = [...trial.anchors, ...trial.active].find(q => q.keyId === key.id);
  return `<g class="pilot-key pilot-key-${key.color}${key.role ? ` pilot-key-${key.role}` : ''}" data-key-id="${pilotEscape(key.id)}" data-midi="${key.midiPitch}"${key.row ? ` data-row="${key.row}" data-level="${key.level}"` : ''}><title>${pilotEscape(`${pilotPitchText(key.midiPitch)} · MIDI ${key.midiPitch}${key.row ? ` · row ${key.row} · ${key.level}` : ''}${key.role ? ` · ${key.role} finger ${placement!.finger}` : ''}`)}</title>${(key.body ?? key.usable).map(p => rect(p,'pilot-key-body')).join('')}${key.usable.map(p => rect(p,'pilot-key-usable')).join('')}${key.role ? key.centers.map(p => `<line class="pilot-center-guide" x1="${x(p.x)}" x2="${x(p.x)}" y1="${y(p.depthMin)}" y2="${y(p.depthMax)}"/>`).join('') : ''}<text class="pilot-pitch-label" x="${x(center)}" y="${y(patch.depthMin)+ (key.row ? -3 : 12)}">${pilotPitchText(key.midiPitch)}</text>${key.role ? `<text class="pilot-finger-label" x="${x(center)}" y="${y(patch.depthMax)+(key.row?8:12)}">${key.role === 'anchor' ? 'A' : 'T'}${placement!.finger}</text>` : ''}</g>`;
 });
 // White bodies first, black bodies last; usable rear narrowing remains root geometry.
 const order = model.keys.map((q,i) => ({q,svg:groups[i]})).sort((a,b) => Number(a.q.color === 'dark')-Number(b.q.color === 'dark'));
 const rowLabels = keyboard.id === 'janko-four-row' ? [1,2,3,4].map(row => {
  const key = model.keys.find(q => q.row === row)!;
  return `<text class="pilot-row-label" x="3" y="${y((key.usable[0].depthMin+key.usable[0].depthMax)/2)+3}">Row ${row}</text>`;
 }).join('') : '';
 return `<figure class="pilot-keyboard"><svg role="img" aria-label="${pilotEscape(label)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${rowLabels}${order.map(q => q.svg).join('')}<text class="pilot-near-label" x="${width/2}" y="${height-4}">Near · player</text></svg><figcaption><span class="pilot-anchor-legend">A · anchor finger</span><span class="pilot-tested-legend">T · tested finger</span><span>Dashed lines: horizontal center at each depth</span></figcaption></figure>`;
}

/** Schematic instruction, not measured anatomy or a captured hand pose. */
export function renderPilotMovementExample(): string {
 return `<figure class="pilot-movement"><svg viewBox="0 0 480 112" role="img" aria-label="Let the tested finger bend, extend or spread while the palm stays in place. Do not swivel the whole hand." xmlns="http://www.w3.org/2000/svg"><g class="pilot-demo-fixed"><path d="M72 87 V49 Q72 40 82 40 H119 Q129 40 129 49 V87 M82 40 V14 M99 40 V10 M116 40 Q149 35 133 17"/><path class="pilot-demo-alternate" d="M116 40 L122 10"/><path class="pilot-demo-arrow" d="M151 22 Q163 32 148 41 M148 41 l2 -7 M148 41 l7 -1"/><text x="110" y="106">Finger adjusts · palm stays</text></g><g class="pilot-demo-swivel"><path class="pilot-demo-alternate" d="M329 87 V49 Q329 40 339 40 H376 Q386 40 386 49 V87 M339 40 V14 M356 40 V10 M373 40 V17"/><g transform="rotate(19 357 87)"><path d="M329 87 V49 Q329 40 339 40 H376 Q386 40 386 49 V87 M339 40 V14 M356 40 V10 M373 40 V17"/></g><path class="pilot-demo-arrow" d="M395 14 Q419 39 413 63 M413 63 l-5 -6 M413 63 l6 -4"/><text x="358" y="106">Whole hand swivels · avoid</text></g></svg><figcaption>Keep the anchored finger at its original contact point. Let the tested finger adjust.</figcaption></figure>`;
}
