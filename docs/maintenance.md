# Manutenção do perfil

O conteúdo público fica em `profile.json`. O gerador usa Node.js 24, APIs nativas e nenhuma dependência de runtime. Não é necessário executar `npm install`.

```sh
node --test
node scripts/generate.mjs
node scripts/generate.mjs --check
node scripts/update.mjs
node scripts/preview.mjs
```

- `generate` usa exclusivamente o último snapshot válido em `data/contributions.json`. Funciona sem rede e não muda a data da consulta.
- `--check` falha se houver arquivos gerados desatualizados, sem escrever.
- `update` consulta o GitHub antes de gerar. Recebe a credencial exclusivamente pela variável `GITHUB_TOKEN`, já injetada pelo ambiente. Nunca coloque tokens no JSON, em comandos versionados ou em arquivos do projeto.
- `preview` serve uma composição local em `http://127.0.0.1:4173/`. Use `?theme=dark` e o esquema escuro do navegador para revisar o tema escuro. A prévia usa os mesmos blocos `<picture>` do README; o restante é uma aproximação do layout do GitHub. `PROFILE_PREVIEW_PORT` troca a porta.

Edite apresentação, formação, disponibilidade, contatos, projetos, as quatro categorias ou as cores no JSON. Rode os testes e `generate`. Conteúdo manual deve ficar **fora** de `<!-- profile:start -->` e `<!-- profile:end -->`. A região interna é substituída; marcadores ausentes, repetidos ou invertidos causam erro. Não mantenha um segundo `readme.md` com outra capitalização.

## Caminho dos dados

1. `github.mjs`: requisição GraphQL com timeout de 15 segundos por tentativa. Até três tentativas para rede, timeout, HTTP 429/500/502/503/504, rate limit HTTP 403 identificado por cabeçalhos ou erros GraphQL transitórios. Respeita `Retry-After` em segundos até 10 segundos; esperas maiores ou formatos desconhecidos encerram a execução para tentar mais tarde. Erros de permissão e respostas inválidas não são repetidos.
2. `calendar.mjs`: valida usuário, limites, total, contagens inteiras, datas reais e todos os 365 dias consecutivos. Calcula total, dias com contagem positiva, pico e soma por mês. Empates de pico usam a **primeira data**; calendário zerado não tem data de pico.
3. `render.mjs`: gera três módulos em duas composições e dois temas, totalizando 12 SVGs. Nenhum recurso externo, script, fonte remota ou `foreignObject`.
4. `readme.mjs`: gera o texto e as imagens dentro da região delimitada. Links para código, demos e contatos ficam em Markdown clicável.
5. `pipeline.mjs`: prepara e compara todas as saídas antes da escrita; grava cada arquivo alterado por renomeação de arquivo temporário. Não é uma transação entre múltiplos arquivos em caso de queda de energia; `generate` reconstitui as saídas a partir do snapshot.

Uma falha de API, validação ou renderização acontece **antes** de qualquer escrita. O processo termina com código diferente de zero, preservando o snapshot e todas as imagens. Não há fallback com zeros nem mudança na data de consulta. Arquivos em `tests/fixtures/` pertencem ao usuário sintético `FixtureUser`; nunca são entrada da geração pública.

O snapshot contém somente login, origem, versão, datas da consulta/período e contagem por dia. Não são consultados nem armazenados nomes de repositórios privados, mensagens, autores ou eventos individuais.

## Período e autenticação

A janela inclui os **365 dias completos anteriores à data UTC da consulta**, do primeiro dia às `00:00:00Z` ao último às `23:59:59Z`, limites inclusivos da API. O dia da consulta fica de fora. O cálculo usa dias civis UTC e preserva literalmente as datas `YYYY-MM-DD` retornadas pelo GitHub; não as converte para o fuso do visitante. Um ano bissexto continua tendo uma janela de 365 datas, com o começo ajustado. Os rótulos mostram as datas efetivas, sem chamar o intervalo de ano civil ou últimos 12 meses. As barras mensais incluem meses parciais nas bordas.

`queriedOn` registra somente a data UTC de uma consulta bem-sucedida, sem hora de execução. Duas consultas no mesmo dia com a mesma resposta e duas gerações offline produzem os mesmos bytes. Uma nova consulta em outro dia pode alterar período e data mesmo se o total permanecer igual.

A consulta usa `User.contributionsCollection(from:, to:).contributionCalendar`, com `totalContributions`, `weeks.contributionDays.date` e `contributionCount`. A API GraphQL exige autenticação. O token automático de uma instalação Actions é limitado ao repositório e não equivale a um PAT pessoal. O job de verificação faz uma consulta real com o `GITHUB_TOKEN` padrão em pushes para verificar esse acesso no próprio ambiente do Actions; testes unitários continuam offline.

