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

/*
 * Legacy compatibility fixes (Day 1–15)
 *
 * Day 1–15 were authored when explanations sometimes referred to the original
 * option letters (A/B/C...). Randomizing those old choices can therefore make
 * the visible letter and the explanation disagree.
 *
 * For Day 1–15 only, choices are displayed in their original authored order.
 * Day 16 onward continues to use randomized choice order. From Day 16 onward,
 * explanations must not depend on fixed option letters.
 *
 * This function also restores ten legacy question/context omissions identified
 * in the 2026-10-06 audit. It does not change correct_answers.
 */
function applyLegacyQuestionFixes(d){
  if(!d || !Array.isArray(d.questions)) return;
  const byId=Object.fromEntries(d.questions.map(q=>[q.id,q]));

  if(d.day===3 && byId["D03-K03-Q2"]){
    byId["D03-K03-Q2"].question=
      "状況説明／データ 特殊詐欺被害リスクの簡易チェックを1,000人に実施しました。50人が『高リスク』と判定され、その後1か月に実際の被害が確認された人は全体で10人でした。被害者10人のうち8人は高リスク群、2人はそれ以外でした。 この結果の実務上の解釈として、最も適切なものはどれですか。";
  }

  if(d.day===5){
    if(byId["D05-Q1-1"]) byId["D05-Q1-1"].question=
      "防犯登録率が介入前60％、介入後75％でした。比較期間はいずれも同じ長さです。 介入前から介入後への変化として正しいものを1つ選んでください。";
    if(byId["D05-Q1-2"]) byId["D05-Q1-2"].question=
      "防犯登録率が介入前60％、介入後75％でした。比較期間はいずれも同じ長さです。 相対的な増加率として正しいものを1つ選んでください。";
    if(byId["D05-Q2-1"]) byId["D05-Q2-1"].question=
      "駅前駐輪場で自転車盗が多発しています。無施錠車が多く、夜間は管理者の巡回がなく、出入口から駐輪区画が見えにくい状態でした。 日常活動理論の観点から最も適切な説明を1つ選んでください。";
    if(byId["D05-Q3-1"]) byId["D05-Q3-1"].question=
      "自転車の二重ロックを促す広報文を検討しています。便益と損失を同程度の大きさで表現した場合を考えます。 損失回避を利用した表現として最も適切なものを1つ選んでください。";
    if(byId["D05-Q4-1"]) byId["D05-Q4-1"].question=
      "防犯教室を実施した地区では被害率が10％から7％へ低下しました。同期間、教室を実施しなかった比較地区でも9％から6％へ低下しました。 この結果から最も妥当な解釈を1つ選んでください。";
    if(byId["D05-Q5-1"]) byId["D05-Q5-1"].question=
      "大規模データを用いた分析で、施策後の通報処理時間が平均30.0分から29.8分へ0.2分短縮し、統計的には有意でした。 EBP実務上、追加で確認すべき事項として適切なものをすべて選んでください。";
  }

  if(d.day===14){
    if(byId["D14-K1-1"]) byId["D14-K1-1"].question=
      "状況説明／データ 駅前A地区で自転車盗対策を実施したところ、A地区内の認知件数は実施前6か月の42件から実施後6か月の25件へ減少しました。ただし、周辺地区や隣接時間帯の状況はまだ確認していません。 この段階で、犯罪の転移または利益の拡散を検討するために追加確認すべきものとして適切なものをすべて選んでください。";
    if(byId["D14-K2-1"]) byId["D14-K2-1"].question=
      "状況説明／データ 自治体と警察は、不審電話対策アプリの導入を促すため、『警察署長があなたと家族を守るために推薦します』というメッセージを検討しています。単に導入率が上がったかではなく、推薦者の肩書きが上乗せ効果を持つかを確かめたいと考えています。 推薦者の肩書きによる上乗せ効果を最も直接的に検証できる設計を1つ選んでください。";
    if(byId["D14-K3-1"]) byId["D14-K3-1"].question=
      "状況説明／データ ある防犯教室で、知識、リスク認知、不安感、相談意図、家族との会話、施錠行動など12指標を測定しました。分析後に、有意差が出た指標だけを成果として公表する案が出ています。 偶然の有意差を成果と誤認する危険を減らす対応として適切なものをすべて選んでください。";
  }
}

async function init(){
  const day=getDay();
  const idx=await fetch("data/index.json").then(r=>r.json());
  const entry=idx.entries.find(x=>x.day===day);
  if(!entry){document.getElementById("questionArea").innerHTML="<p>Dayが見つかりません。</p>";return;}

  data=await fetch(entry.file).then(r=>r.json());
  applyLegacyQuestionFixes(data);
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
  // Legacy Day 1–15: preserve authored order so historical explanations that
  // refer to A/B/C... remain consistent. Existing randomized localStorage
  // orders are overwritten with the original order.
  if(data?.day<=15){
    const original=(q.choices||[]).map(c=>c.id);
    const saved=state.order[q.id]||[];
    if(saved.join("|")!==original.join("|")){
      state.order[q.id]=original;
      save();
    }
    return q.choices||[];
  }

  // Day 16 onward: randomized display order. Explanations must be letter-free.
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
