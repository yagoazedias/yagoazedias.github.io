# Habit Tracker

PWA simples para acompanhar hábitos: calendário mensal com os dias cumpridos e
lembretes via **service worker** no horário definido por você. Sem backend — os
dados ficam no `localStorage` do navegador e o app funciona offline.

Hospedado como subpasta deste site, em `https://blog.yagoazedias.com/habits/`.

## Funcionalidades

- ✅ Crie vários hábitos (nome, emoji, cor e horário de lembrete)
- 📅 Calendário mensal: clique num dia para marcar/desmarcar como cumprido
- 🔥 Sequência (streak), total de dias e contagem do mês
- 🔔 Lembretes agendados via service worker no horário escolhido
- 📴 Funciona offline (assets em cache) e é instalável (PWA)

## Como rodar localmente

Service workers e notificações exigem **HTTPS** ou `localhost`. Abrir o arquivo
direto (`file://`) não funciona.

Pelo Jekyll do site (a partir da raiz do repositório):

```bash
bundle exec jekyll serve
# acesse http://localhost:4000/habits/
```

Ou servindo só esta pasta:

```bash
cd habits && python3 -m http.server 8000
# acesse http://localhost:8000
```

## Deploy

O site já publica via GitHub Pages (HTTPS) ao dar merge na branch `main`. Como o
Pages serve em HTTPS, o service worker e as notificações funcionam direto, sem
configuração extra. Esta pasta é copiada como conteúdo estático pelo Jekyll.

## Sobre as notificações — leia isto

Disparar uma notificação agendada **com o app totalmente fechado** é uma
limitação real da plataforma web:

- **Chrome/Edge (principalmente Android), com o app instalado:** usa a
  [Notification Triggers API](https://developer.chrome.com/docs/capabilities/web-apis/notification-triggers)
  (`TimestampTrigger`), que agenda a notificação no dispositivo e dispara mesmo
  com o navegador fechado.
- **Demais navegadores (Firefox, Safari):** não há `TimestampTrigger`. O app cai
  num fallback com `setTimeout`, que **só dispara enquanto a aba/app está aberta**.

Para lembretes 100% confiáveis com o app fechado em qualquer dispositivo, seria
necessário **Web Push** (servidor com chaves VAPID + agendador) — fora do escopo
desta versão sem backend.

## Estrutura

```
habits/
  index.html              # UI
  manifest.webmanifest    # PWA
  sw.js                   # service worker (cache + notificationclick)
  css/style.css
  js/app.js               # estado, calendário e agendamento de lembretes
  icons/icon.svg
```
