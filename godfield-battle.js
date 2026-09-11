import { initGodFieldBattle } from './godfield.js?v=2.02-defense-question-001';
try{initGodFieldBattle()}catch(e){console.error(e);const s=document.getElementById('gf-status');if(s)s.textContent='初期化エラー: '+(e?.message||'unknown')}
