import {prepareConventionalPresentation} from './presentation-generation';
self.onmessage=async event=>{
  try{
    postMessage({type:'progress',message:'Checking source presentation…'});
    const result=await prepareConventionalPresentation(event.data,{onProgress:q=>{
      if(q.occurrence%12===0||q.occurrence===q.total)
        postMessage({type:'progress',message:`Planning hands and fingers ${q.occurrence} / ${q.total}…`});
    }});
    postMessage({type:'complete',presentation:result});
  }catch(error){postMessage({type:'error',message:(error as Error).message});}
};
