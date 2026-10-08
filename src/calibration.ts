import {
 emptySpanCalibrationRecord, validateSpanCalibrationRecord, compileSpanCalibration, withSpanCalibration, resolveSpanCalibrationContacts,
 type SpanCalibrationObservation, type SpanCalibrationRecord,
} from '../vendor/iso-notation/src/model/isomorphic-span-calibration';
import {ACTION_FINGER_PROFILE} from '../vendor/iso-notation/src/model/isomorphic-fingering-profile';

export const CALIBRATION_FILE = 'calibration.json';
export const VIEWER_CALIBRATION_VERSION = 'viewer-span-calibration-v1';
export interface ViewerCalibration {
 version: typeof VIEWER_CALIBRATION_VERSION;
 selection: 'baseline' | 'personal';
 record: SpanCalibrationRecord;
}
export interface CalibrationFiles {
 read(name: string): Promise<Uint8Array | null>;
 write(name: string, data: Uint8Array): Promise<void>;
}
export interface CalibrationLoad { value: ViewerCalibration; error?: string; raw?: Uint8Array }
export const initialCalibration = (): ViewerCalibration => ({
 version: VIEWER_CALIBRATION_VERSION, selection: 'baseline', record: emptySpanCalibrationRecord(),
});
export function validateViewerCalibration(value: unknown): ViewerCalibration {
 const saved = value as Partial<ViewerCalibration> | null;
 if (!saved || saved.version !== VIEWER_CALIBRATION_VERSION || !['baseline', 'personal'].includes(saved.selection ?? '')) {
  throw Error('Unsupported personal calibration format. The saved evidence has been retained.');
 }
 return {version: VIEWER_CALIBRATION_VERSION, selection: saved.selection!, record: validateSpanCalibrationRecord(saved.record)};
}
export async function loadCalibration(files: CalibrationFiles): Promise<CalibrationLoad> {
 let raw: Uint8Array | null = null;
 try {
  raw = await files.read(CALIBRATION_FILE);
  return {value: raw ? validateViewerCalibration(JSON.parse(new TextDecoder().decode(raw))) : initialCalibration()};
 } catch (error) {
  return {value: initialCalibration(), raw: raw ?? undefined, error: `${(error as Error).message} Reading and baseline calculation remain available.`};
 }
}
export async function saveCalibration(files: CalibrationFiles, value: ViewerCalibration): Promise<ViewerCalibration> {
 const checked = validateViewerCalibration(value);
 await files.write(CALIBRATION_FILE, new TextEncoder().encode(JSON.stringify(checked)));
 return checked;
}
export function addObservation(value: ViewerCalibration, observation: SpanCalibrationObservation): ViewerCalibration {
 return validateViewerCalibration({...value, record: {...value.record, observations: [...value.record.observations, observation]}});
}
/** Personal evidence is opt-in and copied at job start, so later edits cannot change a running calculation. */
export function calibrationForWorker(value: ViewerCalibration, error?: string): SpanCalibrationRecord | undefined {
 return !error && value.selection === 'personal' ? validateSpanCalibrationRecord(value.record) : undefined;
}
export async function exportCalibration(value: ViewerCalibration): Promise<string> {
 const checked = validateViewerCalibration(value), {compiled,profileDiagnostics} = await calibrationDetails(checked);
 return JSON.stringify({kind: 'ISO personal span calibration', saved: checked, compiled,
  profileDiagnostics, resolvedObservations:checked.record.observations.map(q=>({id:q.id,contacts:resolveSpanCalibrationContacts(q,checked.record.geometry)})),
  limitations: 'Thumb–pinky evidence only. Untested placements, other finger pairs and actual keyboard dimensions remain provisional.',
  unassignedReports: UNASSIGNED_SPAN_REPORTS}, null, 2);
}
export async function calibrationDetails(value: ViewerCalibration) {
 const compiled=await compileSpanCalibration(value.record);
 const profile=withSpanCalibration(ACTION_FINGER_PROFILE,compiled);
 return {compiled,profileDiagnostics:profile.spanCalibrationDiagnostics};
}
export const UNASSIGNED_SPAN_REPORTS = [
 'Earlier span reports: duodecimal 12 comfortable, 13 close to comfortable but outside it, 14 reachable but uncomfortable. Hand and duplicate-key placements were not specified.',
 'Earlier comfortable chord: 4–B–upper 3–upper 6 with fingers 1–2–4–5, near/far copies 1–2–2–1. Physical rows 1–4–4–1; relative pitches 0–7–11–14. Hand and absolute register were not specified.',
];
export const pitchDigit = (pitch: number) => '0123456789AB'[((pitch % 12) + 12) % 12];
export const pitchText = (pitch: number) => `${pitchDigit(pitch)} · ${['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12)}`;
export const copyRow = (pitch: number, copy: 1 | 2) => ((pitch % 2 + 2) % 2) + 1 + (copy - 1) * 2;
