const T0 = (h, m) => new Date().setHours(h, m, 0, 0);
const fmt = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
};
const S = {
  room: { name: "探究: 地域の防災マップ", code: "482915", limit: 20, used: 0 },
  me: null,
  tab: "chat",
  busy: false,
  msgs: [
    {
      id: 1,
      u: "ミサキ",
      ts: T0(10, 32),
      t: "防災マップは小学生向けにしたいな",
    },
    { id: 2, u: "ケン", ts: T0(10, 35), t: "避難所の情報はどこから集める？" },
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
  if (role === "teacher") S.hasTeacher = true;
  if (S.lav) S.av[n] = S.lav;
  if (role === "student" && !S.users.includes(n)) S.users.push(n);
  S.tab = "chat";
  $("login").style.display = "none";
  $("app").style.display = "flex";
  render();
  if (role === "student") openCatchup(true);
}
function doLeave() {
  dlgClose();
  S.me = null;
  S.th = null;
  $("app").style.display = "none";
  $("login").style.display = "";
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
  const pn = $("pane");
  pn.classList.remove("pfade");
  void pn.offsetWidth;
  pn.classList.add("pfade");
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
  const ms = members();
  $("hMem").innerHTML = `<span class="stack">${ms
    .slice(0, 3)
    .map((m) => av(m.n))
    .join("")}</span><b>${ms.length}</b><span>人</span>`;
  $("hMem").setAttribute(
    "aria-label",
    `参加メンバー${ms.length}人。押すと一覧を開きます`
  );
  const tabs = [
    ["chat", "議論チャット", "messages-square"],
    ["ws", "ワークシート", "file-text"],
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
    ws: wsTab,
    risk: riskTab,
    src: srcTab,
    dash,
    todo: () => `<div class="card scroll">${todoPanel()}</div>`,
  }[S.tab]();
  const sc = $("pane").querySelector(".scroll");
  if (sc && S.tab === "chat")
    sc.scrollTop = S.keepY != null ? S.keepY : sc.scrollHeight;
  S.keepY = null;
  if (keep && $("mi")) {
    $("mi").value = keep;
    grow($("mi"));
  }
  $("side").innerHTML = mob() ? "" : todoPanel();
  icons();
  const tl = document.querySelector(".tl");
  if (tl) tl.scrollTop = tl.scrollHeight;
  S.msgs.forEach((m) => S.seen.add(m.id));
  S.todos.forEach((t) => S.tseen.add(t));
  S.armed = true;
  S.flashRisk = null;
}
function todoPanel() {
  if (S.th && msgById(S.th)) return threadPanel();
  return (
    issuesPanel() +
    `<div style="display:flex;align-items:center;gap:8px"><h2 style="flex:1;margin:0">やることリスト</h2><button class="btn sm" onclick="openTaskDialog()">${ic(
      "plus"
    )}タスク追加</button></div>${
      S.todos
        .map((x, i) => ({ x, i }))
        .sort((p, q) => p.x.c - q.x.c)
        .map(
          ({ x, i }) =>
            `<div class="todo ${x.c ? "done" : ""} ${S.hl === x ? "hl" : ""} ${
              S.armed && !S.tseen.has(x) ? "fresh" : ""
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
            )}</button><button class="tb" aria-label="削除" onclick="delTodo(${i})">${ic(
              "trash-2"
            )}</button></div>`
        )
        .join("") ||
      '<p class="empty">やることはまだありません。「タスク追加」から作れます。</p>'
    }`
  );
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
 <div class="compose"><div><label for="mi" class="sr">メッセージまたはAIへの質問</label><textarea id="mi" rows="1" placeholder="メッセージ、またはAIへの質問（Shift+Enterで改行）" oninput="grow(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();send()}"></textarea></div><button class="btn sec" onclick="send()">${ic(
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
    ts: Date.now(),
    u: S.me.n,
    t: v,
    b: NG.some((w) => v.includes(w)),
  });
  $("mi").value = "";
  render();
  $("mi") && $("mi").focus();
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
      ts: Date.now(),
      u: "AI",
      ai: 1,
      t: "リスク・不明点タブに3件追加しました。どう扱うかは皆さんで決めてください。",
    });
    render();
    if ($("mi")) $("mi").focus();
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
          } ${
            S.flashRisk === i ? "pop" : ""
          }"><div class="rh"><span class="tag ${r.c}">${ic(CL[r.c][0])}${
            CL[r.c][1]
          }</span><b class="rt">${esc(r.t)}</b>${
            r.st === "todo"
              ? `<button class="go" onclick="goTodo(${i})">やることリストへ移動${ic(
                  "arrow-right"
                )}</button>`
              : r.st === "done"
              ? `<span class="tag okc">${ic("check")}対処済み</span>`
              : ""
          }</div><p>${esc(r.d)}</p><div class="row">${
            r.st === "open"
              ? `<button class="btn sm" onclick="riskTodo(${i})">${ic(
                  "list-plus"
                )}やることリストに入れる</button><button class="btn sec sm" onclick="S.risks[${i}].st='done';S.flashRisk=${i};render()">${ic(
                  "check"
                )}対処済みにする</button>`
              : `<button class="btn sec sm" onclick="unres(${i})">${ic(
                  "undo-2"
                )}未対応に戻す</button>`
          }</div></div>`
      )
      .join("") ||
    '<div class="empty ctr"><span class="em" aria-hidden="true"><i data-lucide="smile"></i></span><b>おどろくほど平和ですね。でも、見落としは本当にゼロ？</b><span class="sub">チャットで「AIに意見を求める」を押すと、気づいていないリスクや「？」がここに届きます。</span></div>'
  }</div>`;
}
function unres(i) {
  const r = S.risks[i];
  if (r.st === "todo" && r.todo) {
    const k = S.todos.indexOf(r.todo);
    if (k >= 0) S.todos.splice(k, 1);
  }
  r.todo = null;
  r.st = "open";
  S.flashRisk = i;
  render();
}
function delTodo(i) {
  const o = S.todos[i];
  S.todos.splice(i, 1);
  S.risks.forEach((r) => {
    if (r.todo === o) {
      r.todo = null;
      r.st = "open";
    }
  });
  render();
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
  S.flashRisk = i;
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
    ts: Date.now(),
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
 )} さんのメッセージに返信</label><textarea id="ri" rows="1" placeholder="返信（Shift+Enterで改行）" oninput="grow(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();sendReply()}"></textarea><button class="btn" style="margin-top:8px" onclick="sendReply()">${ic(
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
    !x.b && !x.ai
      ? `<div class="rxbar">${rxChips(
          x
        )}<button class="rx add" aria-label="リアクションを付ける" onclick="openRx(${
          x.id
        })">${ic("smile-plus")}</button></div>` +
        (canReply
          ? `<div class="acts"><button class="tb" onclick="openThread(${
              x.id
            })">${ic("message-square-reply")}${
              rc(x.id) ? rc(x.id) + "件の返信" : "返信"
            }</button><button class="tb" onclick="openClip(${x.id})">${ic(
              "file-input"
            )}ワークシートに入れる</button><button class="tb" onclick="addIssue(${
              x.id
            })">${ic("flag")}論点にする</button></div>`
          : "")
      : "";
  return `<div class="msgrow ${sel ? "sel" : ""} ${x.b ? "blocked" : ""} ${
    S.armed && !S.seen.has(x.id) ? "fresh" : ""
  }">${av(x.u, x.ai)}<div class="mb"><div class="mh"><b class="nm">${esc(
    x.u
  )}</b><time class="tm">${fmt(
    x.ts
  )}</time></div><div>${body}</div>${act}</div></div>`;
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
  inp.value = "";
  if (f)
    cropStart(f, (u) => {
      S.av[S.me.n] = { t: "img", v: u };
      render();
      openProfile();
    });
}

S.lav = null;
S.users = ["ミサキ", "ケン", "ハルカ", "ソウタ"];
function lavRender() {
  $("lav").innerHTML =
    pickerHTML(S.lav, "lav") +
    `<button class="tb" style="padding:0" onclick="S.lav=null;lavRender()">初期アイコンに戻す</button>`;
  const p = S.lav;
  $("lavpv").innerHTML =
    p && p.t === "img"
      ? `<span class="av"><img src="${p.v}" alt=""></span>`
      : `<span class="av ${avCls(p)}">${ic(
          p && p.t === "icon" ? p.v : "user-round"
        )}</span>`;
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
  inp.value = "";
  if (f)
    cropStart(f, (u) => {
      S.lav = { t: "img", v: u };
      lavRender();
    });
}
const COLS = ["cyan", "blue", "green", "orange", "purple", "pink", "black"],
  CN = {
    cyan: "シアン",
    blue: "青",
    green: "緑",
    orange: "オレンジ",
    purple: "紫",
    pink: "ピンク",
    black: "黒",
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
      ? `<span class="av"><img src="${a.v}" alt=""></span>`
      : `<span class="av ${avCls(a)}">${ic(ic_ ? a.v : "user-round")}</span>`;
  return `<div><b>Preview</b><div class="msgrow pv">${pv}<div class="mb"><div class="mh"><b class="nm">${esc(
    pre === "set"
      ? S.me.n
      : ($("nick") && $("nick").value.trim()) || "ニックネーム"
  )}</b><time class="tm">${fmt(
    Date.now()
  )}</time></div><div>${humor()}</div></div></div></div>
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
 <div><label class="btn sec fbtn" for="${pre}im">${ic(
    "image-up"
  )}画像を選んで切り抜く</label><input id="${pre}im" class="sr" type="file" accept="image/*" onchange="${pre}Img(this)"></div>`;
}
lavRender();

function grow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function toggleLav() {
  const b = $("lavbox"),
    open = b.hidden;
  b.hidden = !open;
  $("lavtg").setAttribute("aria-expanded", open);
}

/* ---- 画像の切り抜き ---- */
let CR = null;
function cropStart(file, done) {
  if (!/^image\//.test(file.type)) {
    toast("画像ファイルを選んでください");
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      CR = {
        im,
        done,
        z: 1,
        base: 240 / Math.min(im.width, im.height),
        cx: im.width / 2,
        cy: im.height / 2,
      };
      dlgShow(
        `<h2 id="dt">アイコンの位置を調整</h2><div class="col"><canvas id="cv" class="cv" width="240" height="240" tabindex="0" aria-label="切り抜きの位置（ドラッグまたは矢印キーで移動）"></canvas><div><label for="zm">拡大</label><input id="zm" type="range" min="1" max="3" step="0.01" value="1" oninput="CR.z=+this.value;cropDraw()"></div><p style="color:var(--mu);margin:0">ドラッグで位置を動かせます。丸の中が、アイコンになります。</p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="dlgClose()">キャンセル</button><button class="btn" onclick="cropDone()">決定</button></div></div>`
      );
      cropBind();
      cropDraw();
    };
    im.onerror = () => toast("画像を読み込めませんでした");
    im.src = rd.result;
  };
  rd.readAsDataURL(file);
}
function cropClamp() {
  const s = CR.base * CR.z,
    h = 120 / s;
  CR.cx = Math.min(Math.max(CR.cx, h), CR.im.width - h);
  CR.cy = Math.min(Math.max(CR.cy, h), CR.im.height - h);
}
function cropDraw() {
  cropClamp();
  const cv = $("cv"),
    g = cv.getContext("2d"),
    s = CR.base * CR.z;
  g.clearRect(0, 0, 240, 240);
  g.drawImage(
    CR.im,
    120 - CR.cx * s,
    120 - CR.cy * s,
    CR.im.width * s,
    CR.im.height * s
  );
  g.fillStyle = "rgba(0,0,0,.55)";
  g.beginPath();
  g.rect(0, 0, 240, 240);
  g.arc(120, 120, 110, 0, Math.PI * 2, true);
  g.fill("evenodd");
  g.strokeStyle = "#fff";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(120, 120, 110, 0, Math.PI * 2);
  g.stroke();
}
function cropBind() {
  const cv = $("cv");
  let d = null;
  cv.onpointerdown = (e) => {
    d = { x: e.clientX, y: e.clientY };
    cv.setPointerCapture(e.pointerId);
    cv.style.cursor = "grabbing";
  };
  cv.onpointermove = (e) => {
    if (!d) return;
    const s = CR.base * CR.z;
    CR.cx -= ((e.clientX - d.x) * 240) / cv.clientWidth / s;
    CR.cy -= ((e.clientY - d.y) * 240) / cv.clientHeight / s;
    d = { x: e.clientX, y: e.clientY };
    cropDraw();
  };
  cv.onpointerup = cv.onpointercancel = () => {
    d = null;
    cv.style.cursor = "grab";
  };
  cv.onkeydown = (e) => {
    const k = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[e.key];
    if (!k) return;
    e.preventDefault();
    const s = CR.base * CR.z;
    CR.cx += (k[0] * 10) / s;
    CR.cy += (k[1] * 10) / s;
    cropDraw();
  };
}
function cropDone() {
  const s = CR.base * CR.z,
    o = document.createElement("canvas");
  o.width = o.height = 128;
  o.getContext("2d").drawImage(
    CR.im,
    CR.cx - 120 / s,
    CR.cy - 120 / s,
    240 / s,
    240 / s,
    0,
    0,
    128,
    128
  );
  const u = o.toDataURL("image/jpeg", 0.88),
    f = CR.done;
  CR = null;
  dlgClose();
  f(u);
}

