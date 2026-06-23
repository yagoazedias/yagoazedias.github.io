/* Habit Tracker — lógica principal (vanilla JS, sem build) */
(() => {
  "use strict";

  const STORAGE_KEY = "habit-tracker:v1";
  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // ---------- Estado ----------
  let state = load();
  let selectedId = state.habits[0]?.id ?? null;
  let viewDate = startOfMonth(new Date()); // mês exibido no calendário
  let swReg = null;
  const fallbackTimers = new Map(); // habitId -> timeoutId (modo sem TimestampTrigger)

  // ---------- Persistência ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { habits: [] };
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- Helpers de data ----------
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function todayKey() {
    return dateKey(new Date());
  }

  // ---------- Modelo ----------
  function getHabit(id) {
    return state.habits.find((h) => h.id === id) || null;
  }
  function createHabit({ name, emoji, color, time }) {
    const habit = {
      id: crypto.randomUUID(),
      name: name.trim(),
      emoji: (emoji || "").trim() || "✅",
      color: color || "#6366f1",
      time: time || "",
      createdAt: Date.now(),
      completions: {},
    };
    state.habits.push(habit);
    save();
    return habit;
  }
  function updateHabit(id, patch) {
    const h = getHabit(id);
    if (!h) return;
    Object.assign(h, patch);
    save();
  }
  function deleteHabit(id) {
    state.habits = state.habits.filter((h) => h.id !== id);
    save();
  }
  function toggleCompletion(habit, key) {
    if (habit.completions[key]) delete habit.completions[key];
    else habit.completions[key] = true;
    save();
  }

  // ---------- Estatísticas ----------
  function totalDone(habit) {
    return Object.keys(habit.completions).length;
  }
  function currentStreak(habit) {
    let streak = 0;
    const d = new Date();
    // Se hoje ainda não foi feito, a sequência conta a partir de ontem.
    if (!habit.completions[dateKey(d)]) d.setDate(d.getDate() - 1);
    while (habit.completions[dateKey(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  function doneThisMonth(habit, ref) {
    const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-`;
    return Object.keys(habit.completions).filter((k) => k.startsWith(prefix)).length;
  }

  // ---------- Elementos ----------
  const els = {
    list: document.getElementById("habit-list"),
    empty: document.getElementById("empty-state"),
    panel: document.getElementById("panel"),
    placeholder: document.getElementById("placeholder"),
    title: document.getElementById("panel-title"),
    stats: document.getElementById("panel-stats"),
    calMonth: document.getElementById("cal-month"),
    calWeekdays: document.getElementById("cal-weekdays"),
    calGrid: document.getElementById("cal-grid"),
    addBtn: document.getElementById("add-habit-btn"),
    editBtn: document.getElementById("edit-habit-btn"),
    deleteBtn: document.getElementById("delete-habit-btn"),
    prevBtn: document.getElementById("cal-prev"),
    nextBtn: document.getElementById("cal-next"),
    dialog: document.getElementById("habit-dialog"),
    form: document.getElementById("habit-form"),
    dialogTitle: document.getElementById("dialog-title"),
    fName: document.getElementById("f-name"),
    fEmoji: document.getElementById("f-emoji"),
    fColor: document.getElementById("f-color"),
    fTime: document.getElementById("f-time"),
    dialogCancel: document.getElementById("dialog-cancel"),
    notifBtn: document.getElementById("notif-btn"),
    notifBanner: document.getElementById("notif-banner"),
  };

  let editingId = null; // null = criando

  // ---------- Render ----------
  function render() {
    renderList();
    renderPanel();
  }

  function renderList() {
    els.list.innerHTML = "";
    els.empty.hidden = state.habits.length > 0;
    for (const h of state.habits) {
      const li = document.createElement("li");
      li.className = "habit-item" + (h.id === selectedId ? " is-active" : "");
      li.dataset.id = h.id;
      const streak = currentStreak(h);
      li.innerHTML = `
        <span class="habit-item__dot" style="background:${h.color}"></span>
        <span class="habit-item__emoji">${escapeHtml(h.emoji)}</span>
        <span class="habit-item__name">${escapeHtml(h.name)}</span>
        ${streak > 0 ? `<span class="habit-item__badge">🔥 ${streak}</span>` : ""}`;
      li.addEventListener("click", () => {
        selectedId = h.id;
        viewDate = startOfMonth(new Date());
        render();
      });
      els.list.appendChild(li);
    }
  }

  function renderPanel() {
    const habit = getHabit(selectedId);
    const hasHabit = !!habit;
    els.panel.hidden = !hasHabit;
    els.placeholder.hidden = hasHabit;
    if (!hasHabit) return;

    els.title.innerHTML = `${escapeHtml(habit.emoji)} ${escapeHtml(habit.name)}`;
    const parts = [
      `🔥 Sequência: <strong>${currentStreak(habit)}</strong>`,
      `📅 Este mês: <strong>${doneThisMonth(habit, viewDate)}</strong>`,
      `✅ Total: <strong>${totalDone(habit)}</strong>`,
    ];
    if (habit.time) parts.push(`⏰ Lembrete: <strong>${habit.time}</strong>`);
    els.stats.innerHTML = parts.join(" &nbsp;·&nbsp; ");

    renderCalendar(habit);
  }

  function renderCalendar(habit) {
    // Cabeçalho do mês
    els.calMonth.textContent = viewDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    // Dias da semana
    els.calWeekdays.innerHTML = WEEKDAYS.map(
      (w) => `<div class="cal__weekday">${w}</div>`
    ).join("");

    // Grade
    els.calGrid.innerHTML = "";
    els.calGrid.style.setProperty("--habit-color", habit.color);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayKey();
    const todayTime = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

    // Células vazias antes do dia 1
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement("div");
      cell.className = "cal__day is-empty";
      els.calGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = dateKey(d);
      const cell = document.createElement("div");
      cell.className = "cal__day";
      if (key === today) cell.classList.add("is-today");
      if (habit.completions[key]) cell.classList.add("is-done");
      const isFuture = d.getTime() > todayTime;
      if (isFuture) cell.classList.add("is-future");
      cell.innerHTML = `<span>${day}</span>`;

      if (!isFuture) {
        cell.addEventListener("click", () => {
          toggleCompletion(habit, key);
          render();
          scheduleAllReminders(); // hoje pode ter mudado → reavalia lembrete
        });
      }
      els.calGrid.appendChild(cell);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  // ---------- Modal ----------
  function openDialog(id) {
    editingId = id ?? null;
    const h = id ? getHabit(id) : null;
    els.dialogTitle.textContent = h ? "Editar hábito" : "Novo hábito";
    els.fName.value = h?.name ?? "";
    els.fEmoji.value = h?.emoji ?? "";
    els.fColor.value = h?.color ?? "#6366f1";
    els.fTime.value = h?.time ?? "";
    els.dialog.showModal();
    els.fName.focus();
  }

  els.addBtn.addEventListener("click", () => openDialog(null));
  els.editBtn.addEventListener("click", () => selectedId && openDialog(selectedId));
  els.dialogCancel.addEventListener("click", () => els.dialog.close());

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      name: els.fName.value,
      emoji: els.fEmoji.value,
      color: els.fColor.value,
      time: els.fTime.value,
    };
    if (!data.name.trim()) return;
    if (editingId) {
      updateHabit(editingId, data);
    } else {
      const h = createHabit(data);
      selectedId = h.id;
    }
    els.dialog.close();
    render();
    scheduleAllReminders();
  });

  els.deleteBtn.addEventListener("click", () => {
    const h = getHabit(selectedId);
    if (!h) return;
    if (!confirm(`Excluir o hábito "${h.name}" e todo o histórico?`)) return;
    deleteHabit(h.id);
    selectedId = state.habits[0]?.id ?? null;
    render();
    scheduleAllReminders();
  });

  els.prevBtn.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderPanel();
  });
  els.nextBtn.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderPanel();
  });

  // ---------- Notificações / lembretes ----------
  const supportsTriggers =
    "Notification" in window && "showTrigger" in Notification.prototype;

  function setBanner(html, kind) {
    if (!html) {
      els.notifBanner.hidden = true;
      return;
    }
    els.notifBanner.hidden = false;
    els.notifBanner.className = "banner banner--" + kind;
    els.notifBanner.innerHTML = html;
  }

  function refreshNotifUI() {
    if (!("Notification" in window)) {
      els.notifBtn.hidden = true;
      setBanner("Este navegador não suporta notificações.", "warn");
      return;
    }
    const p = Notification.permission;
    if (p === "granted") {
      els.notifBtn.textContent = "🔔 Lembretes ativos";
      const withTime = state.habits.filter((h) => h.time).length;
      if (withTime === 0) {
        setBanner(
          "Notificações ativas. Defina um <strong>horário</strong> ao criar/editar um hábito para receber lembretes.",
          "ok"
        );
      } else if (!supportsTriggers) {
        setBanner(
          "Lembretes agendados. ⚠️ Neste navegador eles só disparam enquanto o app está aberto. Para lembretes com o app fechado, use o Chrome/Edge no Android e instale o app.",
          "warn"
        );
      } else {
        setBanner(`Lembretes agendados para ${withTime} hábito(s). ⏰`, "ok");
      }
    } else if (p === "denied") {
      els.notifBtn.textContent = "🔕 Bloqueado";
      setBanner(
        "Notificações bloqueadas. Habilite nas permissões do site para receber lembretes.",
        "err"
      );
    } else {
      els.notifBtn.textContent = "🔔 Ativar lembretes";
      setBanner(null);
    }
  }

  els.notifBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const res = await Notification.requestPermission();
      if (res === "granted") await scheduleAllReminders();
    }
    refreshNotifUI();
  });

  // Calcula o próximo timestamp (ms) para "HH:MM", pulando hoje se já passou
  // ou se o hábito já foi cumprido hoje.
  function nextOccurrence(habit) {
    if (!habit.time) return null;
    const [hh, mm] = habit.time.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    const doneToday = !!habit.completions[todayKey()];
    if (target.getTime() <= now.getTime() || doneToday) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  function reminderPayload(habit) {
    return {
      title: `${habit.emoji} ${habit.name}`,
      options: {
        body: "Hora de cumprir seu hábito de hoje! 💪",
        tag: "reminder-" + habit.id,
        icon: "icons/icon.svg",
        badge: "icons/icon.svg",
        renotify: true,
        data: { url: "./", habitId: habit.id },
      },
    };
  }

  async function scheduleAllReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      refreshNotifUI();
      return;
    }
    if (!swReg) {
      try {
        swReg = await navigator.serviceWorker.ready;
      } catch (_) {
        return;
      }
    }

    // Limpa agendamentos anteriores (ambos os modos)
    for (const t of fallbackTimers.values()) clearTimeout(t);
    fallbackTimers.clear();
    if (supportsTriggers) {
      const pending = await swReg.getNotifications({ includeTriggered: true });
      for (const n of pending) {
        if (n.tag && n.tag.startsWith("reminder-")) n.close();
      }
    }

    for (const habit of state.habits) {
      const when = nextOccurrence(habit);
      if (!when) continue;
      const { title, options } = reminderPayload(habit);

      if (supportsTriggers) {
        try {
          await swReg.showNotification(title, {
            ...options,
            showTrigger: new TimestampTrigger(when),
          });
          continue;
        } catch (_) {
          // cai no fallback abaixo
        }
      }

      // Fallback: setTimeout (só funciona com o app aberto)
      scheduleFallback(habit, when);
    }
    refreshNotifUI();
  }

  function scheduleFallback(habit, when) {
    const delay = when - Date.now();
    // setTimeout estoura acima de ~24.8 dias; aqui sempre < 24h, então ok.
    const id = setTimeout(async () => {
      // Reavalia: pode ter sido cumprido entre o agendamento e agora.
      if (!habit.completions[todayKey()]) {
        const { title, options } = reminderPayload(habit);
        try {
          (swReg || (await navigator.serviceWorker.ready)).showNotification(
            title,
            options
          );
        } catch (_) {}
      }
      // Reagenda para o próximo dia.
      const next = nextOccurrence(habit);
      if (next) scheduleFallback(habit, next);
    }, Math.max(0, delay));
    fallbackTimers.set(habit.id, id);
  }

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        swReg = await navigator.serviceWorker.register("sw.js");
        await navigator.serviceWorker.ready;
        await scheduleAllReminders();
      } catch (err) {
        console.warn("SW falhou:", err);
      }
    });
  }

  // ---------- Init ----------
  render();
  refreshNotifUI();
})();
