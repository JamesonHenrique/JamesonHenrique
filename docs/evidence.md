# Fontes e decisões editoriais

Inspeção em **29/10/2026**. Este documento registra evidências, limitações e decisões; não é uma certificação das tecnologias nem um histórico de emprego.

## Informações pessoais

Nome, Natal/RN, graduação em TI na UFRN em andamento, busca de oportunidades e direção Full Stack foram informados pelo próprio Jameson para esta reformulação. O README anterior confirma formação, base Java/Angular e uso de Make/n8n, mas sua descrição de atuação em LegalOps estava no presente. A reformulação não afirma vínculo atual com Duarte e Almeida, não atribui clientes/resultados e não reutiliza a contagem antiga de sistemas integrados. Não foi necessário mencionar o estágio anterior.

O LinkedIn foi informado por Jameson e já estava no README. O servidor devolveu **HTTP 999**, bloqueando a validação automatizada do conteúdo. Foi preservada a URL conhecida, sem afirmar que a página foi lida. Não foi publicado e-mail, pois não era necessário ao posicionamento e sua validade atual não foi confirmada.

## Seleção de projetos

- **[Newgram](https://github.com/JamesonHenrique/Newgram/tree/f07d5b5856441e9c43e6e1dfe93c1a2b84b6cd46)**: melhor evidência pública da stack central. `pom.xml` confirma Java **21** e Spring Boot **3.5.4**, embora badges do README citem versões antigas. `newgram-ui/package.json` confirma Angular **19**. Serviços, controladores, Spring Security/JWT, PostgreSQL/Flyway, Dockerfile e `S3StorageService.java` sustentam as tecnologias e funcionalidades selecionadas. O código usa AWS SDK S3 e URLs pré-assinadas; isso sustenta mencionar S3, sem alegar operação ampla em AWS. A [interface online](https://newgram-nine.vercel.app/) respondeu **200**. Não foi validado um fluxo autenticado nem a disponibilidade do backend; por isso o link é chamado “Interface online”.
- **[Help My Desk](https://github.com/JamesonHenrique/helpmydesk/tree/a1f7e5a66d524a8b2b469b9a882fda8be1b27cdf)**: implementação pública com workspace Rust, crates de diagnóstico/política/execução, testes e interface Angular sobre Tauri. `apps/desktop/ui/package.json` confirma Angular **22.2.1**. O README descreve aprovação de correções, builds Linux/Windows e limitações do estágio atual. Apresentado como **em desenvolvimento**, sem prometer produto final ou capacidades universais.
- **[OportunizaVaga](https://github.com/JamesonHenrique/OportunizaVaga/tree/7f40045eb7676374e44ffafd84e5edcd5d9a4cd9)**: o produto atual inclui `bot/`, testes e `monitor/`. O monitor é parte do produto, com Next.js/React e endpoints de status, não um quarto projeto separado. O antigo remote local `JamesonHenrique/monitor` devolveu **404**; isso não prova sua história ou visibilidade, apenas indisponibilidade no acesso atual. A [demo oficial](https://oportunizavaga-demo.vercel.app/) respondeu **200** e é explicitamente identificada como **dados fictícios**. Nenhuma automação de candidatura foi executada na investigação.
- **[n8n Telegram Multitool](https://github.com/JamesonHenrique/n8n-telegram-multitool-bot)**: README, export de workflow e documentação sustentam uso de n8n, APIs de documentos, transcrição e tratamento de erros. Mantido como evidência de stack, sem acrescentar um quarto destaque para preservar leitura rápida.
- **User-Management** redireciona para **[UserLite](https://github.com/JamesonHenrique/UserLite)**; a documentação descreve um CRUD Spring/Hibernate mais simples. Newgram demonstra a mesma direção com maior amplitude. **Painel de Máquinas** não foi identificado entre os repositórios públicos listados nem pelo nome candidato consultado; não se inventou link.

Make e integrações constavam no README anterior e no contexto confirmado pelo usuário; não foram publicados contratos, clientes ou arquivos de automações privadas. Codex/MCP têm uso confirmado no ambiente de desenvolvimento; entram como **ferramentas**, sem associação com especialização em machine learning. Rust aparece no projeto Help My Desk, não como eixo principal de posicionamento.

## Referência e originalidade

Referência: [nandomoreirame/nandomoreirame](https://github.com/nandomoreirame/nandomoreirame/tree/224c0501b3234f44348de66e4e037a6b61ba0a99), branch padrão **master**.

A implementação consultada contém três SVGs, `profile.json` com quatro grupos, `scripts/cards.mjs`, `scripts/update-profile.mjs`, testes `node --test`, `preview.html` e workflow às **06:17 UTC** com Node.js **24**, sem dependências de runtime. As imagens usam a mesma versão baseada em data/total, o workflow usa actions v4 sem SHA e a requisição usa o intervalo padrão da API. Não foram observados timeout, retries ou snapshot persistente; o README é substituído inteiro. Isso confirmou a inspiração arquitetural e orientou melhorias de confiabilidade, sem tratar a descrição inicial como contrato.

Não há `LICENSE` na árvore consultada e a API não reconhece licença. Ausência de licença não concede autorização de reutilização: **nenhum código, SVG, texto biográfico ou identidade visual foi copiado**. Esta implementação foi escrita do zero. O crédito acima registra a inspiração da arquitetura.

A identidade usa uma sequência editorial de três módulos, divisórias, tipografia sem recursos externos e roxo com contraste em fundos próprios. Não há animação, badges ou indicadores de proficiência. O celular usa outra composição e outra visualização de atividade; o texto essencial e os links continuam no Markdown.