function humor() {
  const t = new Date().getHours();
  if (t < 5) return "まだ起きているの？ 続きは明日にして、今日はもうねよう。";
  if (t < 10) return "おはようございます。アイデアはまだ、半分ねています。";
  if (t < 12) return "午前のうちに、名案をひとつ出す予定です。たぶん。";
  if (t < 14)
    return "おなかがすいて、ひらめきが出ません。先にお昼にしませんか。";
  if (t < 17) return "ねむけと戦いながら、ひらめきを待っています。";
  if (t < 20) return "そろそろ帰る時間。でも、あとひとつだけ思いつきました。";
  return "もうこんな時間。続きは明日にしませんか。";
}

function themeInit() {
  document
    .querySelectorAll(".thm")
    .forEach(
      (e) =>
        (e.innerHTML = `<span class="ti i-sun">${ic(
          "sun"
        )}</span><button type="button" class="sw2" role="switch" aria-checked="false" aria-label="ダークモード" onclick="toggleTheme(event)"><span class="knob"></span></button><span class="ti i-moon">${ic(
          "moon"
        )}</span>`)
    );
  let t = null;
  try {
    t = localStorage.getItem("theme");
  } catch (e) {}
  const mq = matchMedia("(prefers-color-scheme: dark)");
  if (t !== "light" && t !== "dark") t = mq.matches ? "dark" : "light";
  setTheme(t, true);
  mq.addEventListener("change", (e) => {
    let s = null;
    try {
      s = localStorage.getItem("theme");
    } catch (x) {}
    if (s !== "light" && s !== "dark")
      setTheme(e.matches ? "dark" : "light", true);
  });
}
function toggleTheme(ev) {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(next);
    return;
  }
  if (!document.startViewTransition) {
    const r = document.documentElement;
    r.classList.add("tfade");
    setTheme(next);
    setTimeout(() => r.classList.remove("tfade"), 450);
    return;
  }
  const b =
    ev && ev.currentTarget ? ev.currentTarget.getBoundingClientRect() : null;
  const x = b ? b.left + b.width / 2 : innerWidth - 40,
    y = b ? b.top + b.height / 2 : 30;
  const rad = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  );
  const t = document.startViewTransition(() => setTheme(next));
  t.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${rad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    })
    .catch(() => {});
}
function setTheme(t, init) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll(".thm").forEach((e) => (e.dataset.mode = t));
  document
    .querySelectorAll(".sw2")
    .forEach((b) => b.setAttribute("aria-checked", t === "dark"));
  if (!init) {
    try {
      localStorage.setItem("theme", t);
    } catch (e) {}
  }
  icons();
}
themeInit();