Verificação real em 29/10/2026: o [job de push](https://github.com/JamesonHenrique/JamesonHenrique/actions/runs/40952177360) consultou e validou o calendário com o `GITHUB_TOKEN` padrão e `contents: read`, sem secret adicional. A resposta produziu **zero arquivos alterados** em relação ao snapshot inicial. Isso confirma o funcionamento neste repositório e nesta configuração de visibilidade, sem prometer o mesmo acesso a dados privados de terceiros.

A visibilidade dos dados depende da credencial e das preferências do usuário. A documentação informa que contribuições privadas/internas dependem do escopo opcional `read:user`. Não é prometida igualdade entre o agregado de uma consulta pessoal e o de um token de instalação. O perfil mostra o que o calendário consultado retorna, sem inferir produtividade.

Se a consulta do token automático for recusada, o job falha claramente e conserva os arquivos publicados. Alternativa: criar um secret de repositório `PROFILE_READ_TOKEN` com acesso de leitura aos dados públicos (fine-grained PAT: acesso público implícito, sem permissões extras de escrita) e trocar **apenas** o token dos passos de consulta por `${{ secrets.PROFILE_READ_TOKEN }}`. O token padrão deve continuar sendo usado no checkout/push. Para contribuições privadas, um PAT clássico com `read:user` é uma alternativa documentada; não conceda `repo` para esta consulta de calendário. Nunca inclua detalhes privados no perfil.

## Atualização automática

O workflow `Profile` usa Node.js 24 e actions oficiais fixadas por SHA completo: checkout **v7.0.1** e setup-node **v7.1.0**, versões verificadas em 29/10/2026. Atualize o SHA junto com o comentário de versão após revisar a release oficial.

- Agenda diária: `17 6 * * *`, às 06:17 UTC / 03:17 em São Paulo. O GitHub pode atrasar ou deixar de executar agendamentos; em repositórios públicos sem atividade por 60 dias também pode desativá-los. O agendamento só existe depois do merge na branch padrão.
- `workflow_dispatch` permite atualizar manualmente na branch padrão. Pushes de configuração, gerador, testes ou workflow executam verificações. PRs pertinentes também executam os testes e a checagem offline.
- O job de teste só tem `contents: read` e não persiste credenciais. Somente o job de atualização tem `contents: write`; ele roda na branch padrão, testa novamente a revisão efetivamente obtida e faz commit apenas de uma lista explícita de saídas.
- Concorrência limita as execuções e serializa os escritores. Antes do commit, o workflow busca a branch remota e exige que ela ainda corresponda ao checkout. Se avançou, falha para permitir nova execução. Um push rejeitado não faz rebase automático nem force push.
- Pushes gerados por `GITHUB_TOKEN` não disparam outro workflow de push; além disso, os filtros excluem os arquivos gerados. Não há loop de atualização.

A branch `main` foi encontrada sem proteção e sem rulesets na inspeção inicial. Não se alterou nenhuma proteção. Se for exigido PR para atualizar `main` no futuro, o push automático será recusado: mantenha a proteção e adapte a atualização para uma branch de bot com PR. Até lá, gere localmente e inclua as saídas em um PR normal. Não habilite bypass para este workflow.

## Cache, acessibilidade e revisão

Cada URL recebe `?v=<sha256-do-svg>` com os primeiros 16 dígitos hexadecimais. Só o arquivo cujo conteúdo mudou recebe uma nova versão; uma alteração na apresentação não invalida o módulo de stack ou atividade. O cache intermediário do GitHub e do navegador ainda pode atrasar a exibição. O hash não garante atualização instantânea.

O GitHub documenta `<picture>` e `prefers-color-scheme`; seu endpoint Markdown preservou também as condições `max-width` desta implementação. O breakpoint fica no JSON (600px por padrão). A seleção ocorre no documento, sem depender de media query interna do SVG. Em telas pequenas há grupos de stack empilhados e barras mensais; no desktop há quatro colunas e calendário diário. O fallback é o tema claro desktop. A preferência do tema do GitHub pode interagir com a do navegador; sempre revise também o README no site.

Os módulos têm `title`, `desc`, `viewBox`, fundo próprio e `alt`. Formação, disponibilidade, tecnologias, projetos, contatos e métricas essenciais existem em texto real no README. O gerador escapa XML e Markdown, limita entradas e quebra textos longos; alterações extensas ainda devem passar por revisão visual.

Na implementação foram revisadas capturas Chromium em **1100px, 390px e 320px**, em claro e escuro, e os limites de todos os textos dos 12 SVGs. As capturas locais não fazem parte da atualização diária. Os testes usam somente APIs nativas do Node; Playwright foi ferramenta de revisão do ambiente, sem dependência adicionada ao projeto.

Fontes oficiais: [GraphQL e autenticação](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql), [campos de usuários e contribuições](https://docs.github.com/en/graphql/reference/users), [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), [imagens responsivas](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github), [eventos agendados](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0).
