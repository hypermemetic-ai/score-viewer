import {actionCode} from './input';

/** Reuse a control area's existing buttons and listeners; only their placement changes. */
export function arrangeBottomNavigation(root:HTMLElement,back:HTMLButtonElement|null,options:HTMLButtonElement|null){
 if(!root.ownerDocument?.createElement)return;
 const focused=root.ownerDocument.activeElement as HTMLElement|null;
 let actions=root.querySelector<HTMLElement>(':scope > .application-navigation-actions');
 if(!actions){
  actions=root.ownerDocument.createElement('div');actions.className='application-navigation-actions';
  for(const child of [...root.childNodes])if(child!==back&&child!==options)actions.append(child);
  const left=root.ownerDocument.createElement('div'),right=root.ownerDocument.createElement('div');
  left.className='application-navigation-back';right.className='application-navigation-options';
  root.replaceChildren(left,actions,right);
 }
 const left=root.querySelector<HTMLElement>(':scope > .application-navigation-back')!,right=root.querySelector<HTMLElement>(':scope > .application-navigation-options')!;
 if(back)back.dataset.applicationNavigation='back';
 if(options)options.dataset.applicationNavigation='options';
 if(left.firstElementChild!==back)left.replaceChildren(...(back?[back]:[]));
 if(right.firstElementChild!==options)right.replaceChildren(...(options?[options]:[]));
 root.classList.add('application-navigation');
 if(focused&&root.contains(focused)&&root.ownerDocument.activeElement!==focused)focused.focus({preventScroll:true});
}

/** Existing dialogs already have a footer; create one only when the command lacks one. */
export function arrangeDialogNavigation(dialog:HTMLElement,exit?:HTMLButtonElement|null){
 if(!dialog.ownerDocument?.createElement)return;
 const buttons=[...dialog.querySelectorAll<HTMLButtonElement>('button')];
 const label=(b:HTMLButtonElement)=>b.firstChild?.textContent?.trim();
 const back=exit===undefined?buttons.find(b=>label(b)==='Back'||label(b)==='Close'):exit;
 const options=buttons.find(b=>label(b)==='Options');
 if(!back&&!options)return;
 let footer=dialog.querySelector<HTMLElement>(':scope > footer,:scope > .dialog-actions');
 if(!footer){footer=dialog.ownerDocument.createElement('footer');dialog.append(footer);}
 footer.classList.add('dialog-navigation');arrangeBottomNavigation(footer,back??null,options??null);
}

/** A focused navigation command owns activation, rather than grading or marking Done. */
export function applicationNavigationKey(event:KeyboardEvent){
 if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return false;
 const code=actionCode(event);
 if(!['Enter','Space','ArrowLeft','ArrowRight'].includes(code))return false;
 const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>('button[data-application-navigation]');
 if(!button||button.tagName!=='BUTTON')return false;
 if(code==='Enter'||code==='Space'){if(!event.repeat&&!button.disabled)button.click();return true;}
 const row=button.closest('.application-navigation');if(!row)return false;
 const buttons=[...row.querySelectorAll<HTMLButtonElement>('button[data-application-navigation]')].filter(b=>!b.disabled&&!b.hidden);
 if(buttons.length<2)return false;
 buttons[Math.max(0,Math.min(buttons.length-1,buttons.indexOf(button)+(code==='ArrowLeft'?-1:1)))]?.focus();return true;
}
