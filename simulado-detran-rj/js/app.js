/* Simulado DETRAN-RJ — lógica do simulado (vanilla JS, sem dependências) */
(function () {
  "use strict";

  var LETRAS = ["A", "B", "C", "D", "E", "F"];

  var state = {
    banco: [],          // todas as questões carregadas
    meta: {},           // metadados do banco
    prova: [],          // questões da sessão atual (já embaralhadas)
    respostas: [],      // índice escolhido por questão (ou null)
    atual: 0,           // índice da questão atual
    mostrarFeedback: false,
    inicio: 0,          // timestamp de início
    timerId: null
  };

  // ---- Helpers de DOM ----
  function $(id) { return document.getElementById(id); }
  function show(id) { $(id).classList.remove("hidden"); }
  function hide(id) { $(id).classList.add("hidden"); }

  function embaralhar(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function formatarTempo(segundos) {
    var m = Math.floor(segundos / 60);
    var s = segundos % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // ---- Carregamento do banco de questões ----
  function carregarBanco() {
    return fetch("data/questions.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        normalizarBanco(data);
        popularCategorias();
      })
      .catch(function (err) {
        $("screen-start").innerHTML =
          '<h1>Ops!</h1><p>Não foi possível carregar as questões (' +
          err.message + ").</p><p>Se estiver abrindo o arquivo direto do disco, " +
          "publique em um servidor (ex.: GitHub Pages) para que o navegador permita o carregamento.</p>";
      });
  }

  // Aceita diferentes formatos de arquivo e normaliza para o formato interno:
  //   { categoria, pergunta, explicacao, imagem, opcoes: [{ texto, correta }] }
  // Formatos suportados:
  //   (a) { meta, questoes: [{ categoria, pergunta, opcoes: [str], resposta: idx, explicacao }] }
  //   (b) array (ou { questoes/questions }) de { enunciado, imagem, opcoes: [{ texto, correta }] }
  function normalizarBanco(data) {
    var lista = Array.isArray(data) ? data : (data.questoes || data.questions || []);
    state.meta = (data && !Array.isArray(data) && data.meta) ? data.meta : {};
    state.banco = lista.map(normalizarQuestao).filter(Boolean);
  }

  function normalizarQuestao(q) {
    if (!q) return null;
    var pergunta = q.pergunta || q.enunciado || q.titulo || "";
    var categoria = q.categoria || q.tema || q.assunto || "Trânsito";
    var explicacao = q.explicacao || q.justificativa || "";
    var imagem = q.imagem || q.image || "";
    var opcoes;

    if (Array.isArray(q.opcoes) && q.opcoes.length && typeof q.opcoes[0] === "object") {
      // formato com objetos { texto, correta }
      opcoes = q.opcoes.map(function (o) {
        return {
          texto: o.texto != null ? o.texto : o.text,
          correta: !!(o.correta || o.correto || o.correct)
        };
      });
    } else {
      // formato com lista de strings + índice da alternativa correta
      var textos = q.opcoes || q.alternativas || q.options || [];
      var idx = q.resposta != null ? q.resposta
              : (q.gabarito != null ? q.gabarito : q.correta);
      opcoes = textos.map(function (t, i) { return { texto: t, correta: i === idx }; });
    }

    var temCorreta = opcoes.some(function (o) { return o.correta; });
    if (!pergunta || !opcoes.length || !temCorreta) return null;
    return { categoria: categoria, pergunta: pergunta, explicacao: explicacao, imagem: imagem, opcoes: opcoes };
  }

  function popularCategorias() {
    var sel = $("select-categoria");
    var cats = {};
    state.banco.forEach(function (q) { cats[q.categoria] = (cats[q.categoria] || 0) + 1; });
    var html = '<option value="__todas__">Todos os temas (' + state.banco.length + " questões)</option>";
    Object.keys(cats).sort().forEach(function (c) {
      html += '<option value="' + c + '">' + c + " (" + cats[c] + ")</option>";
    });
    sel.innerHTML = html;
  }

  // ---- Início do simulado ----
  function iniciar() {
    var categoria = $("select-categoria").value;
    var quantidade = parseInt($("select-quantidade").value, 10);
    state.mostrarFeedback = $("check-feedback").checked;

    var pool = state.banco.filter(function (q) {
      return categoria === "__todas__" || q.categoria === categoria;
    });

    var selecionadas = embaralhar(pool).slice(0, Math.min(quantidade, pool.length));

    // embaralha as opções de cada questão, mantendo o controle da correta
    state.prova = selecionadas.map(function (q) {
      var opcoes = embaralhar(q.opcoes.map(function (o) {
        return { texto: o.texto, correta: o.correta };
      }));
      return {
        categoria: q.categoria,
        pergunta: q.pergunta,
        imagem: q.imagem,
        opcoes: opcoes,
        explicacao: q.explicacao,
        indiceCorreto: opcoes.findIndex(function (o) { return o.correta; })
      };
    });

    state.respostas = state.prova.map(function () { return null; });
    state.atual = 0;
    state.inicio = Date.now();

    iniciarTimer();
    hide("screen-start");
    show("screen-quiz");
    renderQuestao();
  }

  function iniciarTimer() {
    pararTimer();
    state.timerId = setInterval(function () {
      var seg = Math.floor((Date.now() - state.inicio) / 1000);
      $("quiz-timer").textContent = formatarTempo(seg);
    }, 1000);
  }
  function pararTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  // ---- Renderização da questão ----
  function renderQuestao() {
    var total = state.prova.length;
    var q = state.prova[state.atual];

    $("quiz-progress-label").textContent = "Questão " + (state.atual + 1) + " de " + total;
    $("quiz-progress-bar").style.width = ((state.atual) / total * 100) + "%";
    $("quiz-categoria").textContent = q.categoria;
    $("quiz-pergunta").textContent = q.pergunta;

    var img = $("quiz-imagem");
    if (q.imagem) {
      img.innerHTML = '<img src="' + q.imagem + '" alt="Imagem da questão" loading="lazy" />';
      img.classList.remove("hidden");
    } else {
      img.innerHTML = "";
      img.classList.add("hidden");
    }

    var ul = $("quiz-opcoes");
    ul.innerHTML = "";
    var escolhida = state.respostas[state.atual];

    q.opcoes.forEach(function (op, idx) {
      var li = document.createElement("li");
      li.className = "option";
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.innerHTML = '<span class="option__letter">' + LETRAS[idx] +
        '</span><span class="option__text">' + op.texto + "</span>";

      if (escolhida !== null) {
        // questão já respondida
        if (state.mostrarFeedback) {
          if (idx === q.indiceCorreto) li.classList.add("correct");
          if (idx === escolhida && escolhida !== q.indiceCorreto) li.classList.add("wrong");
        } else if (idx === escolhida) {
          li.classList.add("selected");
        }
      }

      li.addEventListener("click", function () { selecionar(idx); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selecionar(idx); }
      });
      ul.appendChild(li);
    });

    renderFeedback();
    atualizarNav();
  }

  function selecionar(idx) {
    // se feedback imediato está ligado e a questão já foi respondida, trava
    if (state.mostrarFeedback && state.respostas[state.atual] !== null) return;
    state.respostas[state.atual] = idx;
    renderQuestao();
  }

  function renderFeedback() {
    var fb = $("quiz-feedback");
    var q = state.prova[state.atual];
    var escolhida = state.respostas[state.atual];

    if (!state.mostrarFeedback || escolhida === null) {
      fb.classList.add("hidden");
      fb.innerHTML = "";
      return;
    }
    var acertou = escolhida === q.indiceCorreto;
    fb.className = "feedback " + (acertou ? "ok" : "err");
    fb.innerHTML = "<strong>" + (acertou ? "✓ Você acertou!" : "✗ Resposta incorreta") +
      "</strong>" + (acertou ? "" : "Correta: <b>" + LETRAS[q.indiceCorreto] + ") " +
      q.opcoes[q.indiceCorreto].texto + "</b><br>") + q.explicacao;
    fb.classList.remove("hidden");
  }

  function atualizarNav() {
    $("btn-prev").disabled = state.atual === 0;
    $("btn-next").textContent = state.atual === state.prova.length - 1 ? "Finalizar" : "Próxima";
  }

  function proxima() {
    if (state.atual < state.prova.length - 1) {
      state.atual++;
      renderQuestao();
    } else {
      finalizar();
    }
  }
  function anterior() {
    if (state.atual > 0) { state.atual--; renderQuestao(); }
  }

  // ---- Resultado ----
  function finalizar() {
    var semResposta = state.respostas.filter(function (r) { return r === null; }).length;
    if (semResposta > 0) {
      var ok = confirm("Você deixou " + semResposta + " questão(ões) em branco. Deseja finalizar mesmo assim?");
      if (!ok) return;
    }
    pararTimer();

    var acertos = 0;
    state.prova.forEach(function (q, i) {
      if (state.respostas[i] === q.indiceCorreto) acertos++;
    });
    var total = state.prova.length;
    var pct = Math.round((acertos / total) * 100);
    var minimo = state.meta.aprovacao_percentual || 70;
    var aprovado = pct >= minimo;
    var seg = Math.floor((Date.now() - state.inicio) / 1000);

    $("result-acertos").textContent = acertos;
    $("result-total").textContent = total;
    $("result-pct").textContent = pct;
    $("result-tempo").textContent = formatarTempo(seg);

    var banner = $("result-banner");
    banner.className = "result-banner " + (aprovado ? "pass" : "fail");
    banner.textContent = aprovado
      ? "🎉 Aprovado! Você atingiu o mínimo de " + minimo + "%."
      : "Não foi dessa vez — o mínimo é " + minimo + "%. Continue praticando!";

    montarRevisao();

    hide("screen-quiz");
    show("screen-result");
    window.scrollTo(0, 0);
  }

  function montarRevisao() {
    var rev = $("review");
    rev.innerHTML = "";
    state.prova.forEach(function (q, i) {
      var escolhida = state.respostas[i];
      var acertou = escolhida === q.indiceCorreto;
      var div = document.createElement("div");
      div.className = "review__item " + (acertou ? "ok" : "err");

      var html = '<p class="review__q">' + (i + 1) + ". " + q.pergunta + "</p>";
      if (escolhida === null) {
        html += '<p class="review__a user-wrong">Sua resposta: <em>em branco</em></p>';
      } else {
        html += '<p class="review__a ' + (acertou ? "right" : "user-wrong") + '">Sua resposta: ' +
          LETRAS[escolhida] + ") " + q.opcoes[escolhida].texto + (acertou ? " ✓" : " ✗") + "</p>";
      }
      if (!acertou) {
        html += '<p class="review__a right">Correta: ' + LETRAS[q.indiceCorreto] + ") " +
          q.opcoes[q.indiceCorreto].texto + "</p>";
      }
      if (q.explicacao) html += '<p class="review__exp">💡 ' + q.explicacao + "</p>";
      div.innerHTML = html;
      rev.appendChild(div);
    });
  }

  function reiniciar() {
    hide("screen-result");
    hide("review");
    $("review").classList.add("hidden");
    $("btn-toggle-review").textContent = "Ver revisão das questões";
    show("screen-start");
    window.scrollTo(0, 0);
  }

  // ---- Eventos ----
  function ligarEventos() {
    $("btn-start").addEventListener("click", iniciar);
    $("btn-next").addEventListener("click", proxima);
    $("btn-prev").addEventListener("click", anterior);
    $("btn-restart").addEventListener("click", reiniciar);
    $("btn-toggle-review").addEventListener("click", function () {
      var r = $("review");
      var aberto = !r.classList.contains("hidden");
      r.classList.toggle("hidden");
      this.textContent = aberto ? "Ver revisão das questões" : "Ocultar revisão";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ligarEventos();
    carregarBanco();
  });
})();
