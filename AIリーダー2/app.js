// ===== 1. データの形 =====
const STORE_KEY = "ai-leader-v2";
const STATUS = [
  { k: "todo", l: "未着手" },
  { k: "doing", l: "進行中" },
  { k: "done", l: "完了" },
];

// ボードに載せる項目の種類。fields = [キー, 見出し, 入力例]
const TYPES = {
  task: {
    label: "タスク",
    fields: [
      ["title", "やること", "例: 商店街の人通りを調べる"],
      ["assignee", "担当"],
      ["due", "期限", "例: 10/15"],
    ],
  },
  decision: {
    label: "決定事項",
    fields: [
      ["what", "決めたこと", "例: テーマを空き店舗の活用に絞る"],
      ["who", "決めた人", "例: 全員"],
      ["why", "理由", "例: 調査で一番反応が良かったから"],
    ],
  },
  issue: {
    label: "未解決の論点",
    fields: [
      ["topic", "まだ決まっていないこと", "例: 発表で誰が話すか"],
      ["needed", "決めるために必要なこと", "例: 各自の得意分野の確認"],
    ],
  },
  risk: {
    label: "リスク",
    fields: [
      ["what", "起こりそうな問題", "例: 取材の許可が間に合わない"],
      ["countermeasure", "対策", "例: 先に依頼文を送る"],
    ],
  },
};
const HINTS = {
  decision:
    "チームで「こうする」と決まったこと。あとで理由を思い出せるように残します。",
  issue:
    "話し合ったけれど、まだ決まっていないこと。次に何をすれば決まるかも書きます。",
  risk: "計画が止まりそうな原因。先に気づいておくと対策できます。",
};

function newState() {
  return {
    started: false,
    speaker: "",
    submitIdx: 0,
    project: { theme: "", period: "", deliverable: "" },
    members: [],
    roles: {},
    messages: [],
    proposals: [],
    items: { task: [], decision: [], issue: [], risk: [] },
  };
}
let state = newState();
let editingId = null;

// ===== 2. データを変える関数(画面には触らない) =====
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () =>
  new Date().toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function startProject(project, members) {
  state = newState();
  Object.assign(state, {
    started: true,
    project,
    members,
    speaker: members[0],
  });
  members.forEach((m) => (state.roles[m] = ""));
}
function addMessage(who, text, isAI = false) {
  state.messages.push({ id: uid(), who, text, time: now(), isAI });
}
function addItem(type, vals) {
  const item = Object.assign({ id: uid(), updated: now() }, vals);
  if (type === "task") item.status = vals.status || "todo";
  if (type === "decision") item.date = now();
  state.items[type].push(item);
}
function editItem(type, id, vals) {
  const it = state.items[type].find((i) => i.id === id);
  if (it) Object.assign(it, vals, { updated: now() });
}
function deleteItem(type, id) {
  state.items[type] = state.items[type].filter((i) => i.id !== id);
}
function moveTask(id, dir) {
  const it = state.items.task.find((i) => i.id === id);
  const idx = STATUS.findIndex((s) => s.k === it.status) + dir;
  if (idx >= 0 && idx < STATUS.length) it.status = STATUS[idx].k;
}
function setRole(member, role) {
  state.roles[member] = role;
}

