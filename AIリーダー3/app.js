const S = {
  room: { name: "探究: 地域の防災マップ", code: "482915", limit: 20, used: 0 },
  me: null,
  tab: "chat",
  busy: false,
  msgs: [
    { id: 1, u: "ミサキ", t: "防災マップは小学生向けにしたいな" },
    { id: 2, u: "ケン", t: "避難所の情報はどこから集める？" },
  ],
  todos: [{ t: "市の防災サイトを調べる", a: "ミサキ", d: "", c: false }],
  risks: [],
  unread: 0,
  sources: [
    {
      t: "国土交通省 ハザードマップポータル",
      u: "disaster.mlit.go.jp",
      s: "洪水・土砂災害などの想定区域を確認できる公的ポータル。",
      by: "AI検索",
    },
    {
      t: "内閣府 防災情報のページ",
      u: "bousai.go.jp",
      s: "避難情報の種類や避難所の考え方をまとめた公式情報。",
      by: "AI検索",
    },
  ],
  sug: null,
  sugHandled: 0,
  aiCount: 0,
  reply: null,
  tt: null,
};
const NG = ["死ね", "バカ", "殺す"],
  $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
const ic = (n) => `<i data-lucide="${n}"></i>`,
  mob = () => innerWidth <= 760;
const icons = () => window.lucide && lucide.createIcons();
function hint() {
  $("code").placeholder = "現在のコード: " + S.room.code;
}
hint();
icons();
addEventListener("resize", () => {
  if (S.me) {
    if (S.tab === "todo" && !mob()) S.tab = "chat";
    render();
  }
});
function toast(msg, label, fn) {
  const t = $("toast");
  t.innerHTML = esc(msg) + (label ? `<button id="tb">${label}</button>` : "");
  t.style.display = "flex";
  if (label)
    $("tb").onclick = () => {
      t.style.display = "none";
      fn();
    };
  clearTimeout(S.tt);
  S.tt = setTimeout(() => (t.style.display = "none"), 6000);
}
function join(role) {
  let n = $("nick").value.trim();
  $("lerr").textContent = "";
  if (role === "teacher") {
    n = "先生";
    S.room.code = String(Math.floor(100000 + Math.random() * 900000));
    S.room.name = $("pname").value.trim() || "無題のプロジェクト";
  } else {
    const c = $("code").value.trim();
    if (c !== S.room.code) {
      $("lerr").textContent =
        "エラー: このコードのルームが見つかりません。6桁の数字を確認してください。";
      return;
    }
    if (!n) {
      $("lerr").textContent = "エラー: ニックネームを入力してください。";
      return;
    }
  }
  S.me = { n, role };
  S.tab = "chat";
  $("login").style.display = "none";
  $("app").style.display = "flex";
  render();
}
function leave() {
  S.me = null;
  $("app").style.display = "none";
  $("login").style.display = "block";
  hint();
}
function setTab(t) {
  S.tab = t;
  if (t === "risk") {
    S.risks.forEach((r) => (r.read = true));
    S.unread = 0;
  }
  render();
}
function render() {
  $("hName").textContent = S.room.name;
  $("hCode").textContent = "コード " + S.room.code;
  const left = S.room.limit - S.room.used;
  $("hAi").textContent = left + "/" + S.room.limit;
  $("hBar").style.width = (left / S.room.limit) * 100 + "%";
  $("hMe").textContent = S.me.role === "teacher" ? "先生" : S.me.n;
  const tabs = [
    ["chat", "議論チャット", "messages-square"],
    ["risk", "リスク・不明点", "triangle-alert"],
    ["src", "調査・ソース", "search"],
  ];
  if (mob()) tabs.push(["todo", "ToDo", "list-checks"]);
  if (S.me.role === "teacher")
    tabs.push(["dash", "教員用", "layout-dashboard"]);
  $("nav").innerHTML = tabs
    .map(
      ([k, l, i]) =>
        `<button ${
          S.tab === k ? 'aria-current="page"' : ""
        } onclick="setTab('${k}')">${ic(i)}${l}${
          k === "risk" && S.unread
            ? `<span class="dot">未読${S.unread}</span>`
            : ""
        }</button>`
    )
    .join("");
  const keep = $("mi")?.value;
  $("pane").innerHTML = {
    chat,
    risk: riskTab,
    src: srcTab,
    dash,
    todo: () => `<div class="card scroll">${todoPanel()}</div>`,
  }[S.tab]();
  const sc = $("pane").querySelector(".scroll");
  if (sc && S.tab === "chat") sc.scrollTop = sc.scrollHeight;
  if (keep && $("mi")) $("mi").value = keep;
  $("side").innerHTML = mob() ? "" : todoPanel();
  icons();
}
function todoPanel() {
  return `<h2>ToDo</h2>${
    S.todos
      .map(
        (x, i) =>
          `<div class="todo ${
            x.c ? "done" : ""
          }"><input type="checkbox" aria-label="完了にする: ${esc(x.t)}" ${
            x.c ? "checked" : ""
          } onchange="tog(${i})"><div style="flex:1"><span class="t">${esc(
            x.t
          )}</span><br><small style="color:var(--mu)">${esc(
            x.a || "担当未定"
          )}${x.d ? " / 期限 " + x.d : ""}${
            x.ai ? " / AI提案" : ""
          }</small></div><button class="tb" aria-label="編集" onclick="edit(${i})">${ic(
            "pencil"
          )}</button><button class="tb" aria-label="削除" onclick="S.todos.splice(${i},1);render()">${ic(
            "trash-2"
          )}</button></div>`
      )
      .join("") || '<p class="empty">ToDoはまだありません。</p>'
  }
<div class="row"><div style="flex:1 1 100%"><label for="tt">タスク名</label><input id="tt" onkeydown="if(event.key==='Enter')addTodo()"></div><div><label for="ta">担当</label><input id="ta"></div><div><label for="td">期限</label><input id="td" type="date"></div><button class="btn" onclick="addTodo()">${ic(
    "plus"
  )}追加</button></div>`;
}
function chat() {
  const m = S.msgs
    .map(
      (x) =>
        `<div class="card msg ${x.u === S.me.n ? "me" : ""} ${
          x.p ? "reply" : ""
        } ${x.b ? "blocked" : ""} ${x.ai ? "ai" : ""}"><small>${
          x.ai ? ic("sparkles") : ""
        }${esc(x.u)}</small>${
          x.b
            ? ic("ban") + "不適切な表現が含まれるため送信できませんでした"
            : esc(x.t)
        }${
          x.b || x.ai
            ? ""
            : `<button class="tb" onclick="S.reply=${
                x.id
              };render();$('mi').focus()">${ic("reply")}返信</button>`
        }</div>`
    )
    .join("");
  const sg = S.sug
    ? `<div class="card sug"><h2>${ic("list-plus")}ToDoの提案</h2><p>${esc(
        S.sug
      )}</p><div class="row"><button class="btn sm" onclick="acc()">${ic(
        "check"
      )}追加する</button><button class="btn sec sm" onclick="S.sug=null;S.sugHandled++;render()">見送る</button></div></div>`
    : "";
  const left = S.room.limit - S.room.used;
  return `<div class="scroll" role="log" aria-label="議論">${m}${sg}</div>${
    S.reply
      ? `<p style="color:var(--mu)">返信先を選択中 <button class="tb" onclick="S.reply=null;render()">取り消す</button></p>`
      : ""
  }
 <div class="compose"><div><label for="mi" class="sr">メッセージまたはAIへの質問</label><input id="mi" placeholder="メッセージ、またはAIへの質問" onkeydown="if(event.key==='Enter')send()"></div>
 <button class="btn sec" onclick="send()">${ic(
   "send"
 )}送信</button><button class="btn" ${
    S.busy || left < 1 ? "disabled" : ""
  } onclick="askAI()">${ic("sparkles")}${
    S.busy
      ? "AIが考え中"
      : left < 1
      ? "本日の上限に達しました"
      : "AIに意見を求める"
  }</button></div>`;
}
function send() {
  const v = $("mi").value.trim();
  if (!v) return;
  S.msgs.push({
    id: Date.now(),
    u: S.me.n,
    t: v,
    p: S.reply,
    b: NG.some((w) => v.includes(w)),
  });
  S.reply = null;
  $("mi").value = "";
  render();
}
function askAI() {
  if (S.busy || S.room.used >= S.room.limit) return;
  const q = $("mi").value.trim();
  S.busy = true;
  render();
  setTimeout(() => {
    S.busy = false;
    S.room.used++;
    S.aiCount++;
    const last = S.msgs
        .filter((x) => !x.b)
        .slice(-6)
        .map((x) => x.t)
        .join(" "),
      T = q ? `「${q}」について` : "ここまでの議論について";
    const add = [
      {
        c: "risk",
        t: "情報源の偏りに注意",
        d: `${T}、集めた情報が1つのサイトだけに偏っていませんか。公的機関と別の視点の情報を並べて確認してみましょう。`,
      },
      {
        c: "unclear_point",
        t: "「誰のため」が曖昧な点",
        d: "対象となる読者（例: 小学生）が、どんな場面で使うのかがまだ決まっていないようです。",
      },
      {
        c: "perspective",
        t: "別の見方: 利用者の立場",
        d: "マップを使う側（保護者、高齢者、外国から来た人）なら、何が必要になるでしょう。",
      },
    ].map((r) => ({ ...r, read: false, st: "open" }));
    S.risks.unshift(...add);
    S.unread += add.length;
    S.sug = /避難所|調べ/.test(last)
      ? "避難所の位置データを集める担当と期限を決める"
      : "次回までに各自の調査結果を1つずつ共有する";
    S.msgs.push({
      id: Date.now(),
      u: "AI",
      ai: 1,
      t: "リスク・不明点タブに3件追加しました。どう扱うかは皆さんで決めてください。",
    });
    render();
    toast("AIの意見が3件届きました", "確認する", () => setTab("risk"));
  }, 900);
}
function acc() {
  S.todos.push({ t: S.sug, a: "", d: "", c: false, ai: 1 });
  S.sug = null;
  S.sugHandled++;
  render();
}
const CL = {
  risk: ["triangle-alert", "リスク"],
  unclear_point: ["circle-help", "不明点"],
  perspective: ["eye", "別視点"],
};
function riskTab() {
  return `<div class="scroll">${
    S.risks
      .map(
        (r, i) =>
          `<div class="card"><span class="tag ${r.c}">${ic(CL[r.c][0])}${
            CL[r.c][1]
          }</span> <b>${esc(r.t)}</b>${
            r.st !== "open"
              ? ` <span class="tag okc">${ic("check")}${
                  r.st === "todo" ? "ToDo化済み" : "対処済み"
                }</span>`
              : ""
          }<p>${esc(r.d)}</p>${
            r.st === "open"
              ? `<div class="row"><button class="btn sm" onclick="riskTodo(${i})">${ic(
                  "list-plus"
                )}ToDoにする</button><button class="btn sec sm" onclick="S.risks[${i}].st='done';render()">${ic(
                  "check"
                )}対処済みにする</button></div>`
              : ""
          }</div>`
      )
      .join("") ||
    '<p class="empty">まだありません。チャットで「AIに意見を求める」を押すと、リスクや不明点がここに届きます。</p>'
  }</div>`;
}
function riskTodo(i) {
  const r = S.risks[i];
  S.todos.push({ t: "確認: " + r.t, a: "", d: "", c: false, ai: 1 });
  r.st = "todo";
  render();
  toast("ToDoに追加しました");
}
function srcTab() {
  return `<div class="scroll">${S.sources
    .map(
      (s) =>
        `<div class="card"><span class="tag okc">${ic("link")}${esc(
          s.by
        )}</span> <b>${esc(s.t)}</b><br><small style="color:var(--mu)">${esc(
          s.u
        )}</small><p>${esc(s.s)}</p></div>`
    )
    .join("")}
