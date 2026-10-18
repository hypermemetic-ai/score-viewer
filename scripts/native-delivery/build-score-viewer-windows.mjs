#!/usr/bin/env node
import {cp,mkdtemp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {workerInputs,run,notices,finishWorker,nativeReleaseCargoArgs} from './score-viewer-native-worker.mjs';
if(process.platform!=='win32')throw Error('Windows worker requires a native Windows host');
const ctx=await workerInputs('windows-x64',process.argv.slice(2));
await ctx.stage('nativeTestsMs',()=>run('cargo',['test','--locked','--release','--features','custom-protocol','--target','x86_64-pc-windows-msvc','--manifest-path','src-tauri/Cargo.toml','--bin','iso-score-viewer',...nativeReleaseCargoArgs],ctx.viewer,ctx.env));
await ctx.stage('nativeBuildMs',()=>run('npm',['run','tauri','--','build','--target','x86_64-pc-windows-msvc','--no-bundle','--config',ctx.preparedConfig,'--','--locked',...nativeReleaseCargoArgs],ctx.viewer,ctx.env));
const binary=join(ctx.target,'x86_64-pc-windows-msvc','release','iso-score-viewer.exe'),packet=await mkdtemp(join(tmpdir(),'iso-windows-recipient-'));
await cp(binary,join(packet,'iso-score-viewer.exe'));
await writeFile(join(packet,'Install-on-Windows.md'),'# ISO Score Viewer — Windows x64\n\nExtract the ZIP and open iso-score-viewer.exe. Microsoft WebView2 Runtime must already be installed. No local server is needed.\n\nOpen Schumann-No14.tuna from the viewer. Use Keyboard to choose Conventional piano or Four-row Jankó. Your score library, corrections, preferences and practice records remain local.\n');
await ctx.stage('verificationPackagingMs',()=>notices(ctx.source,ctx.viewer,packet,'x86_64-pc-windows-msvc'));
await finishWorker(ctx,'windows-x64',packet,binary,{tests:'passed',guiControls:'not tested',physicalMidiAudioPedal:'not tested'});
