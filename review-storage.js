import { safeStorageGet, safeStorageSet } from './security.js';
import { ACTIVE_SEASON } from './word-seasons.js';

export const REVIEW_KEY='academia-vocab-review-v1';
export const REVIEW_BACKUP_KEY='academia-vocab-review-v1-backup';
export const REVIEW_MAX_ITEMS=150;

function today(){
  return new Date().toISOString().slice(0,10);
}
function dateFromValue(value){
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const n=Number(value);
  if(Number.isFinite(n)&&n>0){
    const d=new Date(n);
    if(Number.isFinite(d.getTime()))return d.toISOString().slice(0,10);
  }
  return today();
}
function cleanWord(value,max){
  return typeof value==='string'&&value.length>0&&value.length<=max?value:'';
}
function normalizeItem(x){
  if(!x||typeof x!=='object')return null;

  // Canonical duel format: {w,m,c,d}
  const w=cleanWord(x.w,40)||cleanWord(x.word,40);
  const m=cleanWord(x.m,80)||cleanWord(x.meaning,80);
  if(!w||!m)return null;

  const rawCount=Number.isSafeInteger(x.c)?x.c:
    Number.isSafeInteger(x.misses)?x.misses:1;
  const c=Math.max(1,Math.min(999,rawCount||1));

  const d=dateFromValue(x.d ?? x.lastMiss);
  return {w,m,c,d};
}
function normalizeRaw(raw){
  if(!raw)return {season:ACTIVE_SEASON,items:[],legacy:false};

  // Previous GodField bug wrote a raw array into the shared key.
  if(Array.isArray(raw)){
    const items=raw.map(normalizeItem).filter(Boolean);
    return {season:ACTIVE_SEASON,items,legacy:true};
  }

  if(typeof raw==='object'&&Array.isArray(raw.items)){
    const season=typeof raw.season==='string'?raw.season:ACTIVE_SEASON;
    // Review page is for the active vocabulary season.
    const items=season===ACTIVE_SEASON
      ? raw.items.map(normalizeItem).filter(Boolean)
      : [];
    return {season:ACTIVE_SEASON,items,legacy:false};
  }

  return {season:ACTIVE_SEASON,items:[],legacy:true};
}
function mergeItems(...lists){
  const map=new Map();

  for(const list of lists){
    for(const raw of list||[]){
      const item=normalizeItem(raw);
      if(!item)continue;

      const prev=map.get(item.w);
      if(!prev){
        map.set(item.w,{...item});
        continue;
      }

      // Backup is an earlier snapshot. Do not add counts twice.
      // Keep the largest known count and newest known date/meaning.
      const newer=item.d>=prev.d?item:prev;
      map.set(item.w,{
        w:item.w,
        m:newer.m||prev.m||item.m,
        c:Math.max(prev.c,item.c),
        d:prev.d>=item.d?prev.d:item.d
      });
    }
  }

  return [...map.values()]
    .sort((a,b)=>b.d.localeCompare(a.d))
    .slice(0,REVIEW_MAX_ITEMS);
}
function rawPrimary(){
  return safeStorageGet(REVIEW_KEY);
}
function rawBackup(){
  return safeStorageGet(REVIEW_BACKUP_KEY);
}
function backupCurrent(raw){
  if(raw&&typeof raw==='object'){
    safeStorageSet(REVIEW_BACKUP_KEY,raw);
  }
}
function writeCanonical(state,{backup=true}={}){
  const canonical={
    season:ACTIVE_SEASON,
    items:mergeItems(state?.items||[])
  };

  if(backup)backupCurrent(rawPrimary());

  // Keep shrinking oldest items if browser quota/size protection rejects it.
  while(canonical.items.length&&!safeStorageSet(REVIEW_KEY,canonical)){
    canonical.items.pop();
  }
  if(!canonical.items.length)safeStorageSet(REVIEW_KEY,canonical);
  return canonical;
}

export function getReviewState(){
  const primary=rawPrimary();
  const backup=rawBackup();
  const p=normalizeRaw(primary);
  const b=normalizeRaw(backup);

  const state={
    season:ACTIVE_SEASON,
    items:mergeItems(p.items,b.items)
  };

  // Auto-heal legacy GodField format or a state where backup contains
  // entries that the primary no longer has.
  const primaryWords=new Set(p.items.map(x=>x.w));
  const needsMerge=state.items.some(x=>!primaryWords.has(x.w));
  if(p.legacy||needsMerge){
    writeCanonical(state,{backup:true});
  }
  return state;
}

export function saveReviewState(state){
  return writeCanonical(state,{backup:true});
}

export function recordReviewMiss(word,meaning){
  const w=cleanWord(word,40),m=cleanWord(meaning,80);
  if(!w||!m)return getReviewState();

  const state=getReviewState();
  const d=today();
  const found=state.items.find(x=>x.w===w);

  if(found){
    found.c=Math.min(999,found.c+1);
    found.m=m;
    found.d=d;
    state.items=state.items.filter(x=>x!==found);
    state.items.unshift(found);
  }else{
    state.items.unshift({w,m,c:1,d});
  }

  return writeCanonical(state,{backup:true});
}

export function clearReviewHistory(){
  // An explicit user clear must clear backup too, or the merge logic would
  // intentionally restore the old entries.
  try{localStorage.removeItem(REVIEW_KEY)}catch{}
  try{localStorage.removeItem(REVIEW_BACKUP_KEY)}catch{}
  const empty={season:ACTIVE_SEASON,items:[]};
  safeStorageSet(REVIEW_KEY,empty);
  return empty;
}
