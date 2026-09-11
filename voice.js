// Uses the device's generic Japanese voice; no imitation of the photographed person.
let current=null;
export function stopVoice(){
  if(current && globalThis.speechSynthesis){globalThis.speechSynthesis.cancel();current=null;}
}
export function speakMori(enabled,onUnavailable=()=>{}) {
  if(!enabled)return;
  stopVoice();
  if(!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance){onUnavailable();return;}
  try {
    const utterance=new SpeechSynthesisUtterance('お前、エフラン、すぎぃ！');
    utterance.lang='ja-JP';utterance.rate=1.04;utterance.pitch=.82;utterance.volume=1;
    const voices=speechSynthesis.getVoices();
    const japanese=voices.find(v=>/^ja/i.test(v.lang));
    if(japanese)utterance.voice=japanese;
    utterance.onend=()=>{if(current===utterance)current=null;};
    utterance.onerror=()=>{if(current===utterance){current=null;onUnavailable();}};
    current=utterance;speechSynthesis.speak(utterance);
  } catch {current=null;onUnavailable();}
}
