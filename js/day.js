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
function jpLabel(i){return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] || String(i+1);}

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
  if(data.exercise?.steps?.length){
    data.exercise.steps.forEach((s,i)=>steps.push({
      kind:"exercise_step",
      exercise_title:data.exercise.title,
      exercise_objective:data.exercise.objective,
      exercise_description:data.exercise.description,
      step_number:i+1,
      step_total:data.exercise.steps.length,
      ...s
    }));
  }else if(data.exercise){
    steps.push({kind:"exercise_info",...data.exercise});
  }

  current=Math.min(state.currentStep||0,Math.max(steps.length-1,0));

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

  if(step.kind==="exercise_step") box.innerHTML=exerciseStepHtml(step);
  else if(step.kind==="exercise_info") box.innerHTML=exerciseInfoHtml(step);
  else box.innerHTML=questionHtml(step);

  bind();
}

function updateProgress(){
  const pct=steps.length?Math.round((current/steps.length)*100):0;
  document.getElementById("progressFill").style.width=pct+"%";
  document.getElementById("progressText").textContent=`${Math.min(current+1,steps.length)} / ${steps.length} ステップ`;
}

function orderedChoices(q){
  if(!state.order[q.id]){
    state.order[q.id]=shuffle((q.choices||[]).map(c=>c.id));
    save();
  }
  return state.order[q.id].map(id=>(q.choices||[]).find(c=>c.id===id)).filter(Boolean);
}

function choiceBlock(item, answered){
  const multi=item.type==="multiple";
  const name=`q-${item.id}`;
  const choices=orderedChoices(item);
  return `<div class="choice-list">
    ${choices.map((c,i)=>`<label class="choice">
      <input type="${multi?"checkbox":"radio"}" name="${name}" value="${esc(c.id)}" ${answered?.selected?.includes(c.id)?"checked":""}>
      <span><strong>${jpLabel(i)}.</strong> ${esc(c.text)}</span>
    </label>`).join("")}
  </div>`;
}

function questionHtml(q){
  const answered=state.answers[q.id];
  let body="";

  if(q.type==="single" || q.type==="multiple"){
    body=choiceBlock(q,answered);
  }else if(q.type==="number"){
    body=`<label class="input-block"><span>${esc(q.input_label||"数値を入力")}</span>
      <input id="numberAnswer" type="number" step="${esc(q.step||"any")}" value="${answered?.value??""}" ${answered?"disabled":""}></label>
      ${q.unit?`<p class="muted">単位：${esc(q.unit)}</p>`:""}`;
  }else if(q.type==="text"){
    body=`<label class="input-block"><span>${esc(q.input_label||"回答を入力")}</span>
      <textarea id="textAnswer" rows="6" ${answered?"disabled":""}>${esc(answered?.value||"")}</textarea></label>`;
  }

  return `<p class="kicker">${q.type==="multiple"?"複数回答":q.type==="single"?"単一選択":q.type==="number"?"数値入力":"記述回答"}</p>
  <h2>${esc(q.title||"問題")}</h2>
  <p>${esc(q.question)}</p>
  ${q.note?`<div class="exercise-note">${esc(q.note)}</div>`:""}
  ${body}
  ${answered?feedbackHtml(q,answered.correct):`<button class="button" id="submitAnswer">回答を確定</button>`}
  ${answered?`<button class="button" id="nextStep">${current===steps.length-1?"結果を見る":"次へ"}</button>`:""}`;
}

function exerciseHeader(e){
  return `<p class="kicker">演習 ${e.step_number||""}${e.step_total?` / ${e.step_total}`:""}</p>
  <h2>${esc(e.exercise_title||e.title||"演習")}</h2>
  ${e.exercise_objective?`<div class="exercise-note"><strong>目的</strong><br>${esc(e.exercise_objective)}</div>`:""}
  ${e.exercise_description?`<p>${esc(e.exercise_description)}</p>`:""}`;
}

function exerciseStepHtml(e){
  const answered=state.answers[e.id];
  let body="";

  if(e.type==="single" || e.type==="multiple"){
    body = `${e.question?`<h3>${esc(e.question)}</h3>`:""}${choiceBlock(e,answered)}`;
  }else if(e.type==="number"){
    body = `${e.question?`<h3>${esc(e.question)}</h3>`:""}
      <label class="input-block"><span>${esc(e.input_label||"数値を入力")}</span>
      <input id="numberAnswer" type="number" step="${esc(e.step||"any")}" value="${answered?.value??""}" ${answered?"disabled":""}></label>
      ${e.unit?`<p class="muted">単位：${esc(e.unit)}</p>`:""}`;
  }else if(e.type==="text"){
    body = `${e.question?`<h3>${esc(e.question)}</h3>`:""}
      <label class="input-block"><span>${esc(e.input_label||"回答を入力")}</span>
      <textarea id="textAnswer" rows="5" ${answered?"disabled":""}>${esc(answered?.value||"")}</textarea></label>`;
  }else{
    body = `<p>${esc(e.instructions||e.question||"演習に取り組んでください。")}</p>`;
  }

  return `${exerciseHeader(e)}
    ${e.instructions?`<div class="exercise-note"><strong>取り組み方</strong><br>${esc(e.instructions)}</div>`:""}
    ${body}
    ${answered?feedbackHtml(e,answered.correct):`<button class="button" id="submitExerciseStep">回答を確定</button>`}
    ${answered?`<button class="button" id="nextStep">${current===steps.length-1?"結果を見る":"次へ"}</button>`:""}`;
}

