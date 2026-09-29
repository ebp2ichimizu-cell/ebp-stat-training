const KEY="ebpStatTrainingProgressV1";
let data=null,stateAll={},state=null,steps=[],current=0;

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function loadAll(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
function save(){
  state.currentStep=current;
  stateAll[data.day]=state;
  localStorage.setItem(KEY,JSON.stringify(stateAll));
}
function getDay(){return Number(new URLSearchParams(location.search).get("day"));}
function shouldRestart(){return new URLSearchParams(location.search).get("restart")==="1";}

async function init(){
  const day=getDay();
  const idx=await fetch("data/index.json").then(r=>r.json());
  const entry=idx.entries.find(x=>x.day===day);
  if(!entry){document.getElementById("questionArea").innerHTML="<p>Dayが見つかりません。</p>";return;}
  data=await fetch(entry.file).then(r=>r.json());
  stateAll=loadAll();

  if(shouldRestart()){
    delete stateAll[data.day];
    localStorage.setItem(KEY,JSON.stringify(stateAll));
    history.replaceState(null,"",`day.html?day=${data.day}`);
  }

  state=stateAll[data.day]||{answers:{},score:0,currentStep:0,completed:false,maxScore:0,order:{}};

  steps=(data.questions||[]).map(q=>({kind:"question",...q}));
  if(data.exercise) steps.push({kind:"exercise",...data.exercise});

  current=Math.min(state.currentStep||0,steps.length-1);
  document.getElementById("dayHeader").innerHTML=`<h2>Day ${String(data.day).padStart(2,"0")}｜${esc(data.title||"")}</h2>
  <p class="muted">${esc(data.date)}｜全${steps.length}ステップ</p>
  <div class="downloads">
    ${data.pdf_url?`<a class="button secondary" href="${esc(data.pdf_url)}" target="_blank" rel="noopener">PDF教材</a>`:""}
    ${data.excel_url?`<a class="button secondary" href="${esc(data.excel_url)}" target="_blank" rel="noopener">Excel演習</a>`:""}
  </div>`;
  document.getElementById("interruptButton")?.addEventListener("click",()=>{
    save();
    location.href="index.html";
  });
  render();
}

function render(){
  updateProgress();
  const step=steps[current];
  if(!step){return finish();}
  const box=document.getElementById("questionArea");
  if(step.kind==="exercise") box.innerHTML=exerciseHtml(step);
  else box.innerHTML=questionHtml(step);
  bind();
}

function updateProgress(){
  const pct=steps.length?Math.round((current/steps.length)*100):0;
  document.getElementById("progressFill").style.width=pct+"%";
  document.getElementById("progressText").textContent=`${current+1} / ${steps.length} ステップ`;
}

function orderedChoices(q){
  if(!state.order[q.id]){
    state.order[q.id]=shuffle(q.choices.map(c=>c.id));
    save();
  }
  return state.order[q.id].map(id=>q.choices.find(c=>c.id===id)).filter(Boolean);
}

function questionHtml(q){
  const multi=q.type==="multiple";
  const name=`q-${q.id}`;
  const answered=state.answers[q.id];
  const choices=orderedChoices(q);
  return `<p class="kicker">${multi?"複数回答":"単一選択"}</p>
  <h2>${esc(q.title||"問題")}</h2>
  <p>${esc(q.question)}</p>
  ${q.note?`<div class="exercise-note">${esc(q.note)}</div>`:""}
  <div class="choice-list">
  ${choices.map((c,i)=>`<label class="choice"><input type="${multi?"checkbox":"radio"}" name="${name}" value="${esc(c.id)}" ${answered?.selected?.includes(c.id)?"checked":""}> <span><strong>${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]}.</strong> ${esc(c.text)}</span></label>`).join("")}
  </div>
  ${answered?feedbackHtml(q,answered.correct):`<button class="button" id="submitAnswer">回答を確定</button>`}
  ${answered?`<button class="button" id="nextStep">${current===steps.length-1?"結果を見る":"次へ"}</button>`:""}`;
}

function exerciseHtml(e){
  const answered=state.answers[e.id];
  return `<p class="kicker">演習</p>
  <h2>${esc(e.title)}</h2>
  ${e.objective?`<div class="exercise-note"><strong>目的</strong><br>${esc(e.objective)}</div>`:""}
  ${e.description?`<p>${esc(e.description)}</p>`:""}
  ${e.instructions?`<div class="exercise-note"><strong>取り組み方</strong><br>${esc(e.instructions)}</div>`:""}
  ${answered?feedbackHtml(e,true):`<button class="button" id="submitExercise">演習を確認済みにする</button>`}
  ${answered?`<button class="button" id="nextStep">結果を見る</button>`:""}`;
}

function displayedCorrectAnswer(item){
  if(item.kind==="exercise") return item.answer || "";
  const order = state.order[item.id] || item.choices.map(c=>c.id);
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const correctIds = new Set(item.correct_answers || []);
  const shown = order.map((id,index)=>{
    const choice = item.choices.find(c=>c.id===id);
    return {id,index,choice};
  }).filter(x=>x.choice && correctIds.has(x.id));
  if(!shown.length) return item.answer || "";
  return shown.map(x=>`${labels[x.index]}. ${x.choice.text}`).join(" / ");
}

function feedbackHtml(item,correct){
  const answerText = displayedCorrectAnswer(item);
  return `<div class="feedback ${correct?"correct":"incorrect"}">
    <strong>${item.kind==="exercise"?"演習の解説":(correct?"正解":"不正解")}</strong>
    ${answerText?`<p><strong>正答：</strong>${esc(answerText)}</p>`:""}
    ${item.explanation?`<p>${esc(item.explanation)}</p>`:""}
  </div>`;
}

function bind(){
  const step=steps[current];
  document.getElementById("submitAnswer")?.addEventListener("click",()=>{
    const selected=[...document.querySelectorAll(`#questionArea input:checked`)].map(x=>x.value);
    if(!selected.length){alert("回答を選択してください。");return;}
    const correctSet=[...(step.correct_answers||[])].sort().join("|");
    const selectedSet=[...selected].sort().join("|");
    const correct=correctSet===selectedSet;
    state.answers[step.id]={selected,correct};
    if(correct) state.score=(state.score||0)+1;
    save(); render();
  });
  document.getElementById("submitExercise")?.addEventListener("click",()=>{
    state.answers[step.id]={selected:["done"],correct:true};
    state.score=(state.score||0)+1;
    save(); render();
  });
  document.getElementById("nextStep")?.addEventListener("click",()=>{
    current++;
    if(current>=steps.length) finish();
    else {save();render();window.scrollTo({top:0,behavior:"smooth"});}
  });
}

function finish(){
  state.completed=true;
  state.currentStep=steps.length;
  state.maxScore=steps.length;
  save();
  document.getElementById("questionPanel").classList.add("hidden");
  document.getElementById("resultPanel").classList.remove("hidden");
  document.getElementById("progressFill").style.width="100%";
  document.getElementById("progressText").textContent=`完了 ${steps.length} / ${steps.length} ステップ`;
  document.getElementById("resultArea").innerHTML=`<h2>Day ${String(data.day).padStart(2,"0")} 完了</h2>
  <p><strong>スコア：${state.score||0} / ${steps.length}</strong></p>
  <p>スコアはステップ単位です。複数回答問題は、すべて正しい選択肢を選んだ場合に1点です。</p>
  <a class="button" href="index.html">Day一覧へ戻る</a>`;
}
init();
