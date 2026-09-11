import { initGodFieldBattle } from './godfield.js?v=2.00-final-004';
try{initGodFieldBattle()}catch(e){console.error(e);const s=document.getElementById('gf-status');if(s)s.textContent='初期化エラー: '+(e?.message||'unknown')}
