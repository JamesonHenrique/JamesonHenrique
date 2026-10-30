# Manutenção

O README é composto exclusivamente por três SVGs: `assets/profile-header.svg` (960×308), `assets/contributions.svg` (960×327) e `assets/tech-ecosystem.svg` (960×236). A composição segue o perfil de [nandomoreirame](https://github.com/nandomoreirame/nandomoreirame), com dados próprios de Jameson. O código foi implementado localmente; a referência consultada não declara licença de reutilização.

A estrutura de três painéis aprovada foi preservada. A identidade atual usa preto com matiz violeta, roxo/lilás, grid discreto, monograma derivado do nome e bordas suaves. Space Grotesk, Manrope e IBM Plex Mono são incorporadas como contornos vetoriais, com licenças OFL preservadas: não dependem de fontes instaladas ou carregamento externo. Consulte [a manutenção das fontes](../fonts/README.md).

O README continua mostrando três painéis. O desktop mantém os três SVGs principais; `assets/mobile/` contém três versões específicas para telas pequenas. O `<picture>` escolhe a versão conforme o breakpoint de `profile.json`. No celular, apresentação empilhada, métricas em duas colunas, calendário diário em duas faixas e stack em 2×2. A adaptação exige arquivos extras, mas evita reduzir as quatro colunas até ficarem ilegíveis. O carrossel tem alternativa estática para movimento reduzido.

## Editar, testar e gerar

Requer Node.js 24, sem dependências de runtime e sem `npm install`.

```sh
node --test
node scripts/generate.mjs
node scripts/generate.mjs --check
node scripts/update.mjs
node scripts/preview.mjs
```

Edite `profile.json`: nome, apresentação, formação, contato, terminal, stack e cores. As quatro categorias estão em `stack.groups`: IA e agentes, frontend, backend e dados, cloud e sistemas. Três linhas por cartão mantêm a composição desktop de 236px. Se houver mais linhas, a altura cresce automaticamente em vez de esconder tecnologias. Cores visuais vêm de `themes.dark`, incluindo cores secundárias, superfície dos cartões e grid; `typography` seleciona as faces do atlas. Os dados pessoais completos estão nos textos alternativos e nas descrições internas das imagens.

`generate` funciona offline a partir de `data/contributions.json` e não muda a data da consulta. `--check` apenas verifica se as saídas estão atualizadas. `update` consulta a API antes de gerar e recebe o token exclusivamente por `GITHUB_TOKEN`. Não coloque credenciais no JSON, nos testes ou em arquivos versionados. `preview` serve o próprio HTML do README em `http://127.0.0.1:4173/`; `PROFILE_PREVIEW_PORT` muda a porta.

A região `<!-- profile:start -->` / `<!-- profile:end -->` é gerada. O código preserva conteúdo externo a esses marcadores; o README atual não contém conteúdo externo, para permanecer apenas com os três SVGs. O cabeçalho inteiro é um link para o LinkedIn, e o calendário é um link para o GitHub. Links internos de SVG não são necessários.

## API, dados e determinismo

`scripts/github.mjs` faz uma consulta GraphQL oficial que retorna o calendário e até 30 repositórios **públicos**, de propriedade do usuário, ordenados por último push. O cabeçalho seleciona até cinco repositórios, excluindo forks, arquivados e o próprio repositório de perfil. Nome e data de push são reais. Não são consultados nomes de repositórios privados, conteúdo de commits ou eventos individuais.

A janela do calendário contém os **365 dias completos anteriores à data UTC da consulta**, com início às 00:00:00Z e fim às 23:59:59Z, ambos inclusivos. As datas `YYYY-MM-DD` da API são preservadas sem conversão para o fuso do visitante. Ano bissexto não muda o número de datas da janela. O desenho indica o intervalo efetivo e a última data de consulta bem-sucedida. A data não é renovada numa geração offline.

O snapshot guarda contagem e nível oficial de intensidade por dia, além dos cinco repositórios públicos necessários ao carrossel. Os testes usam `FixtureUser` e dados isolados, nunca publicados como estatísticas reais. Empates no pico usam a primeira data; um calendário vazio não tem data de pico. Contribuições não medem produtividade ou experiência.

Há timeout de 15 segundos e até três tentativas para erros de rede, timeout, HTTP 429/500/502/503/504, rate limit identificado por cabeçalhos e erros GraphQL transitórios. `Retry-After` em segundos é respeitado até 10 segundos; intervalos maiores ou desconhecidos encerram a execução para tentar mais tarde. Erros HTTP, erros GraphQL com HTTP 200, JSON inválido, calendário incompleto ou usuário incorreto falham antes da gravação. Não há substituição por zeros: o último snapshot e os SVGs são preservados.

A API exige autenticação. O `GITHUB_TOKEN` padrão com `contents: read` foi validado em execuções reais deste repositório, inclusive após os merges das primeiras versões. O job de push também verifica a consulta real. Dados dependem da visibilidade da credencial e das configurações do usuário; não é prometida igualdade com toda atividade privada do perfil.

O pipeline calcula e compara todas as saídas antes de gravar. Cada arquivo é substituído por renomeação de temporário; não há transação global em caso de interrupção do sistema. Rode `generate` para reconstituir saídas a partir do snapshot.

As URLs usam `?v=<data-da-consulta>-<total>-<hash-do-svg>`. Data/total seguem o formato da referência; o hash também cobre mudanças visuais e do carrossel. Não há hora de execução nem `Date.now()` na renderização. Entradas idênticas produzem os mesmos bytes. O cache do GitHub e do navegador ainda pode atrasar a atualização visual.

## Actions

Agenda: **`17 6 * * *`**, 06:17 UTC / 03:17 em São Paulo. O GitHub pode atrasar agendamentos; repositórios públicos inativos também podem ter a agenda desabilitada. Há `workflow_dispatch`, verificações em pushes pertinentes e PRs.

O workflow usa Node.js 24, `node --test`, actions oficiais fixadas por SHA completo (checkout v7.0.1 e setup-node v7.1.0), timeout e concorrência. O job de testes tem apenas `contents: read`. O escritor tem `contents: write`, roda só na branch padrão, testa a revisão obtida e adiciona explicitamente README, snapshot e os três SVGs. Se não houver mudanças, não commita. Se a branch avançar, falha antes do push; não usa force push, rebase automático ou bypass de proteção. Os filtros excluem saídas geradas e o token padrão evita loops de push.

Se a branch passar a exigir PR, mantenha a proteção e adapte o escritor para uma branch de bot com PR. Não enfraqueça as regras da `main`.

Fontes: [campos GraphQL](https://docs.github.com/en/graphql/reference/users), [autenticação GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql), [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), [agenda do Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Composições de tela e tipografia

As condições de largura pertencem ao `<picture>` do README, com SVGs distintos para desktop e celular. Não há dependência de media queries internas do SVG responderem à largura da página, JavaScript, fragmentos de viewport ou `foreignObject`. `prefers-reduced-motion` é a media query interna de acessibilidade.

Foi testada uma alternativa com duas vistas no mesmo SVG para manter três arquivos, mas o WebKit não respeitou a proporção móvel com URLs versionadas. A solução com `assets/mobile/` foi escolhida por funcionar de forma consistente nos três motores testados.

O painel de atividade preserva o estilo de calendário da referência, com números compactos e tipografia sem rótulos monoespaçados. No celular, as semanas são divididas em duas faixas; cada data aparece exatamente uma vez, com a mesma contagem e intensidade do desktop. O período e a data de consulta são os mesmos nas duas composições.

O gerador mede avanços reais dos glifos para cortar nomes longos de repositórios e quebrar linhas no celular. Referências `<use href="#font-…">` são internas e todos os glifos necessários são incluídos em `<defs>`. O metadata de cada SVG contém as licenças das famílias. Arquivos em `fonts/` acionam os checks de geração no Actions.

Foram executadas capturas em Chromium em desktop, 390px e 320px e validação da vista móvel também em Firefox e WebKit, sem pedidos de fontes externos; o contraste mínimo calculado das cores de texto nas superfícies do tema foi 6,77:1. O uso de contornos aumenta os SVGs em relação à versão com fontes de sistema, em troca de tipografia consistente. O fallback para navegadores sem suporte a `<picture>` é a vista desktop.

A seleção de imagens usa o `<picture>` suportado pelo Markdown do GitHub; o fallback é sempre o SVG desktop.