// --- AIとのやりとり ---
function buildPrompt() {
  const p = state.project;
  const fresh = state.messages.slice(state.submitIdx).filter((m) => !m.isAI);
  const board = {
    ゴール: p,
    メンバーと役割: state.roles,
    タスク: state.items.task.map(({ title, assignee, due, status }) => ({
      title,
      assignee,
      due,
      status,
    })),
    決定事項: state.items.decision.map(({ what, who, why }) => ({
      what,
      who,
      why,
    })),
    未解決の論点: state.items.issue.map(({ topic, needed }) => ({
      topic,
      needed,
    })),
    リスク: state.items.risk.map(({ what, countermeasure }) => ({
      what,
      countermeasure,
    })),
  };
  const empty =
    Object.values(state.roles).every((r) => !r) &&
    state.items.task.length === 0;
  state.submitIdx = state.messages.length;
  return `あなたは学生チームのPBLを進める「リーダーAI」です。指示を出すタイプで、明るく簡潔に話してください。

【ルール】
- 1回に出す指示は最大3つ。各指示に「担当者・期限・完了条件」を入れる
- 担当者は次のメンバー名だけを使う: ${state.members.join("、")}
- 未解決の論点とリスクを、毎回それぞれ1つ以上挙げる
- 断定しすぎず、最後に「異議や別の案があれば教えてください」と添える
${
  empty
    ? "- 今回はキックオフです。メンバー全員分の役割案と、最初のタスク案を出す\n"
    : ""
}
【今のボード】
${JSON.stringify(board, null, 1)}

【新しい発言】
${fresh.length ? fresh.map((m) => `${m.who}: ${m.text}`).join("\n") : "(なし)"}

【返事の形式】
1. まずメンバーへのメッセージ(普通の文章)
2. 最後に、ボードへの更新案を次のJSONで1つだけ出す(コードブロックで囲む)
\`\`\`json
{"proposals":[
 {"type":"role","member":"名前","role":"役割","reason":"理由"},
 {"type":"task","title":"","assignee":"名前","due":""},
 {"type":"decision","what":"","who":"","why":""},
 {"type":"issue","topic":"","needed":""},
 {"type":"risk","what":"","countermeasure":""}
]}
\`\`\`
決まっていないことを決定事項にしないこと。`;
}
// JSONの { から対応する } までを切り出す
function sliceJson(s, start) {
  let d = 0,
    str = false,
    esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (str) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') str = false;
      continue;
    }
    if (c === '"') str = true;
    else if (c === "{") d++;
    else if (c === "}") {
      d--;
      if (d === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
// 戻り値: 画面に出すお知らせ文
function importReply(raw) {
  if (raw.includes("「リーダーAI」です"))
    return "これは提出文です。AIが返した文章を貼ってください。";
  let text = raw,
    props = null;
  // まずコードブロックを全部試す(読めたものを使う)
  for (const m of raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) {
    try {
      const j = JSON.parse(m[1].trim());
      if (Array.isArray(j.proposals)) {
        props = j.proposals;
        text = text.replace(m[0], "");
        break;
      }
    } catch (e) {}
  }
  // だめなら {"proposals" から自力で切り出す
  if (!props) {
    const i = raw.search(/\{\s*"proposals"/);
    const js = i >= 0 ? sliceJson(raw, i) : null;
    if (js) {
      try {
        props = JSON.parse(js).proposals;
        text = text.replace(js, "");
      } catch (e) {}
    }
  }
  text = text.replace(/```(?:json)?\s*```/g, "").trim();
  if (text) addMessage("リーダーAI", text, true);
  if (!props)
    return "文章を会話に取り込みました。ボードへの更新案(JSON)は見つかりませんでした。";
  const ok = props.filter((p) => p && (p.type === "role" || TYPES[p.type]));
  ok.forEach((p) => state.proposals.push(Object.assign({ id: uid() }, p)));
  return `文章を会話に取り込みました。ボードへの提案が${ok.length}件あります。`;
}
function adoptProposal(id) {
  const p = state.proposals.find((x) => x.id === id);
  if (!p) return;
  if (p.type === "role") {
    if (p.member in state.roles) setRole(p.member, p.role);
  } else {
    const vals = {};
    TYPES[p.type].fields.forEach(([k]) => (vals[k] = p[k] || ""));
    addItem(p.type, vals);
  }
  rejectProposal(id);
}
function rejectProposal(id) {
  state.proposals = state.proposals.filter((x) => x.id !== id);
}

// ===== 3. 保存と読み込み =====
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {}
}
function loadFromObject(obj) {
  if (!obj || !obj.items || !obj.members)
    throw new Error("形式が違います(v2の保存ファイルを選んでください)");
  state = Object.assign(newState(), obj);
  render();
}
function exportFile() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
  );
  a.download =
    "ai-leader-v2-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
}
function importFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      loadFromObject(JSON.parse(r.result));
      persist();
    } catch (e) {
      alert("読み込めませんでした: " + e.message);
    }
  };
  r.readAsText(file);
}

// ===== 4. 画面に表示する関数 =====
const $ = (id) => document.getElementById(id);
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e[k] = v;
    else e.setAttribute(k, v);
  }
  kids
    .flat(Infinity)
    .filter((c) => c != null && c !== false)
    .forEach((c) => e.append(c));
  return e;
}
const save = () => {
  persist();
  renderBoard();
};

function render() {
  $("setup").hidden = state.started;
  $("main").hidden = !state.started;
  if (!state.started) return;
  $("title").textContent = state.project.theme || "無題のプロジェクト";
  const sel = $("speaker");
  sel.innerHTML = "";
  state.members.forEach((m) => sel.append(el("option", { value: m }, m)));
  sel.value = state.speaker;
  renderLog();
  renderBoard();
}
function renderLog() {
  const log = $("log");
  log.innerHTML = "";
  state.messages.forEach((m) =>
    log.append(
      el(
        "div",
        { class: "msg" + (m.isAI ? " ai" : "") },
        el("b", {}, m.who, el("time", {}, m.time)),
        m.text
      )
    )
  );
  log.scrollTop = log.scrollHeight;
}