<div class="card"><h2>調べたページを共有する</h2><div class="row"><div><label for="st">タイトル</label><input id="st"></div><div><label for="su">URL</label><input id="su"></div><div style="flex:1 1 100%"><label for="ss">ひとこと要約</label><input id="ss"></div><button class="btn" onclick="addSrc()">${ic(
    "plus"
  )}追加</button></div><p style="color:var(--mu)">本番ではAI検索を、信頼できるドメインに限定して使います。</p></div></div>`;
}
function addSrc() {
  const t = $("st").value.trim(),
    u = $("su").value.trim();
  if (!t || !u) {
    toast("タイトルとURLを入力してください");
    return;
  }
  S.sources.push({ t, u, s: $("ss").value.trim(), by: S.me.n });
  render();
}
function dash() {
  const U = {};
  const g = (k) => (U[k] ??= { m: 0, t: 0, u: 0 });
  S.msgs.filter((x) => !x.b && !x.ai).forEach((x) => g(x.u).m++);
  S.todos.forEach((t) => t.a && g(t.a).t++);
  S.sources.forEach((s) => s.by !== "AI検索" && g(s.by).u++);
  const rows = Object.entries(U)
    .map(
      ([k, v]) =>
        `<tr><td>${esc(k)}</td><td>${v.m}</td><td>${v.t}</td><td>${
          v.u
        }</td></tr>`
    )
    .join("");
  const rk = S.risks
    .map(
      (r) =>
        `<tr><td>${esc(r.t)}</td><td>${
          { open: "未対応", todo: "ToDo化", done: "対処済み" }[r.st]
        }</td></tr>`
    )
    .join("");
  const open = S.todos
    .filter((t) => !t.c)
    .map((t) => `<li>${esc(t.t)}</li>`)
    .join("");
  return `<div class="scroll"><div class="card"><h2>班の状況（事実ログ）</h2><p>最終アクティブ ${new Date().toLocaleTimeString(
    "ja-JP"
  )} / AI利用 ${S.aiCount}回 / ToDo提案への対応 ${S.sugHandled}件 / 未読 ${
    S.unread
  }件</p></div>
<div class="card"><h2>個人別の貢献ログ</h2><div class="tw"><table><tr><th>名前</th><th>発言</th><th>ToDo</th><th>URL提出</th></tr>${rows}</table></div></div>
<div class="card"><h2>AI提示リスクへの対処</h2><div class="tw"><table>${
    rk || "<tr><td>まだありません</td></tr>"
  }</table></div></div>
<div class="card"><h2>未解決課題（未完了のToDo）</h2><ul>${
    open || "<li>なし</li>"
  }</ul></div>
<p style="color:var(--mu)">AIは評価や採点をせず、事実のみを表示します。</p></div>`;
}
function tog(i) {
  S.todos[i].c = !S.todos[i].c;
  render();
}
function edit(i) {
  const v = prompt("タスク名を編集", S.todos[i].t);
  if (v && v.trim()) {
    S.todos[i].t = v.trim();
    render();
  }
}
function addTodo() {
  const t = $("tt").value.trim();
  if (!t) return;
  S.todos.push({ t, a: $("ta").value.trim(), d: $("td").value, c: false });
  render();
}
