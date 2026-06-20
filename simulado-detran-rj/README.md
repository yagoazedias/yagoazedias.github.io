# Simulado DETRAN-RJ — Exame Teórico

Simulado de prática para o exame teórico do DETRAN-RJ. Site **estático**, sem
build e sem dependências (HTML + CSS + JavaScript puro).

> ⚠️ **As questões deste projeto não são as questões oficiais do DETRAN-RJ.**
> São questões **autorais**, elaboradas com base no Código de Trânsito Brasileiro
> (Lei nº 9.503/1997) e nas resoluções do CONTRAN. Desde a atualização recente,
> a prova oficial segue o **Banco Nacional de Questões da SENATRAN**, que não é
> publicado como um conjunto de dados de uso livre — por isso não é reproduzido
> aqui. Para a prova oficial gratuita, use o app **CNH Brasil** (Governo Federal)
> e o simulador oficial em `simulado.detran.rj.gov.br`.

## Estrutura

```
simulado-detran-rj/
├── index.html        # interface do simulado
├── css/style.css     # estilos
├── js/app.js         # lógica (carrega o banco, embaralha, corrige, revisa)
├── data/questions.json   # banco de questões (edite só este arquivo)
└── README.md
```

## Projeto isolado / como mover para um repositório próprio

Esta pasta é **totalmente autossuficiente**: não depende do Jekyll nem do tema
do blog e usa apenas caminhos relativos. Para transformar em um repositório
dedicado, basta:

1. Copiar o **conteúdo desta pasta** para a raiz de um novo repositório.
2. Habilitar GitHub Pages (Settings → Pages → *Deploy from branch* → `main` / `/root`).

Funciona em qualquer hospedagem de arquivos estáticos (GitHub Pages, Netlify,
Vercel, S3, etc.). Para testar localmente, sirva a pasta por HTTP
(ex.: `python3 -m http.server`) — abrir o `index.html` direto do disco bloqueia
o carregamento do JSON pelo navegador.

## Como editar/atualizar as questões

Edite apenas `data/questions.json`. Cada questão tem o formato:

```json
{
  "id": 1,
  "categoria": "Legislação de Trânsito",
  "pergunta": "Texto da pergunta?",
  "opcoes": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
  "resposta": 2,
  "explicacao": "Por que a alternativa C (índice 2) está correta."
}
```

- `resposta` é o **índice** (começando em 0) da alternativa correta em `opcoes`.
- As alternativas são embaralhadas automaticamente a cada simulado.
- O critério de aprovação fica em `meta.aprovacao_percentual` (padrão: 70%).

Se você obtiver um banco de questões **licenciado** para uso, basta substituir
o `questions.json` mantendo esse formato — nada mais precisa mudar.

## Categorias cobertas

Legislação de Trânsito · Direção Defensiva · Primeiros Socorros ·
Meio Ambiente e Cidadania · Mecânica Básica · Sinalização.