// 入力フォーム(追加と編集で共通)
function itemForm(type, init, onSubmit, onCancel) {
  const fields = TYPES[type].fields,
    inputs = {};
  const form = el("form", { class: "itemform" });
  fields.forEach(([k, label, ph]) => {
    const inp =
      k === "assignee"
        ? el(
            "select",
            {},
            el("option", { value: "" }, "(未定)"),
            state.members.map((m) => el("option", { value: m }, m))
          )
        : el("input", { placeholder: ph || "" });
    inp.value = init[k] || "";
    inputs[k] = inp;
    form.append(el("label", {}, label, inp));
  });
  form.append(
    el(
      "div",
      { class: "row" },
      el("button", {}, init.id ? "保存" : "追加"),
      onCancel &&
        el(
          "button",
          { type: "button", class: "ghost", onclick: onCancel },
          "やめる"
        )
    )
  );
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = {};
    fields.forEach(([k]) => (v[k] = inputs[k].value.trim()));
    if (v[fields[0][0]]) onSubmit(v);
  };
  return form;
}
function summary(type, it) {
  const meta = (t) => el("span", { class: "meta" }, t);
  if (type === "task")
    return [
      it.title,
      meta(
        [it.assignee && "担当: " + it.assignee, it.due && "期限: " + it.due]
          .filter(Boolean)
          .join(" / ")
      ),
    ];
  if (type === "decision")
    return [
      it.what,
      meta(
        ["誰が: " + (it.who || "-"), "理由: " + (it.why || "-"), it.date].join(
          " / "
        )
      ),
    ];
  if (type === "issue")
    return [it.topic, meta("必要なこと: " + (it.needed || "-"))];
  return [it.what, meta("対策: " + (it.countermeasure || "-"))];
}
function itemRow(type, it) {
  if (editingId === it.id)
    return itemForm(
      type,
      it,
      (v) => {
        editItem(type, it.id, v);
        editingId = null;
        save();
      },
      () => {
        editingId = null;
        renderBoard();
      }
    );
  return el(
    "div",
    { class: "item" },
    el("div", { class: "body" }, summary(type, it)),
    el(
      "button",
      {
        class: "small",
        onclick: () => {
          editingId = it.id;
          renderBoard();
        },
      },
      "編集"
    ),
    el(
      "button",
      {
        class: "small",
        onclick: () => {
          deleteItem(type, it.id);
          save();
        },
      },
      "削除"
    )
  );
}
function addBox(type) {
  return el(
    "details",
    {},
    el("summary", {}, "+ " + TYPES[type].label + "を追加"),
    itemForm(type, {}, (v) => {
      addItem(type, v);
      save();
    })
  );
}
function block(title, hint, ...content) {
  return el(
    "div",
    { class: "block" },
    el("h3", {}, title),
    hint && el("p", { class: "hint" }, hint),
    content
  );
}

