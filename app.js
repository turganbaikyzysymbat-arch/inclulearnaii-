
// Authentication, role dashboards and learning features
const authScreen = document.querySelector("#authScreen");
const authSubmit = document.querySelector("#authSubmit");
let authMode = "login";
let currentUser = null;

function setAuthMode(mode){
  authMode=mode;
  document.querySelector("#loginTab").classList.toggle("active",mode==="login");
  document.querySelector("#registerTab").classList.toggle("active",mode==="register");
  document.querySelector("#registerFields").classList.toggle("hidden",mode!=="register");
  document.querySelector("#authTitle").textContent=mode==="login"?"Кіру":"Тіркелу";
  authSubmit.innerHTML=mode==="login"?"Кіру <b>→</b>":"Тіркелу <b>→</b>";
  document.querySelector("#authError").textContent="";
}
async function authRequest(url, body){
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||"Қате");
  return data;
}
function levelFor(score, quizzes){
  if(quizzes >= 10 || score >= 90) return "Master";
  if(quizzes >= 5 || score >= 75) return "Explorer";
  return "Starter";
}
async function loadRoleDashboard(){
  const res=await fetch("/api/dashboard");
  if(!res.ok)return;
  const data=await res.json();
  document.querySelector("#roleDashboard").classList.remove("hidden");
  document.querySelector("#welcomeUser").textContent=`Сәлем, ${currentUser.name}!`;
  const student=currentUser.role==="student";
  document.body.classList.toggle("student-mode", student);
  document.body.classList.toggle("teacher-mode", !student);
  document.querySelector("#roleText").textContent=student?"Бүгінгі оқу жолыңды өзіңе ыңғайлы қарқынмен жалғастыр.":"Материалдар мен сыныптардың оқу процесін бір жерден басқарыңыз.";
  document.querySelector("#roleKicker").textContent=student?"STUDENT SPACE":"TEACHER WORKSPACE";
  document.querySelector("#studentDashboard").classList.toggle("hidden",!student);
  document.querySelector("#teacherDashboard").classList.toggle("hidden",student);
  const nav=document.querySelector(".sidebar nav");
  if(nav){
    nav.innerHTML=student ? `
      <button class="nav-link active" data-view="dashboard"><span>⌂</span><span>Менің оқуым</span></button>
      <button class="nav-link" data-view="materials"><span>▱</span><span>Материалдар</span></button>
      <button class="nav-link" data-view="about"><span>✦</span><span>Ayla AI</span></button>
    ` : `
      <button class="nav-link active" data-view="dashboard"><span>⌂</span><span>Teacher Space</span></button>
      <button class="nav-link" data-view="materials"><span>▱</span><span>Материалдар</span></button>
      <button class="nav-link" data-view="about"><span>✦</span><span>Ayla AI</span></button>
    `;
    $$(".nav-link").forEach((item) => item.onclick = () => showView(item.dataset.view));
  }
  const aiProfile=document.querySelector(".ai-profile");
  if(aiProfile && student){ aiProfile.querySelector("small").textContent="Сенің оқу серігің"; }
  if(student){
    document.querySelector("#statQuiz").textContent=data.quiz_count||0;
    document.querySelector("#statAverage").textContent=(data.average_score||0)+"%";
    document.querySelector("#statStreak").textContent=data.streak||0;
    document.querySelector("#statLevel").textContent=levelFor(data.average_score||0,data.quiz_count||0);
    const mission=data.mission||{source:"system",id:null,title:"Ayla AI миссиясы",done:0,target:1,text:"Бір Quiz орындаңыз"};
    document.querySelector("#missionText").textContent=mission.text;
    document.querySelector("#missionProgress").textContent=mission.done>=mission.target ? "✓ орындалды" : `${mission.done}/${mission.target}`;
    document.querySelector("#missionFill").style.width=`${Math.min(100,(mission.done/Math.max(1,mission.target))*100)}%`;
    const missionTitle=document.querySelector("#missionTitle");
    if(missionTitle) missionTitle.textContent=mission.title || "Бүгінгі оқу миссиясы";
    const missionAction=document.querySelector("#missionAction");
    if(missionAction){
      missionAction.dataset.missionId=mission.id||"";
      missionAction.dataset.missionSource=mission.source||"system";
      missionAction.textContent=mission.done>=mission.target ? "Аяқталды ✓" : (mission.source==="teacher" ? "Белгілеу ✓" : "Бастау →");
      missionAction.disabled=mission.done>=mission.target;
    }
    document.querySelector("#studentBadges").innerHTML=(data.badges||[]).map(b=>`<div class="badge-item"><span>${b.icon}</span><b>${esc(b.title)}</b><small>${esc(b.text)}</small></div>`).join("")||'<div class="badge-empty">Алғашқы Quiz-ді орындап, бірінші белгіңді ал.</div>';
    document.querySelector("#studentClasses").innerHTML=(data.classes||[]).map(c=>`<div class="class-mini"><div><b>${esc(c.name)}</b><small>${esc(c.code)}</small></div><span>✓</span></div>`).join("")||"<div class='empty-inline'>Сыныпқа әлі қосылған жоқсыз.</div>";
    document.querySelector("#recentActivity").innerHTML=(data.recent||[]).map(x=>{const pct=Math.round((x.score/Math.max(1,x.total))*100);return `<div class="recent-item"><div><b>${esc(x.title)}</b><small>${esc(x.created_at)}</small></div><strong>${pct}%</strong></div>`}).join("")||'<div class="empty-inline">Әзірге Quiz нәтижесі жоқ.</div>';
  }else{
    document.querySelector("#teacherStudentCount").textContent=data.total_students||0;
    document.querySelector("#teacherClassCount").textContent=data.class_count||0;
    const classes=data.classes||[];
    const attempts=classes.reduce((s,c)=>s+(c.attempts||0),0);
    const avg=classes.length?Math.round(classes.reduce((s,c)=>s+(c.average||0),0)/classes.length):0;
    document.querySelector("#teacherAttempts").textContent=attempts;
    document.querySelector("#teacherAverage").textContent=avg+"%";
    document.querySelector("#teacherClasses").innerHTML=classes.map(c=>`<div class="teacher-class-card"><div class="teacher-class-top"><div><span class="class-dot">✦</span><div><b>${esc(c.name)}</b><small>${esc(c.code)}</small></div></div><button class="copy-code" data-code="${esc(c.code)}">Кодты көшіру</button></div><div class="teacher-class-metrics"><span><b>${c.students||0}</b> оқушы</span><span><b>${c.attempts||0}</b> Quiz</span><span><b>${c.average||0}%</b> орташа</span></div></div>`).join("")||'<div class="empty-inline">Алдымен бірінші сыныпты құрыңыз.</div>';
    document.querySelectorAll(".copy-code").forEach(btn=>btn.onclick=()=>{navigator.clipboard?.writeText(btn.dataset.code);toast("Сынып коды көшірілді");});
    const missionClass=document.querySelector("#missionClass");
    if(missionClass){
      missionClass.innerHTML='<option value="">Сыныпты таңдаңыз</option>'+classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
    }
    const missionList=document.querySelector("#teacherMissions");
    if(missionList){
      missionList.innerHTML=(data.missions||[]).map(m=>`<div class="mission-admin-item"><div><b>${esc(m.title)}</b><small>${esc(m.class_name)} · ${esc(m.due_date)}</small><p>${esc(m.description)}</p></div></div>`).join("")||'<div class="empty-inline">Әлі миссия берілген жоқ.</div>';
    }
  }
}
async function checkAuth(){
  try{const res=await fetch("/api/auth/me");const data=await res.json();if(data.authenticated){currentUser=data.user;authScreen.classList.add("hidden");await loadRoleDashboard();}else authScreen.classList.remove("hidden");}
  catch(e){authScreen.classList.remove("hidden");}
}

