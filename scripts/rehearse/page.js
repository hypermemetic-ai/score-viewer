// Runs in the page before the application, as plain script: it answers the
// application's native commands through the simulated host (host.ts), and
// keeps the moments the rehearsal measures (a dialog leaving, a key arriving,
// the declared screen changing)
// on window.__rehearsal. It never acts on the application.
(()=>{
 const marks={closed:[],keys:[],screens:[]};window.__rehearsal=marks;
 addEventListener('keydown',e=>{if(!e.repeat)marks.keys.push({code:e.code,at:e.timeStamp});},{capture:true});
 const post=(path,data)=>fetch(path,{method:'POST',body:JSON.stringify(data)}).then(r=>r.json());
 const callbacks=new Map();let callback=0;
 window.isTauri=true;window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
 window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
  transformCallback(fn){callbacks.set(++callback,fn);return callback;},unregisterCallback(id){callbacks.delete(id);},
  async invoke(cmd,args={},options){
   switch(cmd){
    case 'read_managed':return fetch('/__managed?name='+encodeURIComponent(args.name)).then(r=>r.json());
    case 'write_managed':return post('/__write',args);
    case 'read_assistance':return fetch('/__assistance'+(args.id?'?id='+encodeURIComponent(args.id):'')).then(r=>r.json());
    case 'commit_assistance':return post('/__commit',args);
    case 'pick_score':return fetch('/__pick').then(r=>r.json());
    case 'read_derived':return fetch('/__derived?key='+encodeURIComponent(args.key)).then(r=>r.arrayBuffer());
    case 'write_derived':return fetch('/__derived',{method:'POST',headers:{'derived-key':options?.headers?.['derived-key']??''},body:args}).then(r=>r.json());
    case 'remove_migrated_score_file':return false;
    case 'midi_clock':return performance.now()*1000;
    case 'midi_sources':return {supported:true,sources:[],message:''};
    case 'plugin:event|listen':return args.handler;
    case 'practice_audio_outputs':return {supported:false,outputs:[]};
    case 'piano_bank_status':return {supported:true,installed:false,phase:'absent',progress:null,message:'',cancellable:false};
    case 'piano_audio_configure':case 'piano_audio_status':return {enabled:false,ready:false,running:false,device:null,sampleRate:48000,periodFrames:128,bufferFrames:128,raw:false,mode:'none',fallback:null,error:null,latencyTier:0};
    default:return null;
   }
  }};
 // Dialogs are appended to <body>; the observer watches the whole document from before the application starts.
 new MutationObserver(records=>{const at=performance.now();for(const r of records)for(const node of r.removedNodes)if(node instanceof HTMLDialogElement)marks.closed.push({kind:node.dataset.kind||'',at});}).observe(document,{childList:true,subtree:true});
 // The screen the application declares, as it changes: when the reader is on screen behind a dialog.
 new MutationObserver(records=>{const at=performance.now();for(const r of records)if(r.target instanceof HTMLElement&&r.target.id==='app')marks.screens.push({screen:r.target.dataset.screen||'',at});}).observe(document,{attributes:true,attributeFilter:['data-screen'],subtree:true});
})();