function renderBoard() {
  const root = $("board");
  root.innerHTML = "";

  // AIの提案
  if (state.proposals.length) {
    root.append(
      el(
        "div",
        { class: "proposals" },
        el("h3", {}, "AIからの提案(「ボードに追加」を押すとボードに入ります)"),
        state.proposals.map((p) =>
          el(
            "div",
            { class: "prop" },
            el(
              "div",
              { class: "body" },
              el(
                "span",
                { class: "tag" },
                p.type === "role" ? "役割" : TYPES[p.type].label
              ),
              p.type === "role"
                ? `${p.member}: ${p.role}${
                    p.reason ? "(" + p.reason + ")" : ""
                  }`
                : TYPES[p.type].fields
                    .map(([k, l]) => p[k] && `${l}: ${p[k]}`)
                    .filter(Boolean)
                    .join(" / ")
            ),
            el(
              "button",
              {
                class: "small",
                onclick: () => {
                  adoptProposal(p.id);
                  save();
                },
              },
              "ボードに追加"
            ),
            el(
              "button",
              {
                class: "small",
                onclick: () => {
                  rejectProposal(p.id);
                  save();
                },
              },
              "見送る"
            )
          )
        )
      )
    );
  }

  // 目的・ゴール(ラベル付き入力)
  const goalField = (k, label) =>
    el(
      "label",
      {},
      label,
      Object.assign(el("input", { value: state.project[k] }), {
        onchange: (e) => {
          state.project[k] = e.target.value.trim();
          persist();
          $("title").textContent = state.project.theme || "無題のプロジェクト";
        },
      })
    );
  root.append(
    block(
      "目的・ゴール",
      null,
      goalField("theme", "テーマ"),
      goalField("period", "期間"),
      goalField("deliverable", "成果物")
    )
  );

  // メンバーと役割
  root.append(
    block(
      "メンバーと役割",
      "役割はAIの提案から追加するか、自分で入力できます。",
      state.members.map((m) =>
        el(
          "div",
          { class: "rolerow" },
          m,
          Object.assign(
            el("input", {
              value: state.roles[m] || "",
              placeholder: "役割(未定)",
            }),
            {
              onchange: (e) => {
                setRole(m, e.target.value.trim());
                persist();
              },
            }
          )
        )
      )
    )
  );

  // タスク(未着手・進行中・完了)
  const taskCard = (t, si) =>
    editingId === t.id
      ? itemRow("task", t)
      : el(
          "div",
          { class: "card" },
          summary("task", t),
          el(
            "div",
            { class: "row" },
            si > 0 &&
              el(
                "button",
                {
                  class: "small",
                  onclick: () => {
                    moveTask(t.id, -1);
                    save();
                  },
                },
                "←"
              ),
            si < 2 &&
              el(
                "button",
                {
                  class: "small",
                  onclick: () => {
                    moveTask(t.id, 1);
                    save();
                  },
                },
                "→"
              ),
            el(
              "button",
              {
                class: "small",
                onclick: () => {
                  editingId = t.id;
                  renderBoard();
                },
              },
              "編集"
            ),
            el(
              "button",
              {
                class: "small",
                onclick: () => {
                  deleteItem("task", t.id);
                  save();
                },
              },
              "削除"
            )
          )
        );
  const kanban = el(
    "div",
    { class: "kanban" },
    STATUS.map((s, si) =>
      el(
        "div",
        { class: "col" },
        el("h4", {}, s.l),
        state.items.task
          .filter((t) => t.status === s.k)
          .map((t) => taskCard(t, si))
      )
    )
  );
  root.append(block("タスク", null, kanban, addBox("task")));

  // 決定事項・未解決の論点・リスク
  ["decision", "issue", "risk"].forEach((type) =>
    root.append(
      block(
        TYPES[type].label,
        HINTS[type],
        state.items[type].map((it) => itemRow(type, it)),
        addBox(type)
      )
    )
  );
}

// ===== 5. ボタンとの結びつけ =====
$("btn-start").onclick = () => {
  const members = $("in-members")
    .value.split(/[,、，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!members.length) {
    alert("メンバーを1人以上入力してください");
    return;
  }
  startProject(
    {
      theme: $("in-theme").value.trim(),
      period: $("in-period").value.trim(),
      deliverable: $("in-deliverable").value.trim(),
    },
    members
  );
  persist();
  render();
};
$("speaker").onchange = (e) => {
  state.speaker = e.target.value;
  persist();
};
$("msg-form").onsubmit = (e) => {
  e.preventDefault();
  const t = $("msg-input").value.trim();
  if (!t) return;
  if (t.includes("「リーダーAI」です")) {
    alert(
      "これは提出文です。AIのチャットに貼り、返事を下の「③」に貼ってください。"
    );
    return;
  }
  addMessage(state.speaker, t);
  $("msg-input").value = "";
  persist();
  renderLog();
};
$("btn-prompt").onclick = () => {
  const text = buildPrompt();
  $("prompt-out").value = text;
  persist();
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => alert("コピーしました。AIのチャットに貼ってください。"))
    .catch(() => {
      $("prompt-out").select();
      alert(
        "自動コピーできませんでした。枠内の文章を選んでコピーしてください。"
      );
    });
};
$("btn-import").onclick = () => {
  const raw = $("reply-in").value.trim();
  if (!raw) return;
  const note = importReply(raw);
  if (!note.startsWith("これは提出文")) $("reply-in").value = "";
  alert(note);
  persist();
  renderLog();
  renderBoard();
};
$("btn-save").onclick = exportFile;
$("btn-reset").onclick = () => {
  if (confirm("今の内容は消えます。書き出し済みですか?")) {
    state = newState();
    persist();
    render();
  }
};
["file-load", "file-load-setup"].forEach((id) => {
  $(id).onchange = (e) => {
    if (e.target.files[0]) importFile(e.target.files[0]);
    e.target.value = "";
  };
});

try {
  const s = localStorage.getItem(STORE_KEY);
  if (s) state = Object.assign(newState(), JSON.parse(s));
} catch (e) {}
render();