document.querySelector("#loginTab").onclick=()=>setAuthMode("login");
document.querySelector("#registerTab").onclick=()=>setAuthMode("register");
document.querySelector("#authRole").onchange=(e)=>{const s=document.querySelector("#authSubject");const l=document.querySelector("#subjectLabel");const show=e.target.value==="teacher";s.classList.toggle("hidden",!show);if(l)l.classList.toggle("hidden",!show);};
authSubmit.onclick=async()=>{
  const error=document.querySelector("#authError");error.textContent="";
  try{
    const body={email:document.querySelector("#authEmail").value,password:document.querySelector("#authPassword").value};
    if(authMode==="register"){body.name=document.querySelector("#authName").value;body.role=document.querySelector("#authRole").value;body.subject=document.querySelector("#authSubject").value;}
    const data=await authRequest(authMode==="login"?"/api/auth/login":"/api/auth/register",body);
    currentUser=data.user;authScreen.classList.add("hidden");await loadRoleDashboard();toast(authMode==="login"?"Қош келдіңіз!":"Тіркелу сәтті аяқталды!");
  }catch(e){error.textContent=e.message;}
};
document.querySelector("#logoutButton").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST"});location.reload();};
document.querySelector("#joinClass").onclick=async()=>{try{const d=await authRequest("/api/classes/join",{code:document.querySelector("#classCode").value});toast(`Сіз ${d.class.name} сыныбына қосылдыңыз`);await loadRoleDashboard();}catch(e){toast(e.message);}};
document.querySelector("#missionAction")?.addEventListener("click",async()=>{
  const btn=document.querySelector("#missionAction");
  const id=btn?.dataset.missionId;
  const source=btn?.dataset.missionSource;
  if(source==="teacher" && id){
    try{
      const d=await authRequest(`/api/missions/${id}/complete`,{});
      toast("Миссия орындалды ✓");
      await loadRoleDashboard();
    }catch(e){toast(e.message);}
  }else{
    showView("materials");
  }
});