function members() {
  const st = [...S.users]
    .sort((a, b) => toHira(a).localeCompare(toHira(b), "ja"))
    .map((n) => ({ n, r: "生徒" }));
  return S.hasTeacher ? [{ n: "先生", r: "先生" }, ...st] : st;
}
function openMembers() {
  const ms = members();
  dlgShow(
    `<h2 id="dt">参加メンバー（${ms.length}人）</h2><div class="mlist">${ms
      .map(
        (m) =>
          `<div class="mrow">${av(m.n)}<b>${esc(m.n)}</b>${
            m.n === S.me.n ? '<span class="tag okc">あなた</span>' : ""
          }<span class="mrole">${m.r}</span></div>`
      )
      .join(
        ""
      )}</div><div class="row" style="justify-content:flex-end"><button class="btn" onclick="dlgClose()">閉じる</button></div>`
  );
}

S.seen = new Set();
S.tseen = new Set();
S.armed = false;
S.flashRisk = null;

/* ---- ワークシート（AIなし）---- */
S.ws = [
  ["q", "問い・テーマ"],
  ["r", "調べる（根拠・出典）"],
  ["o", "自分たちの考え"],
  ["c", "反対意見・別の見方"],
  ["f", "まとめ・結論"],
].map(([k, t]) => ({ k, t, items: [] }));
S.ws[0].items.push({
  id: 1,
  t: "どんな防災マップなら、小学生の役に立つか",
  by: "ミサキ",
  ts: T0(10, 40),
  src: "",
});
function wsTab() {
  return `<div class="scroll">${S.ws
    .map(
      (s, si) =>
        `<section class="card ws"><button class="wsh" aria-expanded="${!S
          .wsClosed[s.k]}" onclick="wsToggle(${si})"><span>${esc(
          s.t
        )}</span><span class="wsn">${
          s.items.length ? s.items.length + "件" : ""
        }</span>${ic("chevron-down")}</button><div class="wsb" ${
          S.wsClosed[s.k] ? "hidden" : ""
        }>${
          s.items
            .map(
              (it, ii) =>
                `<div class="wi"><div class="wt">${esc(it.t)}${
                  it.src
                    ? `<div class="wq">${ic("quote")}${esc(it.src)}</div>`
                    : ""
                }</div><div class="wm"><span>${esc(it.by)} ${fmt(
                  it.ts
                )}</span><button class="tb" onclick="wsEdit(${si},${ii})" aria-label="編集">${ic(
                  "pencil"
                )}</button><button class="tb" onclick="wsDel(${si},${ii})" aria-label="削除">${ic(
                  "trash-2"
                )}</button></div></div>`
            )
            .join("") ||
          '<p class="empty" style="padding:8px 0">まだ何も書かれていません</p>'
        }<div class="row"><div style="flex:1 1 200px"><label for="wsi${si}" class="sr">${esc(
          s.t
        )}に書き込む</label><textarea id="wsi${si}" rows="1" placeholder="書き込む" oninput="grow(this)"></textarea></div><button class="btn sm" onclick="wsAdd(${si})">${ic(
          "plus"
        )}追加</button></div></div></section>`
    )
    .join("")}</div>`;
}
function wsAdd(si) {
  const v = $("wsi" + si).value.trim();
  if (!v) return;
  S.ws[si].items.push({
    id: Date.now(),
    t: v,
    by: S.me.n,
    ts: Date.now(),
    src: "",
  });
  render();
}
function wsDel(si, ii) {
  S.ws[si].items.splice(ii, 1);
  render();
}
function wsEdit(si, ii) {
  const it = S.ws[si].items[ii],
    v = prompt("内容を編集", it.t);
  if (v && v.trim()) {
    it.t = v.trim();
    render();
  }
}
/* ---- リアクション ---- */
const RX = {
  agree: ["thumbs-up", "賛成"],
  ask: ["circle-help", "疑問・もう少し知りたい"],
  source: ["search", "根拠がほしい"],
  alt: ["lightbulb", "別の案がある"],
  heart: ["heart", "スタンプ: ハート"],
  star: ["star", "スタンプ: ほし"],
  party: ["party-popper", "スタンプ: お祝い"],
  smile: ["smile", "スタンプ: えがお"],
};
function rxChips(x) {
  return Object.entries(x.rx || {})
    .filter(([, v]) => v.length)
    .map(
      ([k, v]) =>
        `<button class="rx ${
          v.includes(S.me.n) ? "on" : ""
        }" aria-pressed="${v.includes(S.me.n)}" aria-label="${RX[k][1]} ${
          v.length
        }人" onclick="toggleRx(${x.id},'${k}')">${ic(RX[k][0])}<span>${
          v.length
        }</span></button>`
    )
    .join("");
}
function toggleRx(id, k) {
  const m = msgById(id);
  m.rx = m.rx || {};
  const a = (m.rx[k] = m.rx[k] || []);
  const i = a.indexOf(S.me.n);
  if (i >= 0) a.splice(i, 1);
  else a.push(S.me.n);
  const sc = document.querySelector("#pane .scroll");
  S.keepY = sc ? sc.scrollTop : null;
  render();
}
function openRx(id) {
  dlgShow(
    `<h2 id="dt">リアクションを選ぶ</h2><div class="rxgrid">${Object.entries(RX)
      .map(
        ([k, v]) =>
          `<button class="rxo" onclick="dlgClose();toggleRx(${id},'${k}')">${ic(
            v[0]
          )}<span>${v[1]}</span></button>`
      )
      .join(
        ""
      )}</div><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="dlgClose()">閉じる</button></div>`
  );
}
/* ---- 発言をワークシートに入れる ---- */
function openClip(id) {
  const m = msgById(id);
  S.clip = { id, mode: "quote" };
  dlgShow(`<h2 id="dt">ワークシートに入れる</h2><div class="col"><div class="rep"><small>${esc(
    m.u
  )}</small>${esc(m.t)}</div>
 <fieldset class="fs"><legend>入れ方</legend><label class="opt"><input type="radio" name="cm" value="quote" checked onchange="clipMode(this.value)"><span>そのまま引用で入れる</span></label><label class="opt"><input type="radio" name="cm" value="rewrite" onchange="clipMode(this.value)"><span>自分の言葉に書き直して入れる</span></label></fieldset>
 <div id="cw" hidden><label for="ct">自分の言葉で</label><textarea id="ct" rows="3" oninput="grow(this)"></textarea></div>
 <fieldset class="fs"><legend>入れる項目</legend>${S.ws
   .map(
     (s, i) =>
       `<label class="opt"><input type="radio" name="cs" value="${i}" ${
         i === 1 ? "checked" : ""
       }><span>${esc(s.t)}</span></label>`
   )
   .join("")}</fieldset>
 <div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="dlgClose()">キャンセル</button><button class="btn" onclick="clipDo()">${ic(
   "file-input"
 )}入れる</button></div></div>`);
}
function clipMode(v) {
  S.clip.mode = v;
  $("cw").hidden = v !== "rewrite";
  if (v === "rewrite") $("ct").focus();
}
function clipDo() {
  const m = msgById(S.clip.id),
    si = +document.querySelector("input[name=cs]:checked").value;
  let t, src;
  if (S.clip.mode === "rewrite") {
    t = $("ct").value.trim();
    if (!t) {
      toast("自分の言葉を入力してください");
      return;
    }
    src = "もとの発言: " + m.u + "「" + m.t + "」";
  } else {
    t = m.t;
    src = m.u + " さんの発言";
  }
  S.ws[si].items.push({ id: Date.now(), t, by: S.me.n, ts: Date.now(), src });
  dlgClose();
  render();
  toast("ワークシートに入れました", "見る", () => setTab("ws"));
}
/* ---- 論点パネル（生徒の手だけで更新）---- */
S.issues = [
  { id: 1, t: "誰のためのマップか", st: "talk", reason: "" },
  { id: 2, t: "避難所の情報をどこから集めるか", st: "talk", reason: "" },
];
const ST = {
  talk: ["話し合い中", "message-circle"],
  done: ["決まった", "check"],
  hold: ["保留", "pause"],
};
function issuesPanel() {
  const n = S.issues.length;
  if (S.cur >= n) S.cur = Math.max(0, n - 1);
  const x = S.issues[S.cur];
  return `<div class="issues"><div style="display:flex;align-items:center;gap:4px"><h2 style="flex:1;margin:0">${ic(
    "flag"
  )}論点</h2>${
    n > 1
      ? `<button class="tb" aria-label="前の論点" onclick="issueNav(-1)">${ic(
          "chevron-left"
        )}</button><span style="color:var(--mu);font-size:13px">${
          S.cur + 1
        }/${n}</span><button class="tb" aria-label="次の論点" onclick="issueNav(1)">${ic(
          "chevron-right"
        )}</button>`
      : ""
  }${
    n
      ? `<button class="tb" aria-label="論点の一覧" onclick="openIssues()">${ic(
          "list"
        )}</button>`
      : ""
  }</div>${
    x
      ? `<div class="is is-${x.st}"><b>${esc(x.t)}</b>${
          x.reason ? `<div class="isr">理由: ${esc(x.reason)}</div>` : ""
        }<button class="go is-st" onclick="cycleIssue(${S.cur})">${ic(
          ST[x.st][1]
        )}${ST[x.st][0]}</button></div>`
      : '<p class="empty" style="padding:8px 0">まだありません</p>'
  }<button class="btn sec sm" style="margin-top:8px" onclick="openIssueAdd()">${ic(
    "plus"
  )}論点を追加</button></div><hr class="hr">`;
}
function cycleIssue(i) {
  const x = S.issues[i],
    nx = { talk: "done", done: "hold", hold: "talk" }[x.st];
  if (nx === "done") {
    const r = prompt("決まった理由を書いてください", x.reason || "");
    if (r === null) return;
    x.reason = r.trim();
  } else x.reason = "";
  x.st = nx;
  render();
}
function addIssue(id) {
  const m = msgById(id);
  S.issues.push({
    id: Date.now(),
    t: m.t.slice(0, 40),
    st: "talk",
    reason: "",
  });
  S.cur = S.issues.length - 1;
  render();
  toast("論点に追加しました");
}
function addIssueManual() {
  const v = $("ii").value.trim();
  if (!v) return;
  S.issues.push({ id: Date.now(), t: v, st: "talk", reason: "" });
  render();
  if ($("ii")) $("ii").focus();
}
/* ---- 追いつく（AIなしの版）---- */
function openCatchup(first) {
  const talk = S.issues.filter((x) => x.st !== "done"),
    dn = S.issues.filter((x) => x.st === "done"),
    empty = S.ws.filter((s) => !s.items.length).map((s) => s.t),
    recent = S.msgs.filter((x) => !x.p && !x.b && !x.ai).slice(-5);
  const pts = [
    ...talk.slice(0, 2).map((x) => `「${esc(x.t)}」について、意見を書いてみる`),
    ...empty.slice(0, 2).map((t) => `ワークシートの「${esc(t)}」がまだ空です`),
  ];
  dlgShow(`<h2 id="dt">いままでの議論に追いつく</h2><div class="col">${
    first
      ? '<p style="margin:0;color:var(--mu)">途中から参加した人も、ここを見れば議論に追いつけます。画面上の「追いつく」から、いつでも開けます。</p>'
      : ""
  }
 <div><b>話し合い中・保留の論点</b>${
   talk.length
     ? `<ul>${talk
         .map((x) => `<li>${esc(x.t)}（${ST[x.st][0]}）</li>`)
         .join("")}</ul>`
     : '<p style="margin:4px 0;color:var(--mu)">ありません</p>'
 }</div>
 <div><b>決まったこと</b>${
   dn.length
     ? `<ul>${dn
         .map(
           (x) =>
             `<li>${esc(x.t)}${
               x.reason ? "（理由: " + esc(x.reason) + "）" : ""
             }</li>`
         )
         .join("")}</ul>`
     : '<p style="margin:4px 0;color:var(--mu)">まだありません</p>'
 }</div>
 <div><b>最近の発言</b>${
   recent
     .map(
       (m) =>
         `<div class="rep" style="margin-top:6px"><small>${esc(m.u)} ${fmt(
           m.ts
         )}</small>${esc(m.t)}</div>`
     )
     .join("") || '<p style="margin:4px 0;color:var(--mu)">まだありません</p>'
 }</div>
 <div><b>参加できるポイント</b><ul>${
   pts.map((p) => `<li>${p}</li>`).join("") ||
   "<li>チャットに感想を書いてみる</li>"
 }</ul></div>
 <div class="row" style="justify-content:flex-end"><button class="btn" onclick="dlgClose()">閉じる</button></div></div>`);
}

