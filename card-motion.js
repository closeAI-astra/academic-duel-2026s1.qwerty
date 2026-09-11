// Pause decorative card loops offscreen. Cinematic timelines remain independent.
export function initCardMotion(){
 if(typeof IntersectionObserver==='undefined'||typeof MutationObserver==='undefined')return ()=>{};
 const selector='.game-card.evolution-5,.game-card.collab-card,.game-card.duo-motion,.game-card.fullcredit-card';
 const tracked=new Set();
 const visible=new IntersectionObserver(entries=>{
  for(const entry of entries)if(tracked.has(entry.target))entry.target.classList.toggle('offscreen-card',!entry.isIntersecting);
 },{rootMargin:'80px'});
 const visit=(node,fn)=>{
  if(node.nodeType!==1)return;
  if(node.matches(selector))fn(node);
  node.querySelectorAll(selector).forEach(fn);
 };
 const add=node=>{if(tracked.has(node))return;tracked.add(node);node.classList.add('offscreen-card');visible.observe(node);};
 const remove=node=>{tracked.delete(node);visible.unobserve(node);};
 visit(document.body,add);
 const changes=new MutationObserver(records=>{
  for(const record of records){record.removedNodes.forEach(node=>visit(node,remove));record.addedNodes.forEach(node=>visit(node,add));}
 });
 changes.observe(document.body,{childList:true,subtree:true});
 const pageVisibility=()=>document.documentElement.classList.toggle('page-idle',document.hidden);
 document.addEventListener('visibilitychange',pageVisibility);pageVisibility();
 return ()=>{changes.disconnect();visible.disconnect();document.removeEventListener('visibilitychange',pageVisibility);for(const node of tracked)node.classList.remove('offscreen-card');tracked.clear();document.documentElement.classList.remove('page-idle');};
}
