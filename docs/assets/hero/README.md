# Capa editorial da landing page

Nova composição com uma mão humana e uma robótica movendo cartões no mesmo quadro.
Arte gerada por imagegen nativo em 6/9/2026, sem tipografia, logotipos ou interface
falsa. Os prompts completos estão em [prompts.md](prompts.md).

## Composição desktop aprovada

Em 6/9/2026, o usuário escolheu `.test-artifacts/desktop-source.jpg` e aprovou
o resultado local para publicação. A cópia usada pela página é
`apps/web/public/img/hero-cover-desktop-preview.jpg`: 1921 × 916, 240.603 bytes,
sem recompressão ou alteração de cor. O nome `preview` foi preservado para não
mudar a referência já validada; não representa um ambiente de staging.
SHA256: `9048d10a07d6eb3f1362d3ccb709d7f49afd9bfd53247d8a6b41df6b5fbe936f`.

O desktop usa esse JPEG; mobile/tablet continuam com a composição independente
em WebP/JPEG abaixo de 1024px. Os masters desktop abaixo documentam a primeira
opção de enquadramento, preservada para comparação, não a arte desktop ativa.

## Masters e grade da primeira opção

- `desktop-source.png`: geração original 1717 × 916.
- `desktop-master.png`: 1920 × 916, montado pela skill capa-hero. Coluna 1152 px,
  centro visual manual 1225 na origem, alvo 1248 no master, deslocamento +23 px.
  A medição de bordas incluiu a textura da mesa e não representou o sujeito.
  Vãos laterais de 23/180 px preenchidos com geração nativa; `fechar` restaurou
  89,4% dos pixels originais. Não foi esticada a textura da borda.
- `mobile-source.png`: composição independente para a faixa acima do texto,
  aprovada como direção pelo usuário, não um recorte da desktop.
- `mobile-master.png`: 800 × 640, mantém a proporção da composição mobile.

## Derivadas

Na raiz do repositório, com Pillow instalado:

```bash
python docs/assets/hero/build.py
```

Gera as derivadas da primeira opção desktop e do mobile, sem sobrescrever o JPEG
desktop escolhido pelo usuário. Desktop: 1280/1536/1920; mobile: 480/800.
Conversão local, sem nova chamada de IA ou upload
para compressor externo. WebP principal até 49 KB; JPEG fallback até 139 KB.
Sem aumento de resolução, sharpening ou alteração de contraste.

O teto da opção ativa é 1921 px no desktop e 800 px no mobile. Não há correspondência
de um pixel de arquivo por pixel físico em um desktop 1440 px/DPR 2 ou celular
390 px/DPR 3; nesses casos o navegador usa a maior derivada disponível. A prévia
nessas densidades foi conferida no Chromium, sem download duplicado ou overflow.
A nitidez final ainda pode ser validada pelo usuário no dispositivo físico.

## Validação local

O arquivo `apps/web/e2e/public-pages.spec.ts` passou nos 17 testes públicos,
incluindo larguras 320/390/820/1024/1280/1440/1920, temas claro/escuro, ausência
de JavaScript, tamanho calculado do H1 e contraste dos textos e botões da hero.
Build e typecheck da web e Biome dos arquivos alterados também passaram.
Guias da capa-hero foram conferidas sobre screenshots 1280/1440/1920; um probe
adicional confirmou foco visível e ordem dos CTAs em 390/DPR 3 e 1440/DPR 2.

Cross-plan: uma rodada com Opus 5 high. Cross-review `--lite`: uma rodada com
o mesmo modelo, aprovada com ressalvas e sem bloqueadores. A revisão independente
mediu contraste mínimo de 7,05:1 nas linhas de texto contra o fundo renderizado.
Esse parecer tratou da primeira opção desktop; não é uma medição de contraste
do JPEG escolhido depois. O `srcSet` WebP mobile e a URL JPEG desktop são
centralizados para manter preload e picture sincronizados. Em dev, os preloads
ficam no body; não se presume antecipação
de download por hoisting para o head. Os probes confirmam uma requisição de arte.

| Elemento | Antes | Depois |
| --- | --- | --- |
| Capa | Imagem enquadrada ao lado da copy | Full-cover desktop; faixa antes da copy no mobile/tablet |
| H1 | Clamp anterior | Mesma frase, 85% do tamanho em todos os breakpoints |
| Copy | Versão hospedada ainda por lançar | Produto disponível, recursos atuais e limites reais |

Os masters e fontes não entram na imagem Docker: ficam em `docs/assets/hero`,
fora do allowlist de fonte operacional. O navegador recebe o JPEG escolhido
e as derivadas mobile.
As imagens `quadro-*` antigas foram preservadas para comparação/rollback local.

É intencional manter as fontes e masters PNG (aproximadamente 6,6 MB) junto do
script e dos prompts para reprodutibilidade, fora da imagem operacional do app.
Antes de um futuro commit, incluir explicitamente essas fontes e os assets
`hero-cover-*` no versionamento. Para a publicação autorizada, os arquivos públicos
entraram no pacote saneado com manifesto de hashes e build Docker de uma extração
limpa, sem depender do índice Git. O índice real do usuário segue preservado,
sem stage ou commit.

A publicação da escolha final foi autorizada explicitamente pelo usuário em 6/9.
O registro operacional da liberação fica em `docs/evidence/`.
