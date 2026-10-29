# Tipografia do perfil

O perfil usa **Space Grotesk 650** em títulos e números, **Manrope 500/650** no texto e **IBM Plex Mono 500** em terminal e rótulos técnicos. As famílias são distribuídas sob SIL OFL 1.1. Os avisos originais estão nos três arquivos `*-OFL.txt`; as mesmas licenças são incorporadas aos metadados de cada SVG.

`atlas.json` contém contornos e avanços dos glifos usados pelo renderizador. É um subconjunto vetorial para documentos SVG, não um arquivo de fonte instalável. O Node lê esse JSON e gera referências locais a paths, sem `@font-face`, fonte remota, base64 ou dependência de runtime. A aparência independe das fontes instaladas no visitante. `alt`, `title`, `desc` e rótulos dos grupos preservam a informação textual para acessibilidade.

Os pesos e as famílias são selecionados em `profile.json → typography`. A fonte de cada função tipográfica deve ser uma das quatro faces já contidas no atlas (`display`, `body`, `strong`, `mono`). O atlas cobre ASCII, Latin-1 e pontuação adicional, incluindo os acentos de português. Caracteres sem glifo causam erro explícito antes da gravação; não são substituídos por quadrados silenciosamente.

## Reconstrução opcional

Não é preciso reconstruir o atlas para editar o perfil, gerar os SVGs, testar ou executar a Action. Para trocar as fontes ou expandir os caracteres:

```sh
python3 -m venv .font-tools
.font-tools/bin/pip install -r scripts/font-requirements.txt
.font-tools/bin/python scripts/build-fonts.py
node --test
node scripts/generate.mjs
```

O builder só baixa os TTFs registrados em `sources.json`, verifica SHA-256 e usa fonttools 4.60.1 para fixar pesos e extrair contornos. Os fontes são temporários; nenhum é instalado no sistema. O commit de origem, os caminhos e os hashes estão fixados no manifesto. Revise o manifesto e mantenha os avisos de licença se trocar os fontes. A Action diária não executa Python nem instala fonttools.

Fontes oficiais: [Space Grotesk](https://github.com/floriankarsten/space-grotesk), [Manrope](https://github.com/sharanda/manrope), [IBM Plex](https://github.com/IBM/plex) e [Google Fonts na revisão usada](https://github.com/google/fonts/tree/6157dfaa640ca5738b4d1a7070fe389c3036d7fc).