S.cur = 0;
S.wsClosed = {};
function wsToggle(si) {
  const k = S.ws[si].k;
  S.wsClosed[k] = !S.wsClosed[k];
  const sec = document.querySelectorAll(".ws")[si];
  sec.querySelector(".wsb").hidden = S.wsClosed[k];
  sec.querySelector(".wsh").setAttribute("aria-expanded", !S.wsClosed[k]);
}
function issueNav(d) {
  const n = S.issues.length;
  S.cur = (S.cur + d + n) % n;
  render();
}
function openIssueAdd() {
  dlgShow(
    `<h2 id="dt">論点を追加</h2><div class="col"><div><label for="ii">論点</label><input id="ii" placeholder="例: 誰のためのマップか" onkeydown="if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229)issueDo()"></div><p id="derr" role="alert" style="color:var(--err);font-weight:700;margin:0"></p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="dlgClose()">キャンセル</button><button class="btn" onclick="issueDo()">${ic(
      "plus"
    )}追加</button></div></div>`
  );
  $("ii").focus();
}
function issueDo() {
  const v = $("ii").value.trim();
  if (!v) {
    $("derr").textContent = "エラー: 論点を入力してください。";
    return;
  }
  S.issues.push({ id: Date.now(), t: v, st: "talk", reason: "" });
  S.cur = S.issues.length - 1;
  dlgClose();
  render();
}
function openIssues() {
  dlgShow(
    `<h2 id="dt">論点の一覧</h2><div class="mlist">${
      S.issues
        .map(
          (x, i) =>
            `<div class="mrow"><div style="flex:1"><b>${esc(x.t)}</b>${
              x.reason ? `<div class="isr">理由: ${esc(x.reason)}</div>` : ""
            }</div><span class="tag ${x.st === "done" ? "okc" : ""}">${ic(
              ST[x.st][1]
            )}${
              ST[x.st][0]
            }</span><button class="tb" onclick="S.cur=${i};dlgClose();render()">表示</button><button class="tb" aria-label="削除" onclick="S.issues.splice(${i},1);render();openIssues()">${ic(
              "trash-2"
            )}</button></div>`
        )
        .join("") || '<p class="empty">まだありません</p>'
    }</div><div class="row" style="justify-content:flex-end"><button class="btn" onclick="dlgClose()">閉じる</button></div>`
  );
}
