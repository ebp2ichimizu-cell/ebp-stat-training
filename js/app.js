const INDEX_URL="data/index.json";
const KEY="ebpStatTrainingProgressV1";

function getState(){
  try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}
}
function setState(s){localStorage.setItem(KEY,JSON.stringify(s));}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function jpDate(date){const d=new Date(date+"T00:00:00");return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;}

async function init(){
  const idx=await fetch(INDEX_URL).then(r=>r.json());
  const entries=[...idx.entries].sort((a,b)=>b.day-a.day);
  const state=getState();
  let completed=0,totalScore=0,totalPossible=0;

  entries.forEach(e=>{
    const s=state[e.day]||{};
    if(s.completed) completed++;
    totalScore += s.score||0;
    totalPossible += s.completed ? (s.maxScore||0) : 0;
  });

  document.getElementById("completedDays").textContent=completed;
  document.getElementById("totalScore").textContent=totalScore;
  document.getElementById("totalPossible").textContent=totalPossible;

  const latest=entries[0];
  const ls=state[latest.day]||{};
  document.getElementById("currentDay").innerHTML=card(latest,ls,true);
  document.getElementById("dayList").innerHTML=entries.map(e=>card(e,state[e.day]||{},false)).join("");

  document.getElementById("resetAll").addEventListener("click",()=>{
    if(confirm("このブラウザに保存された学習履歴をすべて削除しますか？")){
      localStorage.removeItem(KEY); location.reload();
    }
  });
}

function card(e,s,isLatest){
  let label="未着手", cls="";
  if(s.completed){label=`完了 ${s.score||0}/${s.maxScore||0}`; cls="done";}
  else if((s.currentStep||0)>0){label=`途中 ${s.currentStep+1}ステップ目`; cls="progress";}
  return `<article class="day-card">
    <h3>Day ${String(e.day).padStart(2,"0")}｜${esc(e.title||"")}</h3>
    <p class="muted">${jpDate(e.date)}</p>
    <div class="meta"><span class="badge">${esc(e.format_label||"知識5題＋演習1題")}</span><span class="status ${cls}">${label}</span></div>
    ${e.description?`<p>${esc(e.description)}</p>`:""}
    <a class="button" href="day.html?day=${e.day}${s.completed?"&restart=1":""}">${s.completed?"もう一度解く":(s.currentStep>0?"続きから":"問題を解く")}</a>
  </article>`;
}
init();
