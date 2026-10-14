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
  th: null,
  tt: null,
};
const NG = ["死ね", "バカ", "殺す"],
  $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
const rc = (id) => S.msgs.filter((y) => y.p === id).length,
  msgById = (id) => S.msgs.find((x) => x.id === id);
const url = (u) => {
  u = u.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const x = new URL(u);
    return /^https?:$/.test(x.protocol) ? x.href : "#";
  } catch {
    return "#";
  }
};
const ic = (n) => `<i data-lucide="${n}"></i>`,
  mob = () => innerWidth <= 760;
const icons = () => {
  if (!window.lucide) return;
  lucide.createIcons();
  const bad = document.querySelectorAll("i[data-lucide]");
  if (bad.length) {
    bad.forEach((e) => {
      console.warn("Lucide: 見つからないアイコン名", e.dataset.lucide);
      e.setAttribute("data-lucide", "circle-help");
    });
    lucide.createIcons();
  }
};
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
  if (S.lav) S.av[n] = S.lav;
  if (role === "student" && !S.users.includes(n)) S.users.push(n);
  S.tab = "chat";
  $("login").style.display = "none";
  $("app").style.display = "flex";
  render();
}
function doLeave() {
  dlgClose();
  S.me = null;
  S.th = null;
  $("app").style.display = "none";
  $("login").style.display = "block";
  hint();
}
function leave() {
  dlgShow(
    `<h2 id="dt" style="text-align:center">本当に退出しますか？</h2><div class="row" style="justify-content:center;margin-top:16px"><button class="btn sec" onclick="dlgClose()">いいえ</button><button class="btn danger" onclick="doLeave()">はい</button></div>`
  );
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
  $("hMe").innerHTML =
    av(S.me.n) + esc(S.me.role === "teacher" ? "先生" : S.me.n);
  $("hMe").setAttribute("aria-label", "アイコンを設定（" + S.me.n + "）");
  const tabs = [
    ["chat", "議論チャット", "messages-square"],
    ["risk", "リスク・不明点", "triangle-alert"],
    ["src", "調査・ソース", "search"],
  ];
  if (mob()) tabs.push(["todo", "スレッド・やること", "list-checks"]);
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
  const tl = document.querySelector(".tl");
  if (tl) tl.scrollTop = tl.scrollHeight;
}
function todoPanel() {
  if (S.th && msgById(S.th)) return threadPanel();
  return `<div style="display:flex;align-items:center;gap:8px"><h2 style="flex:1;margin:0">やることリスト</h2><button class="btn sm" onclick="openTaskDialog()">${ic(
    "plus"
  )}タスク追加</button></div>${
    S.todos
      .map((x, i) => ({ x, i }))
      .sort((p, q) => p.x.c - q.x.c)
      .map(
        ({ x, i }) =>
          `<div class="todo ${x.c ? "done" : ""} ${
            S.hl === x ? "hl" : ""
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
      .join("") ||
    '<p class="empty">やることはまだありません。「タスク追加」から作れます。</p>'
  }`;
}
function chat() {
  const m = S.msgs
    .filter((x) => !x.p)
    .map((x) => msgRow(x, S.th === x.id, true))
    .join("");
  const sg = S.sug
    ? `<div class="card sug"><h2>${ic("list-plus")}やることの提案</h2><p>${esc(
        S.sug
      )}</p><div class="row"><button class="btn sm" onclick="acc()">${ic(
        "check"
      )}追加する</button><button class="btn sec sm" onclick="S.sug=null;S.sugHandled++;render()">見送る</button></div></div>`
    : "";
  const left = S.room.limit - S.room.used;
  return `<div class="scroll" role="log" aria-label="議論">${m}${sg}</div>
 <div class="compose"><div><label for="mi" class="sr">メッセージまたはAIへの質問</label><input id="mi" placeholder="メッセージ、またはAIへの質問" onkeydown="if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229)send()"></div><button class="btn sec" onclick="send()">${ic(
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
    b: NG.some((w) => v.includes(w)),
  });
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
          `<div class="card ${
            r.st === "todo" ? "rk-todo" : r.st === "done" ? "rk-done" : ""
          }"><span class="tag ${r.c}">${ic(CL[r.c][0])}${
            CL[r.c][1]
          }</span> <b>${esc(r.t)}</b>${
            r.st === "todo"
              ? ` <button class="go" onclick="goTodo(${i})">やることリストへ移動${ic(
                  "arrow-right"
                )}</button>`
              : r.st === "done"
              ? ` <span class="tag okc">${ic("check")}対処済み</span>`
              : ""
          }${
            r.st !== "open"
              ? ` <button class="tb" onclick="S.risks[${i}].st='open';render()">未対応に戻す</button>`
              : ""
          }<p>${esc(r.d)}</p>${
            r.st === "open"
              ? `<div class="row"><button class="btn sm" onclick="riskTodo(${i})">${ic(
                  "list-plus"
                )}やることリストに入れる</button><button class="btn sec sm" onclick="S.risks[${i}].st='done';render()">${ic(
                  "check"
                )}対処済みにする</button></div>`
              : ""
          }</div>`
      )
      .join("") ||
    '<div class="empty ctr"><span class="em" aria-hidden="true"><i data-lucide="smile"></i></span><b>おどろくほど平和ですね。でも、見落としは本当にゼロ？</b><span class="sub">チャットで「AIに意見を求める」を押すと、気づいていないリスクや「？」がここに届きます。</span></div>'
  }</div>`;
}
function goTodo(i) {
  const r = S.risks[i];
  S.th = null;
  S.hl = r.todo;
  if (mob()) S.tab = "todo";
  render();
  setTimeout(() => {
    S.hl = null;
    render();
  }, 2500);
}
function riskTodo(i) {
  const r = S.risks[i];
  const o = { t: "確認: " + r.t, a: "", d: "", c: false, ai: 1 };
  S.todos.push(o);
  r.todo = o;
  r.st = "todo";
  render();
  toast("やることリストに追加しました");
}
function srcTab() {
  return `<div class="scroll">${S.sources
    .map(
      (s) =>
        `<div class="card"><span class="tag okc">${ic("link")}${esc(
          s.by
        )}</span> <a class="lk" href="${esc(
          url(s.u)
        )}" target="_blank" rel="noopener noreferrer"><b>${esc(s.t)}</b>${ic(
          "external-link"
        )}<span class="sr">（新しいタブで開きます）</span></a><br><small style="color:var(--mu)">${esc(
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
  if (url(u) === "#") {
    toast("URLの形式が正しくありません");
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
          { open: "未対応", todo: "やることリスト入り", done: "対処済み" }[r.st]
        }</td></tr>`
    )
    .join("");
  const open = S.todos
    .filter((t) => !t.c)
    .map((t) => `<li>${esc(t.t)}</li>`)
    .join("");
  return `<div class="scroll"><div class="card"><h2>班の状況（事実ログ）</h2><p>最終アクティブ ${new Date().toLocaleTimeString(
    "ja-JP"
  )} / AI利用 ${S.aiCount}回 / やること提案への対応 ${S.sugHandled}件 / 未読 ${
    S.unread
  }件</p></div>
 <div class="card"><h2>個人別の貢献ログ</h2><div class="tw"><table><tr><th>名前</th><th>発言</th><th>やること</th><th>URL提出</th></tr>${rows}</table></div></div>
 <div class="card"><h2>AI提示リスクへの対処</h2><div class="tw"><table>${
   rk || "<tr><td>まだありません</td></tr>"
 }</table></div></div>
 <div class="card"><h2>未解決課題（未完了のやること）</h2><ul>${
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

function openThread(id) {
  S.th = id;
  S.anim = true;
  if (mob()) S.tab = "todo";
  render();
  S.anim = false;
  setTimeout(() => $("ri") && $("ri").focus(), 0);
}
function sendReply() {
  const v = $("ri").value.trim();
  if (!v || !S.th) return;
  S.msgs.push({
    id: Date.now(),
    u: S.me.n,
    t: v,
    p: S.th,
    b: NG.some((w) => v.includes(w)),
  });
  render();
  $("ri") && $("ri").focus();
}
function threadPanel() {
  const p = msgById(S.th),
    rs = S.msgs.filter((x) => x.p === p.id);
  return `<div class="thread ${
    S.anim ? "anim" : ""
  }"><div style="display:flex;align-items:center"><h2 style="flex:1;margin:0">${ic(
    "messages-square"
  )}スレッド</h2><button class="tb" aria-label="スレッドを閉じる" onclick="S.th=null;render()">${ic(
    "x"
  )}</button></div>
 <div style="margin-top:8px">${msgRow(p, true, false)}</div>
 <p style="color:var(--mu);margin:8px 0">${rs.length}件の返信</p>
 <div class="tl" role="log" aria-label="返信">${rs
   .map((x) => msgRow(x, false, false))
   .join("")}</div>
 <label for="ri" style="margin-top:8px">${esc(
   p.u
 )} さんのメッセージに返信</label><input id="ri" onkeydown="if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229)sendReply()"><button class="btn" style="margin-top:8px" onclick="sendReply()">${ic(
    "send"
  )}返信を送信</button></div>`;
}
/* ---- アイコン / 名前 / メッセージ の行表示 ---- */
S.av = {};
const ICONS = [
  "user-round",
  "cat",
  "dog",
  "bird",
  "fish",
  "rabbit",
  "rocket",
  "star",
  "leaf",
  "flower-2",
  "smile",
  "book-open",
];
function av(name, ai) {
  if (ai)
    return `<span class="av ai" aria-hidden="true">${ic("sparkles")}</span>`;
  const a = S.av[name];
  if (a && a.t === "img")
    return `<span class="av"><img src="${a.v}" alt=""></span>`;
  return `<span class="av ${avCls(a)}" aria-hidden="true">${ic(
    a ? a.v : "user-round"
  )}</span>`;
}
function msgRow(x, sel, canReply) {
  const body = x.b
    ? ic("ban") + "不適切な表現が含まれるため送信できませんでした"
    : esc(x.t);
  const act =
    canReply && !x.b && !x.ai
      ? `<button class="tb" style="padding:0" onclick="openThread(${
          x.id
        })">${ic("message-square-reply")}${
          rc(x.id) ? rc(x.id) + "件の返信" : "返信"
        }</button>`
      : "";
  return `<div class="msgrow ${sel ? "sel" : ""} ${x.b ? "blocked" : ""}">${av(
    x.u,
    x.ai
  )}<div class="mb"><b class="nm">${esc(
    x.u
  )}</b><div>${body}</div>${act}</div></div>`;
}
/* ---- ダイアログ ---- */
function dlgShow(html) {
  $("dc").innerHTML = html;
  icons();
  if (!$("dlg").open) $("dlg").showModal();
}
function dlgClose() {
  $("dlg").close();
}
function openTaskDialog() {
  S.asg = S.me.role === "student" ? S.me.n : "";
  dlgShow(`<h2 id="dt">タスクを追加</h2><div class="col"><div><label for="tt">タスク名</label><input id="tt" onkeydown="if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229)addTodo()"></div>
 <fieldset class="fs"><legend>担当（登録されている名前から選ぶ）</legend><label for="as" class="sr">担当を検索</label><input id="as" type="search" placeholder="名前で検索" autocomplete="off" oninput="asgList()"><div id="al" class="al" role="radiogroup" aria-label="担当の候補（五十音順）"></div><p style="color:var(--mu);font-size:14px;margin:4px 0 0">候補は五十音順です。ひらがな・カタカナどちらでも検索できます。</p></fieldset>
 <div><label for="td">期限</label><input id="td" type="date"></div><p id="derr" role="alert" style="color:var(--err);font-weight:700"></p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="dlgClose()">キャンセル</button><button class="btn" onclick="addTodo()">${ic(
   "plus"
 )}追加する</button></div></div>`);
  asgList();
  $("tt").focus();
}
const toHira = (s) =>
  s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 96));
function asgList() {
  const q = toHira($("as").value.trim().toLowerCase());
  const names = [...S.users]
    .sort((a, b) => toHira(a).localeCompare(toHira(b), "ja"))
    .filter((n) => toHira(n.toLowerCase()).includes(q));
  $("al").innerHTML =
    ["", ...names]
      .map(
        (n) =>
          `<label class="opt"><input type="radio" name="asg" value="${esc(
            n
          )}" ${
            S.asg === n ? "checked" : ""
          } onchange="S.asg=this.value"><span>${
            n ? esc(n) : "担当なし（未定）"
          }</span></label>`
      )
      .join("") +
    (names.length
      ? ""
      : '<p class="empty" style="padding:8px">該当する名前がありません</p>');
}
function addTodo() {
  const t = $("tt").value.trim();
  if (!t) {
    $("derr").textContent = "エラー: タスク名を入力してください。";
    return;
  }
  S.todos.push({ t, a: S.asg || "", d: $("td").value, c: false });
  dlgClose();
  render();
}
function openProfile() {
  dlgShow(
    `<h2 id="dt">アイコンを設定</h2><div class="col">${pickerHTML(
      S.av[S.me.n],
      "set"
    )}<p id="derr" role="alert" style="color:var(--err);font-weight:700"></p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="delete S.av[S.me.n];render();openProfile()">初期アイコンに戻す</button><button class="btn" onclick="dlgClose()">閉じる</button></div></div>`
  );
}
function setIcon(n) {
  const p = S.av[S.me.n];
  S.av[S.me.n] = {
    t: "icon",
    v: n,
    col: (p && p.t === "icon" && p.col) || "cyan",
  };
  render();
  openProfile();
}
function setCol(k) {
  const p = S.av[S.me.n];
  S.av[S.me.n] = {
    t: "icon",
    v: p && p.t === "icon" ? p.v : "user-round",
    col: k,
  };
  render();
  openProfile();
}
function setImg(i) {
  pickImg(i);
}
function pickImg(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (!/^image\//.test(f.type)) {
    $("derr").textContent = "エラー: 画像ファイルを選んでください。";
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 96;
      const s = Math.min(im.width, im.height);
      cv.getContext("2d").drawImage(
        im,
        (im.width - s) / 2,
        (im.height - s) / 2,
        s,
        s,
        0,
        0,
        96,
        96
      );
      S.av[S.me.n] = { t: "img", v: cv.toDataURL("image/jpeg", 0.85) };
      render();
      openProfile();
    };
    im.onerror = () => {
      $("derr").textContent = "エラー: 画像を読み込めませんでした。";
    };
    im.src = rd.result;
  };
  rd.readAsDataURL(f);
}

S.lav = null;
S.users = ["ミサキ", "ケン"];
function lavRender() {
  $("lav").innerHTML =
    pickerHTML(S.lav, "lav") +
    `<button class="tb" style="padding:0" onclick="S.lav=null;lavRender()">初期アイコンに戻す</button>`;
  icons();
}
function lavIcon(n) {
  const p = S.lav;
  S.lav = { t: "icon", v: n, col: (p && p.t === "icon" && p.col) || "cyan" };
  lavRender();
}
function lavCol(k) {
  const p = S.lav;
  S.lav = { t: "icon", v: p && p.t === "icon" ? p.v : "user-round", col: k };
  lavRender();
}
function lavImg(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (!/^image\//.test(f.type)) {
    $("lerr").textContent = "エラー: 画像ファイルを選んでください。";
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 96;
      const s = Math.min(im.width, im.height);
      cv.getContext("2d").drawImage(
        im,
        (im.width - s) / 2,
        (im.height - s) / 2,
        s,
        s,
        0,
        0,
        96,
        96
      );
      S.lav = { t: "img", v: cv.toDataURL("image/jpeg", 0.85) };
      lavRender();
    };
    im.onerror = () => {
      $("lerr").textContent = "エラー: 画像を読み込めませんでした。";
    };
    im.src = rd.result;
  };
  rd.readAsDataURL(f);
}
const COLS = ["cyan", "blue", "green", "orange", "purple", "pink"],
  CN = {
    cyan: "シアン",
    blue: "青",
    green: "緑",
    orange: "オレンジ",
    purple: "紫",
    pink: "ピンク",
  };
const IJ = {
  "user-round": "ひと",
  cat: "ねこ",
  dog: "いぬ",
  bird: "とり",
  fish: "さかな",
  rabbit: "うさぎ",
  rocket: "ロケット",
  star: "ほし",
  leaf: "はっぱ",
  "flower-2": "はな",
  smile: "えがお",
  "book-open": "ほん",
};
function avCls(a) {
  return a && a.t === "icon" && a.col ? "c-" + a.col : "";
}
function pickerHTML(a, pre) {
  const ic_ = a && a.t === "icon",
    col = ic_ && a.col ? a.col : "cyan";
  const pv =
    a && a.t === "img"
      ? `<span class="av big"><img src="${a.v}" alt=""></span>`
      : `<span class="av big ${avCls(a)}">${ic(
          ic_ ? a.v : "user-round"
        )}</span>`;
  return `<div style="display:flex;align-items:center;gap:12px">${pv}<span style="color:var(--mu)">${
    a ? "選択中のアイコン" : "未設定（初期アイコン）"
  }</span></div>
 <div><b>色</b><div class="sw" role="group" aria-label="色">${COLS.map(
   (k) =>
     `<button type="button" class="c-${k}" aria-label="${
       CN[k]
     }" aria-pressed="${ic_ && col === k}" onclick="${pre}Col('${k}')">${
       ic_ && col === k ? ic("check") : ""
     }</button>`
 ).join("")}</div></div>
 <div><b>アイコン</b><div class="ig" role="group" aria-label="アイコン">${ICONS.map(
   (n) =>
     `<button type="button" class="c-${col}" aria-label="${
       IJ[n]
     }" aria-pressed="${ic_ && a.v === n}" onclick="${pre}Icon('${n}')">${ic(
       n
     )}</button>`
 ).join("")}</div></div>
 <div><label for="${pre}im">画像を使う</label><input id="${pre}im" type="file" accept="image/*" onchange="${pre}Img(this)"></div>`;
}
lavRender();
