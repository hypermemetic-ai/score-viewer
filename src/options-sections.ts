export interface OptionsSection {id:string;label:string;content:string}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Panels stay mounted: device setup, numeric drafts and capture keep one owner. */
export function optionsSectionsMarkup(sections:readonly OptionsSection[],selected=sections[0]?.id){
 if(!sections.length||new Set(sections.map(s=>s.id)).size!==sections.length||sections.some(s=>!/^[a-z][a-z-]*$/.test(s.id)))throw Error('Options sections differ.');
 const active=sections.some(s=>s.id===selected)?selected:sections[0].id;
 return `<div class="options-layout"><nav class="options-sections" aria-label="Options sections" role="tablist" aria-orientation="vertical">${sections.map(section=>`<button type="button" id="options-section-${section.id}" data-options-section="${section.id}" role="tab" aria-selected="${section.id===active}" aria-controls="options-panel-${section.id}" tabindex="${section.id===active?0:-1}">${escape(section.label)}</button>`).join('')}</nav><div class="options-panels">${sections.map(section=>`<div id="options-panel-${section.id}" data-options-panel="${section.id}" role="tabpanel" aria-labelledby="options-section-${section.id}" ${section.id===active?'':'hidden'}>${section.content}</div>`).join('')}<span class="options-position" aria-hidden="true" hidden></span></div></div>`;
}