function exerciseInfoHtml(e){
  const answered=state.answers[e.id];
  return `${exerciseHeader(e)}
    ${e.description?`<p>${esc(e.description)}</p>`:""}
    ${e.instructions?`<div class="exercise-note"><strong>取り組み方</strong><br>${esc(e.instructions)}</div>`:""}
    ${answered?feedbackHtml(e,true):`<button class="button" id="submitExerciseInfo">演習を確認済みにする</button>`}
    ${answered?`<button class="button" id="nextStep">結果を見る</button>`:""}`;
}

function displayedCorrectAnswer(item){
  if(item.type==="number"){
    const tol = item.tolerance ?? 0;
    if(tol>0) return `${item.correct_value}（±${tol}）${item.unit?` ${item.unit}`:""}`;
    return `${item.correct_value}${item.unit?` ${item.unit}`:""}`;
  }
  if(item.type==="text"){
    return item.model_answer || item.answer || "";
  }
  if(item.choices){
    const order=state.order[item.id] || item.choices.map(c=>c.id);
    const labels="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const correctIds=new Set(item.correct_answers||[]);
    const shown=order.map((id,index)=>{
      const choice=item.choices.find(c=>c.id===id);
      return {id,index,choice};
    }).filter(x=>x.choice && correctIds.has(x.id));
    if(shown.length) return shown.map(x=>`${labels[x.index]}. ${x.choice.text}`).join(" / ");
  }
  return item.answer || "";
}

function feedbackHtml(item,correct){
  const answerText=displayedCorrectAnswer(item);
  const heading = item.type==="text" ? "回答例" : (correct ? "正解" : "不正解");
  return `<div class="feedback ${correct?"correct":"incorrect"}">
    <strong>${heading}</strong>
    ${answerText?`<p><strong>${item.type==="text"?"回答例":"正答"}：</strong>${esc(answerText)}</p>`:""}
    ${item.explanation?`<p>${esc(item.explanation)}</p>`:""}
  </div>`;
}

function checkChoice(step){
  const selected=[...document.querySelectorAll(`#questionArea input:checked`)].map(x=>x.value);
  if(!selected.length){alert("回答を選択してください。");return null;}
  const correctSet=[...(step.correct_answers||[])].sort().join("|");
  const selectedSet=[...selected].sort().join("|");
  return {selected,correct:correctSet===selectedSet};
}

function checkNumber(step){
  const el=document.getElementById("numberAnswer");
  if(!el || el.value===""){alert("数値を入力してください。");return null;}
  const value=Number(el.value);
  const tol=Number(step.tolerance ?? 0);
  const correct=Math.abs(value-Number(step.correct_value)) <= tol;
  return {value,correct};
}

function checkText(step){
  const el=document.getElementById("textAnswer");
  const value=(el?.value||"").trim();
  if(!value){alert("回答を入力してください。");return null;}
  // 記述は自動採点せず、回答済みとして扱う。
  return {value,correct:true,manual:true};
}

function commitAnswer(step,result){
  if(!result) return;
  state.answers[step.id]=result;
  if(result.correct) state.score=(state.score||0)+1;
  save();
  render();
}

function bind(){
  const step=steps[current];

  document.getElementById("submitAnswer")?.addEventListener("click",()=>{
    let result=null;
    if(step.type==="single" || step.type==="multiple") result=checkChoice(step);
    else if(step.type==="number") result=checkNumber(step);
    else if(step.type==="text") result=checkText(step);
    commitAnswer(step,result);
  });

  document.getElementById("submitExerciseStep")?.addEventListener("click",()=>{
    let result=null;
    if(step.type==="single" || step.type==="multiple") result=checkChoice(step);
    else if(step.type==="number") result=checkNumber(step);
    else if(step.type==="text") result=checkText(step);
    else result={selected:["done"],correct:true};
    commitAnswer(step,result);
  });

  document.getElementById("submitExerciseInfo")?.addEventListener("click",()=>{
    commitAnswer(step,{selected:["done"],correct:true});
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
  <p>選択式・数値入力は自動判定します。記述式は回答例と比較して自己確認する方式です。</p>
  <a class="button" href="index.html">Day一覧へ戻る</a>`;
}
init();