document.querySelector("#createMission")?.addEventListener("click",async()=>{
  try{
    const body={
      class_id:Number(document.querySelector("#missionClass").value),
      title:document.querySelector("#missionTitleInput").value,
      description:document.querySelector("#missionDescription").value,
      due_date:document.querySelector("#missionDueDate").value
    };
    await authRequest("/api/missions",body);
    document.querySelector("#missionTitleInput").value="";
    document.querySelector("#missionDescription").value="";
    toast("Оқу миссиясы оқушыларға берілді ✓");
    await loadRoleDashboard();
  }catch(e){toast(e.message);}
});
document.querySelector("#createClass").onclick=async()=>{try{const d=await authRequest("/api/classes",{name:document.querySelector("#className").value,code:document.querySelector("#classCodeCreate").value});toast(`Сынып құрылды: ${d.code}`);await loadRoleDashboard();}catch(e){toast(e.message);}};

function initFocusMode(){
  const overlay=document.querySelector("#focusOverlay"); if(!overlay)return;
  let seconds=25*60, timer=null;
  const render=()=>{const m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");document.querySelector("#focusTimer").textContent=`${m}:${s}`;};
  document.querySelector("#focusButton")?.addEventListener("click",()=>{overlay.classList.remove("hidden");render();});
  document.querySelector("#studentStudy")?.addEventListener("click",()=>{showView("materials");});
  document.querySelector("#missionAction")?.addEventListener("click",()=>{showView("materials");});
  document.querySelector("#closeFocus")?.addEventListener("click",()=>{clearInterval(timer);timer=null;overlay.classList.add("hidden");});
  document.querySelector("#focusStart")?.addEventListener("click",()=>{if(timer){clearInterval(timer);timer=null;document.querySelector("#focusStart").textContent="Жалғастыру";return;}document.querySelector("#focusStart").textContent="Пауза";timer=setInterval(()=>{seconds--;render();if(seconds<=0){clearInterval(timer);timer=null;seconds=0;render();toast("Focus сессиясы аяқталды. Жарайсың!");}},1000);});
  document.querySelector("#focusReset")?.addEventListener("click",()=>{clearInterval(timer);timer=null;seconds=25*60;document.querySelector("#focusStart").textContent="Бастау";render();});
}
checkAuth();


const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  materialId: null,
  title: "",
  result: null,
  source: "",
  active: "simplified",
  language: "kk",
  progress: { completed: 0, score: 0 },
};

let labels = {
  simplified: "Жеңілдетілген мәтін",
  steps: "Қадам-қадаммен",
  examples: "Қосымша мысалдар",
  diagram: "Визуалды сызба",
  audio: "Аудио нұсқа",
  large: "Үлкейтілген қаріп",
  summary: "Қысқаша резюме",
  tasks: "Бейімделген тапсырмалар",
};

