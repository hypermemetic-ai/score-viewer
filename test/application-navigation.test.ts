import assert from 'node:assert/strict';
import test from 'node:test';
import {applicationNavigationKey} from '../src/application-navigation';

const key=(code:string,target:unknown,extra:Record<string,unknown>={})=>({code,target,repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,...extra}) as KeyboardEvent;
test('Focused navigation owns Enter, keypad Enter and Space without repeating activation',()=>{
 let clicks=0;
 const button={tagName:'BUTTON',disabled:false,click(){clicks++;},closest(){return this;}};
 for(const code of ['Enter','NumpadEnter','Space']){
  assert.equal(applicationNavigationKey(key(code,button)),true);
  assert.equal(applicationNavigationKey(key(code,button,{repeat:true})),true);
 }
 assert.equal(clicks,3);
 assert.equal(applicationNavigationKey(key('Enter',button,{ctrlKey:true})),false);
 assert.equal(applicationNavigationKey(key('Digit2',button)),false);
 assert.equal(applicationNavigationKey(key('Enter',{closest:()=>null})),false,'fields and task controls retain their own Enter behavior');
 button.disabled=true;assert.equal(applicationNavigationKey(key('Enter',button)),true);assert.equal(clicks,3);
});
test('Navigation arrows move between available end commands without activating either',()=>{
 let focused='',clicks=0;
 const row={querySelectorAll:()=>[back,options]};
 const control=(name:string)=>({tagName:'BUTTON',disabled:false,hidden:false,click(){clicks++;},focus(){focused=name;},closest(selector:string){return selector==='button[data-application-navigation]'?this:row;}});
 const back=control('back'),options=control('options');
 assert.equal(applicationNavigationKey(key('ArrowRight',back)),true);assert.equal(focused,'options');
 assert.equal(applicationNavigationKey(key('ArrowLeft',options)),true);assert.equal(focused,'back');
 options.hidden=true;assert.equal(applicationNavigationKey(key('ArrowRight',back)),false);assert.equal(clicks,0);
});