function t(key) {
  return window.LEARN4ALL_I18N?.[state.language]?.[key]
    || window.LEARN4ALL_I18N?.kk?.[key]
    || key;
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  labels = {
    simplified: t("simplified"),
    steps: t("steps"),
    examples: t("examples"),
    diagram: t("diagram"),
    audio: t("audio"),
    large: t("large"),
    summary: t("summary"),
    tasks: t("tasks"),
  };
  $$("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    if (element.dataset.i18n === "aboutHeadline" || element.dataset.i18n === "orChooseFile") {
      element.innerHTML = value;
    } else {
      element.textContent = value;
    }
  });
  $$("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  if (!$("#adaptButton").disabled) {
    const action = state.language === "kk" ? "Ayla AI арқылы бейімдеу" : state.language === "ru" ? "Адаптировать через Ayla AI" : "Adapt with Ayla AI";
    $("#adaptButton").innerHTML = `<span>✦</span> ${action} <kbd>Ctrl ↵</kbd>`;
  }
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} ${state.language === "kk" ? "таңба" : state.language === "ru" ? "симв." : "characters"}`;
  if (state.result) {
    renderResult({
      id: state.materialId,
      title: state.title,
      source_text: state.source,
      adaptation: state.result,
      progress: state.progress,
    });
  }
}

function toast(text) {
  const element = $("#toast");
  element.textContent = text;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3200);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
}

function selected() {
  return $$(".format input:checked").map((input) => input.value);
}

function updateCount() {
  $("#formatCount").textContent = selected().length;
}

function setSource(text) {
  state.source = text || "";
  $("#sourceText").value = state.source;
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} таңба`;
}

function showView(name) {
  $$(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  $$(".view").forEach((item) => item.classList.add("hidden"));
  $(`#${name}View`).classList.remove("hidden");
  if (name === "materials") loadMaterials();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function content(key, result) {
  if (key === "diagram") {
    const nodes = result.diagram?.nodes || [];
    return `<div class="diagram">${nodes.map((node, index) => `${index ? '<span class="arrow">→</span>' : ""}<div class="node">${esc(node)}</div>`).join("")}</div><div class="chips">${(result.keywords || []).map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>`;
  }
  if (key === "audio") {
    return `<div class="audio"><div class="audio-controls"><button id="speak" class="audio-play" aria-label="Ойнату">▶</button><button id="pauseSpeak" class="audio-control" aria-label="Пауза">Ⅱ</button><button id="stopSpeak" class="audio-control" aria-label="Тоқтату">■</button><button id="audioToggle" class="audio-control" aria-label="Дыбысты қосу/өшіру">🔊</button></div><div class="audio-copy"><b>${esc(t("audio"))}</b><small>${esc(t("answerFromMaterial"))}</small></div><div class="wave"></div></div><div class="result-body">${esc(result.audio || result.summary || result.simplified || "")}</div>`;
  }
  return `<div class="result-body ${key === "large" ? "large" : ""}">${esc(result[key] || "Бұл формат таңдалмады.")}</div>${key === "summary" ? `<div class="chips">${(result.keywords || []).map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>` : ""}`;
}

function renderProgress(progress = {}) {
  state.progress = {
    completed: Number(progress.completed || 0),
    score: Number(progress.score || 0),
  };
  const percent = state.progress.completed ? 100 : state.progress.score;
  $("#progressText").textContent = `${percent}% ${state.language === "kk" ? "аяқталды" : state.language === "ru" ? "завершено" : "completed"}`;
  $("#progressFill").style.width = `${percent}%`;
  $("#progressBar").classList.remove("hidden");
}

function renderPractice() {
  const rawTasks = String(state.result?.tasks || "")
    .split(/\n+/)
    .map((task) => task.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (!rawTasks.length) {
    $("#practiceCard").classList.add("hidden");
    return;
  }
  $("#practiceCard").classList.remove("hidden");
  $("#practiceCard").innerHTML = `
    <div class="practice-header"><div><span class="step">03</span><h3>${esc(t("practice"))}</h3><p>${esc(t("practiceHint"))}</p></div><span class="practice-score" id="practiceScore">0/${rawTasks.length}</span></div>
    <div class="practice-list">${rawTasks.map((task, index) => `<label><input type="checkbox" data-practice="${index}"><span>${esc(task)}</span></label>`).join("")}</div>
    <button id="finishPractice" class="secondary-button">${esc(t("saveProgress"))}</button>`;
  const checkboxes = $$("[data-practice]");
  const updateScore = () => {
    const score = checkboxes.filter((checkbox) => checkbox.checked).length;
    $("#practiceScore").textContent = `${score}/${checkboxes.length}`;
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateScore));
  $("#finishPractice").onclick = async () => {
    const score = Math.round((checkboxes.filter((checkbox) => checkbox.checked).length / checkboxes.length) * 100);
    await saveProgress(score === 100, score);
    toast(score === 100 ? t("allTasksDone") : t("progressSaved"));
  };
}

function renderResult(data) {
  state.materialId = data.id || state.materialId;
  state.title = data.title || state.title || "Оқу материалы";
  state.result = data.adaptation || data;
  state.source = data.source_text || state.source;
  const formats = selected();
  if (!formats.includes(state.active)) state.active = formats[0] || "simplified";
  $("#outputMeta").textContent = `${state.title} · ${state.source.length.toLocaleString("kk-KZ")} таңба · ${formats.length} формат`;
  $("#tabs").innerHTML = formats.map((key) => `<button class="tab ${key === state.active ? "active" : ""}" data-tab="${key}">${labels[key]}</button>`).join("");
  $("#result").innerHTML = `<div class="result-top"><h3>${labels[state.active]}</h3><button class="result-copy" id="copyCurrent">${esc(t("copyAll").replace("▣ ", ""))}</button></div>${content(state.active, state.result)}`;
  $$(".tab").forEach((tab) => {
    tab.onclick = () => {
      state.active = tab.dataset.tab;
      renderResult({ id: state.materialId, title: state.title, source_text: state.source, adaptation: state.result, progress: state.progress });
    };
  });
  $("#copyCurrent").onclick = () => {
    const value = state.result[state.active];
    navigator.clipboard?.writeText(typeof value === "object" ? JSON.stringify(value) : value || "");
    toast(t("copied"));
  };
  const audioText = state.result?.audio || state.result?.summary || state.result?.simplified || "";
  const audioLang = state.language === "ru" ? "ru-RU" : state.language === "en" ? "en-US" : "kk-KZ";
  let audioEnabled = localStorage.getItem("inclulearnAudioEnabled") !== "false";
  const chooseVoice = () => {
    if (!("speechSynthesis" in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const base = audioLang.slice(0,2).toLowerCase();
    return voices.find(v => v.lang?.toLowerCase() === audioLang.toLowerCase()) ||
      voices.find(v => v.lang?.toLowerCase().startsWith(base)) ||
      voices.find(v => v.default) || voices[0];
  };
  const updateAudioToggle = () => {
    const btn = $("#audioToggle");
    if (btn) { btn.textContent = audioEnabled ? "🔊" : "🔇"; btn.title = audioEnabled ? "Дыбысты өшіру" : "Дыбысты қосу"; }
  };
  updateAudioToggle();
  $("#audioToggle")?.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem("inclulearnAudioEnabled", String(audioEnabled));
    if (!audioEnabled && "speechSynthesis" in window) speechSynthesis.cancel();
    updateAudioToggle();
    toast(audioEnabled ? "Аудио қосылды" : "Аудио өшірілді");
  });
  $("#speak")?.addEventListener("click", () => {
    if (!audioEnabled) return toast("Алдымен 🔇 батырмасымен аудионы қосыңыз.");
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return toast(state.language === "kk" ? "Бұл браузерде дыбыстық оқу қолжетімсіз." : state.language === "ru" ? "В этом браузере нет озвучивания." : "Speech is not available in this browser.");
    const start = () => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = audioLang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      const voice = chooseVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => { if($("#speak")) $("#speak").textContent="▶"; };
      utterance.onend = () => { if($("#speak")) $("#speak").textContent="▶"; };
      utterance.onerror = () => toast("Аудионы іске қосу мүмкін болмады. Қайтадан ▶ басыңыз.");
      speechSynthesis.resume();
      speechSynthesis.speak(utterance);
      toast(state.language === "kk" ? "Аудио ойнатылып жатыр" : state.language === "ru" ? "Аудио воспроизводится" : "Audio is playing");
    };
    if (speechSynthesis.getVoices().length) start();
    else { speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; start(); }; setTimeout(start, 250); }
  });
  $("#pauseSpeak")?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
    else if (speechSynthesis.paused) speechSynthesis.resume();
  });
  $("#stopSpeak")?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    if($("#speak")) $("#speak").textContent="▶";
  });
  renderProgress(data.progress || state.progress);
  renderPractice();
  $("#outputSection").classList.remove("hidden");
  $("#outputSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function adapt() {
  const text = $("#sourceText").value.trim();
  if (!text) return toast(t("chooseMaterial"));
  const button = $("#adaptButton");
  button.disabled = true;
  button.innerHTML = `<span>◌</span> ${state.language === "kk" ? "Ayla AI талдап жатыр…" : state.language === "ru" ? "Ayla AI анализирует…" : "Ayla AI is analyzing…"}`;
  try {
    const body = new FormData();
    body.append("title", $("#materialTitle").value.trim() || "Жаңа оқу материалы");
    body.append("text", text);
    body.append("language", state.language);
    const response = await fetch("/api/materials", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    renderResult(data);
    toast(t("saved"));
  } catch (error) {
    toast(error.message || "Қате болды.");
  } finally {
    button.disabled = false;
    button.innerHTML = `<span>✦</span> ${state.language === "kk" ? "Ayla AI арқылы бейімдеу" : state.language === "ru" ? "Адаптировать через Ayla AI" : "Adapt with Ayla AI"} <kbd>Ctrl ↵</kbd>`;
  }
}

async function upload(file) {
  if (!file) return;
  const note = $("#fileNote");
  note.className = "file-note";
  note.textContent = `${file.name} ${state.language === "kk" ? "оқылып жатыр…" : state.language === "ru" ? "читается…" : "is being read…"}`;
  $("#materialTitle").value = file.name.replace(/\.[^.]+$/, "");
  const body = new FormData();
  body.append("file", file);
  body.append("title", $("#materialTitle").value);
  body.append("language", state.language);
  try {
    const response = await fetch("/api/materials", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSource(data.source_text);
    note.textContent = `✓ ${file.name} · ${state.language === "kk" ? "мәтін алынды" : state.language === "ru" ? "текст извлечён" : "text extracted"}`;
    renderResult(data);
    toast(t("saved"));
  } catch (error) {
    note.className = "file-note error";
    note.textContent = error.message;
  }
}

function demo() {
  $("#materialTitle").value = "ООП — Мұрагерлік";
  setSource("Мұрагерлік — объектіге бағытталған бағдарламалауда бір кластың басқа кластың қасиеттері мен әдістерін иелену мүмкіндігі. Ата-ана класс ортақ сипаттамаларды анықтайды, ал бала класс оларды қайта пайдаланып, жаңа қасиеттер қоса алады. Мысалы, Көлік класы қозғалу әдісіне ие болса, Автокөлік класы Көліктен мұра алып, қозғалу әдісін пайдаланады және қозғалтқыш түрін қосады. Мұрагерлік кодты қайталамай жазуға, бағдарламаны кеңейтуге және кластар арасындағы байланысты ұйымдастыруға көмектеседі.");
  toast(state.language === "kk" ? "Үлгі материал жүктелді." : state.language === "ru" ? "Демо-материал загружен." : "Demo material loaded.");
}

async function ask() {
  const question = $("#questionInput").value.trim();
  if (!question) return toast(t("questionRequired"));
  const box = $("#answer");
  const button = $("#askButton");
  button.disabled = true;
  box.classList.remove("hidden");
  box.textContent = t("answerLoading");
  try {
    const response = await fetch(`/api/materials/${state.materialId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    box.textContent = data.answer;
  } catch (error) {
    box.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function saveProgress(completed, score) {
  if (!state.materialId) return;
  const response = await fetch(`/api/materials/${state.materialId}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed, score }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  renderProgress(data);
}

async function loadMaterials() {
  const query = $("#searchMaterials").value.trim();
  const response = await fetch(`/api/materials${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const data = await response.json();
  $("#materialsList").innerHTML = data.materials.length
    ? data.materials.map((item) => `
      <article class="material-card">
        <div class="material-card-top"><h3>${esc(item.title)}</h3><button class="delete-material" data-delete="${item.id}" title="${esc(t("materialDeleted"))}">×</button></div>
        <p>${esc(item.source_text || "")}${(item.source_text || "").length >= 180 ? "…" : ""}</p>
        <div class="card-meta"><span>${item.progress?.score || 0}% ${state.language === "kk" ? "прогресс" : state.language === "ru" ? "прогресс" : "progress"}</span><small>${esc(item.updated_at)}</small></div>
        <button class="open-material" data-open="${item.id}">${state.language === "kk" ? "Материалды ашу" : state.language === "ru" ? "Открыть материал" : "Open material"} →</button>
      </article>`).join("")
    : `<div class="empty">${t("noMaterials")}</div>`;
  $$("[data-open]").forEach((button) => button.onclick = () => openMaterial(button.dataset.open));
  $$("[data-delete]").forEach((button) => button.onclick = () => deleteMaterial(button.dataset.delete));
}

async function openMaterial(id) {
  const response = await fetch(`/api/materials/${id}`);
  const data = await response.json();
  if (!response.ok) return toast(data.error);
  state.progress = data.progress || { completed: 0, score: 0 };
  $("#materialTitle").value = data.title;
  setSource(data.source_text);
  renderResult(data);
  showView("dashboard");
}

async function deleteMaterial(id) {
  if (!window.confirm(t("deleteConfirm"))) return;
  const response = await fetch(`/api/materials/${id}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) return toast(data.error);
  toast(t("materialDeleted"));
  loadMaterials();
}

function setAccessibility() {
  const root = document.documentElement;
  const fontScale = Number(localStorage.getItem("learn4all-font-scale") || "1");
  root.style.setProperty("--font-scale", fontScale);
  document.body.classList.toggle("high-contrast", localStorage.getItem("learn4all-contrast") === "1");
  document.body.classList.toggle("dark-mode", localStorage.getItem("learn4all-theme") === "dark");
}

function changeFont(delta) {
  const current = Number(localStorage.getItem("learn4all-font-scale") || "1");
  const next = Math.max(0.9, Math.min(1.35, Math.round((current + delta) * 100) / 100));
  localStorage.setItem("learn4all-font-scale", String(next));
  setAccessibility();
}

$("#sourceText").oninput = (event) => {
  state.source = event.target.value;
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} ${state.language === "kk" ? "таңба" : state.language === "ru" ? "симв." : "characters"}`;
};
$("#fileInput").onchange = (event) => upload(event.target.files[0]);
$("#demoButton").onclick = demo;
$("#adaptButton").onclick = adapt;
$("#askButton").onclick = ask;
$("#questionInput").onkeydown = (event) => { if (event.key === "Enter") ask(); };
$("#dropzone").ondragover = (event) => { event.preventDefault(); $("#dropzone").classList.add("dragging"); };
$("#dropzone").ondragleave = () => $("#dropzone").classList.remove("dragging");
$("#dropzone").ondrop = (event) => { event.preventDefault(); $("#dropzone").classList.remove("dragging"); upload(event.dataTransfer.files[0]); };
$$(".format").forEach((item) => item.onclick = () => setTimeout(() => {
  item.classList.toggle("selected", item.querySelector("input").checked);
  updateCount();
}, 0));
$$(".nav-link").forEach((item) => item.onclick = () => showView(item.dataset.view));
$("#printButton").onclick = () => window.print();
$("#copyButton").onclick = () => {
  const text = Object.entries(state.result || {})
    .filter(([key]) => labels[key])
    .map(([key, value]) => `${labels[key]}\n${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n\n");
  navigator.clipboard?.writeText(text);
  toast("Барлық нәтиже көшірілді");
};
$("#searchMaterials").oninput = () => loadMaterials();
$("#refreshMaterials").onclick = () => loadMaterials();
const savedLanguage = localStorage.getItem("learn4all-language");
if (savedLanguage && window.LEARN4ALL_I18N?.[savedLanguage]) state.language = savedLanguage;
$("#language").value = state.language;
$("#language").onchange = (event) => {
  state.language = event.target.value;
  localStorage.setItem("learn4all-language", state.language);
  applyLanguage();
  toast(state.language === "kk" ? "Қазақша тіл таңдалды" : state.language === "ru" ? "Выбран русский язык" : "English selected");
};
$("#fontDown").onclick = () => changeFont(-0.1);
$("#fontUp").onclick = () => changeFont(0.1);
$("#fontReset").onclick = () => { localStorage.setItem("learn4all-font-scale", "1"); setAccessibility(); };
$("#contrastButton").onclick = () => {
  localStorage.setItem("learn4all-contrast", localStorage.getItem("learn4all-contrast") === "1" ? "0" : "1");
  setAccessibility();
};
$("#themeButton").onclick = () => {
  localStorage.setItem("learn4all-theme", document.body.classList.contains("dark-mode") ? "light" : "dark");
  setAccessibility();
};
document.onkeydown = (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") adapt(); };

applyLanguage();
updateCount();
setAccessibility();
fetch("/api/health").then((response) => response.json()).then((data) => {
  if (!data.database) $("#dbStatus").innerHTML = `<i style='background:#e09a50'></i> ${t("databaseConnected")}`;
});