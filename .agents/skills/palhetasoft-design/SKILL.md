---
name: palhetasoft-design
description: Use sempre que for criar ou ajustar qualquer interface do Palheta Soft: tela, rota, página, modal, formulário, tabela/grid, card, card de indicador (KPI), botão, estado vazio, componente novo em src/components/ui ou refatoração visual de um existente. Também ao escrever ou revisar qualquer texto que aparece na tela (título, rótulo, dica, ajuda, estado vazio, erro), ao mexer em cor, tamanho de fonte, espaçamento, raio, sombra, transição ou layout (grid, flex, colunas), ao escrever filtro, paginação, busca ou qualquer ação que espere o Supabase (consulta, submit, salvar, excluir), ao pedir confirmação de qualquer ação (excluir, inativar, cancelar, fechar caixa; nunca window.confirm), e antes de declarar uma feature de UI pronta.
---

# palhetasoft-design: verificação de design de toda feature nova

## As seis regras que não se negociam

Antes de qualquer outra coisa neste documento. Se você ler só isto, leia isto.

**1. A tela mora num card raiz, cada seção mora num card, e só existem esses dois níveis.**
Toda tela é um `<Card variant="flat" className="flex flex-col gap-5">` com `PageHeader`
no topo. Dentro dele, cada seção (filtro, formulário, listagem, estado vazio) é um `Card`
próprio, e cada indicador é um `StatCard`. **Seções** empilham uma embaixo da outra.
**Coisas do mesmo tipo** (indicadores, caixas abertos, campos de formulário, produtos de
catálogo) vão em **grade responsiva**, nunca numa coluna única esticada no desktop.
**Nunca card dentro de card:** nada de um card "Caixas abertos" contendo um card por caixa
contendo um bloco cinza com o valor. Detalhe em "Regra estrutural" abaixo.

**2. Tamanho de fonte só com as classes `typo-*`, e a hierarquia nunca se inverte.**
Cada papel tem a sua classe (tabela em "Tipografia") e os componentes já aplicam a deles:
o `PageHeader` desenha o título da tela, o `Card` desenha o título da seção, o `StatCard`
desenha rótulo e valor do indicador. **Use esses componentes e você não decide tamanho.**
**Proibido** `text-xs`, `text-sm`, `text-lg`, `text-xl`, `text-2xl` … `text-9xl`,
`text-[NNpx]`, `style={{ fontSize }}` e `font-bold`/`font-extrabold`. A régua, do maior
para o menor: título da tela (24px) > valor de indicador (20px) > título de seção (17px) >
texto, célula, botão (14px) > rótulo e legenda (12px). Título de seção menor que o texto
que ele nomeia, ou valor maior que o título da tela, é a hierarquia invertida que esta
regra existe para pegar.

**3. Cor só de token, e a tela funciona a 320px e no desktop.** Cor vem das classes geradas
pelo `@theme` (`bg-primary`, `text-ink-muted`, `border-hairline`…). Nenhum hexadecimal à
mão (`bg-[#0075de]`, `style={{ color: '#…' }}`), nenhuma cor da paleta padrão do Tailwind
(`bg-blue-500`, `text-gray-600`, `bg-red-50`), nenhum valor do `DESIGN.md` copiado cru.

**4. Toda ação que consulta o Supabase ou demora mostra "Carregando...", obrigatoriamente.**
Abrir a tela, trocar filtro, buscar, paginar, salvar, excluir, exportar: do clique até a
resposta, a região afetada mostra `LoadingState` (`src/components/ui/loading-state.tsx`) ou
o `loading` do `Button`. **O lugar da espera é a posição do que muda:** filtro ou busca →
o conteúdo do card de resultado; abertura da tela → o corpo do card raiz; botão → o próprio
botão; modal → o corpo do modal. Clique que não muda nada na tela até o servidor voltar é
defeito. Detalhe em "Carregamento" abaixo.

**5. Toda confirmação é o `ConfirmModal` do sistema, nunca `window.confirm()`.** Excluir,
inativar, cancelar, fechar caixa, descartar: `ConfirmModal` de
`src/components/ui/confirm-modal.tsx`, com título em pergunta, descrição da consequência,
botão com o verbo e `loading` durante a espera. `confirm()`/`alert()`/`prompt()` nativos e
modal de confirmação escrito dentro da tela são proibidos. Detalhe em "Confirmação" abaixo.

**6. Texto da tela escrito como gente fala, sem nome técnico.** Sem travessão (—, –) nem
hífen duplo (--). Sem frase que narra a tela. Nenhum nome de tabela (`cash_movements`) nem
ENUM cru (`bleed_outflow`) na tela: tudo passa por `src/lib/domain-labels.ts`. Detalhe em
"Texto da interface" abaixo.

As regras 1 e 2 são as que mais escapam. Erros reais já entregues neste projeto:

- **Caixa:** card raiz → card cinza "Caixas abertos" → card branco do caixa → bloco cinza
  com o valor. Quatro cascas para mostrar um número. Certo: cada caixa é um `Card` de
  nível 2, direto na raiz, numa grade.
- **Títulos de seção em 12px**, menores que a célula da tabela e que o texto do botão.
  Certo: `title` do `Card`, que já sai em `typo-heading-3`.
- **PDV:** catálogo de produtos como tabela com rolagem horizontal, filtros de categoria do
  tamanho do botão principal e pintados de azul, e o pedido escondido lá embaixo. Certo:
  `TileButton` em grade, `ChoiceChips` nos filtros e o pedido ao lado (ver "Telas de
  operação").
- **Indicadores empilhados** um embaixo do outro no desktop, e `text-3xl` no valor. Certo:
  `StatCard` em grade.

As tabelas abaixo existem para que você não precise decidir.

## O que este documento resolve

O projeto tem **duas** fontes de design e elas não falam a mesma língua:

| Fonte | Autoridade sobre | Nunca manda em |
|---|---|---|
| `src/styles/tokens.css` + `src/components/ui/` | **Os valores.** Cor, tamanho de fonte, raio, sombra, espaço, e a anatomia de cada componente. | Composição. |
| `DESIGN.md` (análise do Notion) | **A composição.** Calma de documento, uma ação azul por tela, paleta de adesivos só decorativa, profundidade por hairline. | Valores. |

**A regra de precedência, em uma frase:** a composição vem do `DESIGN.md`, os valores vêm de
`tokens.css` e dos componentes. Nenhum hexadecimal, px de fonte ou raio do `DESIGN.md`
entra no código. Cada um passa pela tabela de [traducao.md](traducao.md) antes.

O `DESIGN.md` foi extraído de um site de marketing. Os 40px, 54px e 64px dele, os botões
pílula enormes e a faixa "night" de largura cheia não aproximam o Palheta Soft da
referência: só estouram um ERP que o dono do estabelecimento usa o dia inteiro. O que se
importa é o **comportamento** do sistema.

## Antes de escrever a primeira linha

1. Leia `src/components/ui/index.ts`. Tudo que está exportado ali é o que você usa. Não
   recrie botão, card, indicador (`StatCard`), chips de escolha (`ChoiceChips`), ladrilho
   (`TileButton`), input, select, modal, tabela, tooltip, badge ou alerta.
2. Abra uma tela pronta parecida com a sua e siga a mesma anatomia:
   `src/app/(erp)/dashboard/dashboard-client.tsx` (indicadores + resumo + tabela),
   `src/app/(erp)/caixa/caixa-client.tsx` (um card por coisa, em grade),
   `src/app/(erp)/pdv/pdv-client.tsx` (tela de operação: catálogo + pedido lateral) e
   `src/app/(erp)/despesas/expenses-client.tsx` (filtro + formulário + listagem).
   Se a tela que você abriu contradiz esta skill, a skill vence.
3. Leia no `DESIGN.md` a seção `## Components` do componente análogo e `## Do's and Don'ts`.
4. Traduza cada valor do `DESIGN.md` com [traducao.md](traducao.md).
5. Só então escreva.

Componente novo que não existe em `src/components/ui/`? Crie-o ali, exporte em `index.ts`,
use só tokens, e veja "Referências de outros projetos" no fim deste documento.

## Regra estrutural: o que empilha e o que vai em grade

Esta é a regra que mais deu errado. Leia a tabela inteira.

| Elemento | Componente e layout | Classe da grade |
|---|---|---|
| **Seções da tela** (header, faixa de indicadores, filtro, formulário, listagem) | `Card` de seção, empilhados, em qualquer largura | card raiz `flex flex-col gap-5` |
| **Indicadores / KPI** | `StatCard`, em grade direto na raiz. 1 coluna no celular, 2 a 4 no desktop | `grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]` |
| **Coisas com ações próprias** (caixas abertos, pontos de venda, cartões de funcionário) | Um `Card` de nível 2 **por coisa**, em grade **direto na raiz**. Sem card "pai" em volta | `grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]` |
| **Catálogo de escolha rápida** (produtos do PDV, serviços) | `TileButton` dentro do card de seção | `grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))]` (`auto-fill`: poucos itens não viram ladrilhos gigantes) |
| **Campos de formulário e de filtro** | `Input`/`Select` em grade. Campo longo (observação, endereço) ocupa a linha com `col-span-full` | `grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]` |
| **Escolha entre poucas opções** (categoria, Hoje/Mês, pagamento único/dividido) | `ChoiceChips` | o componente já faz `flex-wrap` |
| **Botões de ação** de um formulário, filtro ou card | Linha que quebra, à direita | `flex flex-wrap justify-end gap-2` |
| **Pares rótulo/valor** dentro de um card (PIX, débito, crédito) | `<dl>` em grade, separada por `border-t border-hairline pt-3` | `grid gap-3 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]` |

**O que é proibido:**

- Duas **seções** lado a lado (formulário à esquerda e tabela à direita em `grid-cols-2`,
  `lg:flex-row` entre seções). Seção empilha.
- **Itens repetidos ou campos** numa coluna única no desktop (`flex flex-col` com quatro
  KPIs, oito inputs de largura cheia a 1440px). Coluna estreita esticada numa tela larga
  é tão errado quanto seções lado a lado.
- Contagem de coluna fixa sem pensar no celular (`grid-cols-4` puro). Use `auto-fit`, ou
  então `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`, nunca começando acima de 1 coluna.
- Cards de mesma altura forçada (`h-full` em todos para igualar). Deixe o conteúdo ditar
  a altura.

```tsx
// Anatomia padrão: raiz em flex-col; seções empilhadas; dentro das seções, grade.
<Card variant="flat" className="flex flex-col gap-5">
  <PageHeader
    title="Painel Financeiro"
    helpTitle="Como ler o Painel Financeiro"
    helpText="Acompanhe o saldo realizado, o faturamento e os últimos lançamentos."
  />

  {/* Faixa de indicadores: StatCard em grade, não coluna. O tamanho é do componente. */}
  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
    <StatCard tone="featured" label="Líquido realizado" value={formatBRL(liquido)}
      footnote="Caixas abertos agora: 2" helpText="Vendas líquidas menos despesas já pagas." />
    <StatCard label="Faturamento bruto" value={formatBRL(bruto)} footnote={`Taxas: ${formatBRL(taxas)}`} />
    {/* … */}
  </div>

  {/* Seção de filtro: card próprio; campos em grade dentro dele. */}
  <Card variant="soft" title="Filtros do período">
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
      <Input label="Data inicial" type="date" … />
      <Input label="Data final" type="date" … />
      <Select label="Categoria" … />
    </div>
  </Card>

  {/* Seção de listagem: a espera troca só o conteúdo, o card fica. */}
  <Card variant="flat" title="Histórico de lançamentos">
    {carregando ? <LoadingState compact /> : <ResponsiveDataTable … />}
  </Card>
</Card>
```

### Níveis de card

- **Nível 1:** card raiz da tela, `variant="flat"`. Um por tela. É ele que `loading.tsx`
  também desenha, então a tela não pula quando os dados chegam.
- **Nível 2:** `Card` de seção e `StatCard`, direto dentro da raiz (uma `div` de grade no
  meio não conta como nível). `variant="soft"` por padrão, que contrasta com a raiz branca.
  `variant="flat"` é aceito na seção de listagem, porque a tabela já traz moldura.
  `StatCard tone="featured"` no máximo **um** por tela, para o indicador principal.
- **Nunca nível 3.** Dentro de um card de seção não vai outro `Card`, nem `StatCard`, nem
  uma casca escrita à mão (`rounded-md border border-hairline bg-surface p-4`). Precisa
  separar por dentro? Divisor `border-t border-hairline pt-3`. Precisa destacar um total
  por dentro (o "Total a receber" do pedido)? Fundo `bg-canvas-soft rounded-md p-3` **sem**
  borda e sem sombra, e só se o card em volta for `flat` (branco).
- **"Lista de coisas" não ganha card pai.** Se cada caixa, ponto ou funcionário tem seu
  próprio card, eles vão numa grade direto na raiz. Um card "Caixas abertos" em volta deles
  é o terceiro nível disfarçado. Quando a lista está vazia ou carregando, aí sim um único
  `Card` de seção com esse título mostra o estado vazio ou o `LoadingState`.
- **`TileButton` não é card.** É um botão (sem cabeçalho, sem sombra em repouso) e pode
  morar dentro de um card de seção.
- O cabeçalho da seção é o `title`/`subtitle`/`headerAction` do próprio `Card`. Nunca um
  `<h2>` solto acima do card.
- Nenhuma seção, filtro ou tabela solta direto no fundo da página, fora do card raiz.

```tsx
// Errado (entregue de verdade na tela de Caixa): quatro cascas.
<Card variant="soft" title="Caixas abertos">          {/* nível 2 */}
  <Card variant="flat" title={caixa.nome}>            {/* nível 3 */}
    <div className="rounded-md bg-canvas-soft p-3">   {/* nível 4 */}
      <p className="typo-heading-2">{formatBRL(esperado)}</p>

// Certo: cada caixa é nível 2, em grade na raiz; separação interna por divisor.
<div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
  {caixas.map((caixa) => (
    <Card key={caixa.id} variant="soft" title={caixa.nome} headerAction={<Badge sticker="green">Turno aberto</Badge>}>
      <span className="typo-caption text-ink-muted">Dinheiro esperado na gaveta</span>
      <p className="typo-heading-2 tabular-nums text-ink">{formatBRL(caixa.esperado)}</p>
      <dl className="mt-3 grid gap-3 border-t border-hairline pt-3 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]">…</dl>
    </Card>
  ))}
</div>
```

### Telas de operação: a única exceção às seções empilhadas

Telas em que a pessoa trabalha o tempo todo olhando duas coisas ao mesmo tempo (o **PDV**:
catálogo e pedido) podem, **a partir de `lg`**, pôr a área de trabalho e um painel lateral
lado a lado. O painel acompanha a rolagem (`lg:sticky lg:top-6`). Abaixo de `lg`, o painel
vira uma barra fixa no rodapé que abre um `Modal`.

```tsx
<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
  <div className="flex min-w-0 flex-col gap-5">
    <Card variant="soft" title="Catálogo">…TileButton em grade…</Card>
    <Card variant="flat" title="Vendas recentes">…</Card>
  </div>
  <Card variant="flat" title="Pedido" className="hidden lg:sticky lg:top-6 lg:block">…</Card>
</div>
```

Cadastro, consulta, relatório e painel **não** são telas de operação: formulário ao lado
de tabela continua proibido. Na dúvida, pergunte ao usuário.

## Tipografia: a escala já está decidida

A escala mora em `src/styles/tokens.css` (classes `typo-*`), já é responsiva e já tem peso,
entrelinha e espaçamento de letra. **Você escolhe a classe pelo papel do elemento, não pela
importância que quer dar a ele.**

| Papel | Quem aplica | Classe | Tamanho (celular → desktop) |
|---|---|---|---|
| Título da tela (`h1`) | `PageHeader` | `typo-heading-1` | 20 → 24px |
| Valor de indicador, total de destaque ("Total a receber", "Dinheiro esperado") | `StatCard`, ou você | `typo-heading-2` | 18 → 20px |
| **Título de seção** (`h2`) | `title` do `Card` | `typo-heading-3` | 16 → 17px |
| Texto corrido, célula de tabela, conteúdo de input, nome de item | `Input`, tabela, `TileButton`, ou você | `typo-body-sm` / `typo-body-md` | 14px |
| Rótulo de botão | `Button` | `typo-button` | 13 → 14px |
| Rótulo de indicador, rótulo de campo, subtítulo de card, legenda, nota de pé, chip | `StatCard`, `Input`, `Card`, `ChoiceChips`, ou você | `typo-caption` | 12px |
| Cabeçalho de coluna, selo | tabela, `Badge` | `typo-eyebrow` + `uppercase` | 11,5px |

**O que você escreve à mão é pouco:** o valor de destaque fora de `StatCard`
(`typo-heading-2`), texto corrido (`typo-body-sm`) e legenda (`typo-caption`). Todo o
resto vem do componente. Se você está escrevendo `typo-heading-1` ou `typo-heading-3` numa
tela, provavelmente devia estar usando `PageHeader` ou o `title` do `Card`.

**A régua não se inverte:** título da tela > valor de indicador > título de seção > texto >
legenda. Confira com os olhos. Se um título de seção parece menor que a tabela embaixo
dele, ou um botão grita mais que o título, algo saiu da régua.

**As regras verificáveis:**

- Todo texto novo tem uma classe `typo-*`, ou herda de um componente que já tem.
- Nenhuma classe de tamanho do Tailwind (`text-sm` … `text-9xl`), nenhum `text-[…]`,
  nenhum `leading-[…]`/`tracking-[…]` sobre um `typo-*`, nenhum `fontSize` em `style`.
  (Os componentes de `src/components/ui/` que já usam `text-[13px]` ficam como estão: o
  valor foi decidido ali, e você não copia esse padrão para a tela.)
- `typo-display-1`, `typo-display-2` e `typo-heading-1` são **do título da tela**. Nenhum
  valor, número ou nome de card os usa.
- Peso vem com a classe. Não acrescente `font-bold`/`font-extrabold`. `font-semibold` só
  em `<strong>` dentro de texto corrido ou num rótulo curto, nunca para "dar destaque" a
  um valor.
- Valor numérico usa `tabular-nums` quando forma coluna (tabela, lista de resumo).

### Destaque não é tamanho

O valor mais importante da tela **não** é o maior tipo da tela. O título é. Quando um
indicador precisa se destacar dos vizinhos, o que muda é a **superfície**
(`variant="featured-night"`, uma por tela), e o tamanho fica o mesmo dos outros
indicadores.

Desvios vistos em teste, todos bem argumentados, todos errados:

| Desvio | Correto |
|---|---|
| `<Card title>` usado como indicador, com o valor em `<p>` dentro | `StatCard` (o título do `Card` é de seção, 17px, grande demais para rótulo de número) |
| Título de seção em `typo-caption` (12px), menor que a tabela | `title` do `Card`, que já é `typo-heading-3` |
| `className="text-3xl font-bold"` no valor | `className="typo-heading-2 text-ink"` |
| `text-[28px]` "porque o DESIGN.md tem heading-2 de 26px" | `typo-heading-2`. O DESIGN.md não manda em tamanho |
| `typo-heading-1` no valor do card principal | `typo-heading-2` + `variant="featured-night"` |
| `text-lg font-semibold` num título de seção escrito à mão | `title` do `Card` |
| `<h2 className="text-xl">Filtros</h2>` acima do card | `<Card title="Filtros">` |

## As decisões de composição que vêm do DESIGN.md

Estas são as que os componentes não resolvem sozinhos e onde uma tela nova costuma errar:

1. **Uma ação primária azul por viewport.** `Button variant="primary"` (azul `bg-primary`)
   é escasso. Dois botões azuis na mesma área significa que um deles é `secondary` ou
   `utility` e ainda não sabe disso. Em cards repetidos (um por caixa), a ação de cada card
   é `secondary`: o azul é do botão do cabeçalho. **Seleção não é ação:** filtro de
   categoria, Hoje/Mês, pagamento único/dividido usam `ChoiceChips` (azul claro de
   contorno), nunca `Button primary` para marcar o selecionado.
2. **Paleta de adesivos só decora ou sinaliza.** `accent-*` aparece em `Badge`
   (`sticker`), em ícone e em texto de estado (`text-accent-orange-deep` para pendente,
   `bg-accent-teal` no `Button variant="success"`). Nunca como fundo de seção ou de card.
3. **Uma ilha escura por tela, no máximo.** `featured-night` (`bg-secondary`) é o "night
   band" do Notion: um card de indicador principal, e só.
4. **Cabeçalho calmo.** Topo de tela é `PageHeader` em superfície limpa: sem gradiente,
   sem imagem, sem faixa colorida.
5. **Profundidade por hairline, não por sombra.** Cards são `border-hairline`.
   `shadow-soft` só em botão e no `elevated`; `shadow-elevated` só em modal, dropdown e
   popover. Nunca `shadow-lg`/`shadow-xl` do Tailwind.
6. **Raio pelo papel.** Input `rounded-xs`, botão utilitário `rounded-md`, card
   `rounded-lg`, botão primário/secundário e selo `rounded-full`. Os componentes já aplicam.
   Não troque `rounded-*` de um componente na tela.
7. **Piso quente, card branco.** O fundo da página é `bg-canvas-soft` (já no `body`). A
   raiz é branca, as seções `soft` voltam ao tom quente. Não pinte a página de branco puro.

## Botão de ajuda da tela

- Toda tela tem um **botão de ajuda só com o ícone** (`CircleHelp`), sem texto ao lado,
  inclusive no celular. O `PageHeader` já entrega isso: passe `helpTitle` e `helpText`.
- O clique abre a **seção de ajuda** logo abaixo do cabeçalho, com transição suave. Não
  escreva outro botão de ajuda nem outra seção de ajuda.
- Para explicar um indicador ou campo específico, use `helpText` do `Card` (vira um
  `HelpHint` ao lado do título). Não escreva a explicação direto no corpo do card.
- `helpText` com duas ou três frases curtas sobre o que a pessoa faz na tela.

## Padrão de tabela (grid de dados)

Toda tabela usa `ResponsiveDataTable` (`src/components/ui/responsive-data-table.tsx`)
dentro de um `Card` de seção. Ela já traz rolagem horizontal no celular
(`overflow-x-auto`), cabeçalho em `typo-eyebrow` caixa alta sobre `bg-canvas-soft`, linha
com hover suave, estado vazio e as duas paginações.

```tsx
<Card variant="flat" title="Produtos" headerAction={<span className="typo-caption text-ink-muted">128 itens</span>}>
  <ResponsiveDataTable
    data={produtos}
    keyExtractor={(p) => p.id}
    columns={colunas}
    loading={carregando}
    emptyMessage="Nenhum produto cadastrado ainda."
    pagination={{ mode: 'numbered', page, pageSize, totalCount, loading: carregando, onPageChange }}
  />
</Card>
```

| Parte | Como é |
|---|---|
| Moldura | `Card`. Título à esquerda; contagem em `headerAction` com `typo-caption text-ink-muted`. |
| Texto longo na célula | `TruncatedText` de `@/components/ui` (reticências + tooltip com o texto completo). Nunca `truncate` sem tooltip. |
| Dinheiro | `align: 'right'`, `formatBRL()` de `src/lib/formatters.ts`, `tabular-nums`. Mesmo tamanho das outras células. |
| Data | `formatDateBR()`. Nunca ISO cru. |
| Status / tipo | `Badge` com o rótulo de `domain-labels.ts`. Nunca o ENUM. |
| Ações da linha | `RowActions` de `@/components/ui`. Até 4 ações: só ícone + tooltip (o componente faz). Mais de 4: menu "Mais ações" (o componente faz). Não monte botões de linha à mão. |
| Linha vazia de valor | "—" sozinho na célula é permitido (é símbolo de vazio, não pontuação). |

**Nada na tabela é grande.** Valor, data, nome e status ficam todos em `typo-body-sm`. O
que diferencia é cor, o `Badge` e o alinhamento.

### Paginação via Supabase SDK

- **Poucos dados**, volume comprovadamente pequeno e fixo (formas de pagamento, menus do
  sistema): sem paginação.
- **Dados que crescem** (vendas, lançamentos, movimentações): paginação obrigatória no
  backend com `.range(from, to)` e `{ count: 'exact' }`. Dois modos, ambos já suportados
  por `ResponsiveDataTable`:
  - **Modo A, numerada** (`mode: 'numbered'`): páginas `1, 2, 3…`, cada uma buscada no
    Supabase.
  - **Modo B, rolagem infinita** (`mode: 'infinite'`): lotes conforme a pessoa rola.
- Tamanho de página: o parâmetro `paginacao_padrao_grid` quando existir.
- **Se o pedido não diz qual modo e os dois são plausíveis, pergunte ao usuário antes de
  implementar.**

## Carregamento: toda espera tem sinal

A pior tela do sistema é a que parece travada: o clique acontece, nada muda, e um segundo
depois tudo troca de uma vez.

### O que já existe

| Peça | Onde | Cobre |
|---|---|---|
| `LoadingState` | `src/components/ui/loading-state.tsx` | Spinner + rótulo, `role="status"`, `aria-live`. Prop `compact` para dentro de card de seção; sem `compact` para o corpo da tela. Prop `label` (padrão "Carregando..."). |
| `Button` `loading` | `src/components/ui/button.tsx` | Spinner no botão, `disabled` contra duplo clique, `loadingText` ("Salvando..."). |
| `loading.tsx` | `src/app/(erp)/loading.tsx` | Troca de rota pelo menu. Já resolvido, não duplique. |
| `ResponsiveDataTable` `loading` | `src/components/ui/responsive-data-table.tsx` | Espera dentro da tabela e na paginação. |

### Qual caminho usar, por tipo de ação

| Ação | Como a espera aparece |
|---|---|
| Abrir a tela | `page.tsx` entrega o essencial rápido; o pesado carrega no componente cliente. Enquanto carrega, o card raiz mostra `PageHeader` + `<LoadingState />`. |
| Trocar filtro, buscar | O card de filtro **continua na tela**, usável e com o valor novo já selecionado (estado local). O **conteúdo do card de resultado** vira `<LoadingState compact label="Atualizando..." />` ou a tabela recebe `loading`. |
| Digitar na busca | Espere ~300ms sem digitação antes de consultar, e descarte resposta atrasada (contador em `useRef`). **A busca nunca dispara o carregamento da tela inteira:** se o campo de busca some ou perde o foco enquanto a pessoa digita, a busca está ligada no carregamento errado. A consulta da lista mora num `useEffect` próprio, separado da carga inicial da tela. |
| Paginar | `loading` da paginação do `ResponsiveDataTable`. |
| Salvar, confirmar, excluir, exportar, abrir/fechar caixa | O **próprio botão**: `<Button loading={salvando} loadingText="Salvando...">`. |
| Modal que carrega dados ao abrir | Corpo do modal com `<LoadingState compact />`; título e fechar já na tela. |

**Substitua o conteúdo, não o card.** Moldura, título e `headerAction` ficam; só o miolo
troca. Assim a tela não pula.

**Um spinner por região.** Trocou o filtro, gira o resultado, não o filtro.

**Nunca:** spinner escrito à mão na tela (`<Loader2 className="animate-spin">` solto,
`@keyframes`), espera sem texto, `setTimeout` para "o giro aparecer", overlay cobrindo a
tela inteira por causa de um filtro. Precisa de uma espera que `LoadingState` não cobre
(esqueleto de tabela, espera compartilhada entre filtro e resultado em componentes
diferentes)? Crie um componente **genérico** em `src/components/ui/`, exporte em
`index.ts`, reuse o `Loader2` e o mesmo rótulo, e troque as telas vizinhas também. Nome sem
domínio: nada de `CarregandoCaixa`.

## Confirmação: sempre o `ConfirmModal`

```tsx
<ConfirmModal
  open={aberto}
  onClose={() => setAberto(false)}
  title="Excluir o produto Água mineral 500ml?"
  description="O produto sai do cardápio do PDV. As vendas antigas continuam salvas."
  confirmLabel="Excluir"
  loadingLabel="Excluindo..."
  tone="danger"            // 'danger' para destrutiva; 'primary' para as outras
  loading={excluindo}
  errorMessage={erro}      // aparece dentro do modal; o modal continua aberto
  onConfirm={confirmar}
/>
```

- `ConfirmModal` já bloqueia fechar durante `loading` e mostra o erro dentro dele. Não
  feche o modal para mostrar o erro na tela.
- Precisa de algo que ele não faz (lista no corpo: use `children`; outro comportamento:
  estenda o `ConfirmModal` com uma prop). Nunca copie o modal para dentro da tela.
- **Quando NÃO confirmar:** ação reversível com um clique (trocar filtro, marcar
  checkbox, recolher seção). Confirmação em excesso ensina a clicar sem ler.

| Parte | Regra | Certo | Errado |
|---|---|---|---|
| `title` | Pergunta com verbo e objeto | "Fechar o caixa da Portaria?" | "Atenção", "Confirmação" |
| `description` | O efeito real, e se tem volta | "O caixa não aceita mais vendas hoje. O saldo fica salvo para conferência." | "Esta ação não pode ser desfeita." sozinho |
| `confirmLabel` | O verbo do título | "Fechar caixa" | "OK", "Sim", "Confirmar" |
| `cancelLabel` | "Cancelar" | "Cancelar" | "Não", "Voltar" |

## Texto da interface: escreva como gente

Vale para todo texto na tela: título, rótulo, dica, ajuda, nota de card, estado vazio,
erro, corpo de modal. Quem lê é o dono do estabelecimento, o gerente, o caixa, o atendente.

### Sem travessão

Não use "—", "–" nem "--" em texto de interface. Troque por ponto, vírgula ou parênteses,
ou quebre em duas frases. `sanitizeNoDashes()` de `src/lib/copy-guard.ts` é rede de
segurança dos componentes, não licença para escrever com travessão.

| Com travessão | Sem |
|---|---|
| "Feche o caixa — o saldo fica salvo." | "Feche o caixa. O saldo fica salvo." |
| "Variável — estimado" | "Variável (estimado)" |
| "Cerveja — 600ml — R$ 18,00" | "Cerveja · 600ml · R$ 18,00" |

### Nada técnico na tela

- **Tabela nunca aparece pelo nome.** `parametros_web` → "Configurações gerais";
  `cash_movements` → "Movimentações do caixa"; `sale_payments` → "Formas de pagamento";
  `system_modules` → "Menus do sistema".
- **ENUM sempre passa por um mapa de `src/lib/domain-labels.ts`.** `bleed_outflow` →
  "Sangria"; `supply_inflow` → "Suprimento de troco"; `simples_nacional` → "Simples
  Nacional"; `non_clt` → "Diarista / prestador"; `manual_pos` → "Pagamento no balcão".
  O mapa não tem o valor? Acrescente-o lá, nunca escreva o rótulo solto na tela.

### Fale com o usuário, não sobre a tela

| Soa como IA | Soa como gente |
|---|---|
| "Esta seção mostra os lançamentos do período selecionado." | (tire; a pessoa já está vendo) |
| "A taxa não entra: ela é descontada pela maquininha." | "Não inclui a taxa da maquininha." |
| "Sem caixa aberto, nada muda: as vendas ficam bloqueadas." | "Abra um caixa para começar a vender." |
| "Sem lançamentos, não há o que conferir." | "Nenhum lançamento neste período." |
| "Deixe em branco para herdar o padrão do sistema." | "Em branco, usa o valor padrão." |

### Os vícios que mais aparecem

- **Dois-pontos que explicam a própria frase.** Diga a informação e pare.
- **Frase de efeito em duas partes.** "Não é X, é Y", "Sem X, nada muda". Diga o fato.
- **Trio por ritmo.** "Rápido, simples e seguro." Corte se não são três fatos úteis.
- **Tranquilizar sem motivo.** "Não se preocupe", "fique tranquilo". Tire.
- **Palavra de programador.** "Registro", "herdar", "override", "vigência", "payload".
  Use a palavra do balcão.
- **Dica de campo com parágrafo.** Uma frase. Se precisa de mais, o campo está confuso.

**O teste:** leia em voz alta como o gerente falando com o caixa. Se ninguém falaria assim,
reescreva. Reticências só no gerúndio de espera ("Salvando...").

## Botões, transições e movimento

- Sempre `Button` de `@/components/ui`. Variantes: `primary` (ação principal, uma por
  área), `secondary`, `utility` (neutro), `success` (confirmação positiva),
  `danger-utility` (excluir), `icon-circular`, `icon-ghost` (ícone com `Tooltip`).
- `<button>`, `<input>`, `<select>` e `<textarea>` crus fora de `src/components/ui/` são
  reprovados por `tests/architecture-guard.test.ts`. Precisa de um controle que não existe?
  Crie em `src/components/ui/` (foi assim que nasceram `ChoiceChips` e `TileButton`).
- Para escolher entre poucas opções: `ChoiceChips`. Para catálogo clicável: `TileButton`.
  Rolagem infinita fora de tabela: `LoadMore`.
- Botão de ícone sem texto sempre dentro de `Tooltip` e com `aria-label`.
- Toda interação tem transição `transition-all duration-200 ease-out`; toque
  `active:scale-[0.98]` (o `Button` já faz). Abrir ajuda, modal, dropdown, sidebar e
  trocar estado de carregamento: nada seco.
- Alvo de toque de pelo menos 40px no celular (o `Button` já garante).

## Onde o projeto vence o DESIGN.md

O `DESIGN.md` é uma extração de site de marketing. Nestes pontos você **ignora** o que ele
diz:

| DESIGN.md diz | No Palheta Soft |
|---|---|
| display 64px / 54px, heading-1 40px, heading-2 26px | Escala `typo-*` de `tokens.css`. Título da tela 20 → 24px; valor de indicador 18 → 20px; título de seção 16 → 17px. |
| Peso 700 em todos os títulos | O peso que a classe `typo-*` traz (600). Nunca `font-bold`. |
| body-md 16px, button 16px | `typo-body-*` 14px, `typo-button` 13 → 14px. |
| "No hover states documented" | Hover existe em todo controle (os componentes já trazem). |
| Hero "night" de largura cheia | `featured-night` em um card de indicador, no máximo um por tela. |
| Seções separadas por grandes vãos de 96px | `gap-5` entre seções, `gap-4` dentro delas. |
| Grade de marketing 2-up / 3-up / 4-up fixa | `auto-fit` com `minmax()`; 1 coluna a 320px. |
| Botão pílula grande para CTA | `Button` do sistema, no tamanho dele. |

## Checklist de verificação: rode antes de dizer que acabou

Crie um todo por item. Cada "não" é trabalho pendente, não ressalva.

**Estrutura**
- [ ] A tela tem um card raiz `flat` com `PageHeader` (com `helpTitle` e `helpText`).
- [ ] Toda seção (filtro, formulário, listagem, estado vazio) está num `Card` de nível 2.
- [ ] Seções empilham; **nenhuma** seção lado a lado de outra (exceto tela de operação,
      a partir de `lg`).
- [ ] Indicadores são `StatCard`; indicadores, coisas repetidas e campos estão em **grade**,
      não numa coluna única. A 1440px nada fica numa coluna estreita esticada.
- [ ] Conte as cascas de fora para dentro: raiz, seção, e **pare**. Nenhum `Card`,
      `StatCard` ou bloco com borda dentro de uma seção.
- [ ] Lista de coisas com card próprio (caixas, pontos) está em grade direto na raiz, sem
      card pai em volta.
- [ ] Catálogo clicável usa `TileButton`, não tabela.
- [ ] Nenhum `<h2>` solto acima de um card que poderia ter `title`.

**Tipografia**
- [ ] Título da tela vem do `PageHeader`, título de seção do `title` do `Card`, rótulo e
      valor de indicador do `StatCard`.
- [ ] Todo texto escrito à mão tem uma classe `typo-*`.
- [ ] Zero `text-sm`/`text-lg`/`text-xl`/`text-2xl`…, zero `text-[…]`, zero `fontSize`.
- [ ] Zero `font-bold`/`font-extrabold`.
- [ ] A régua está de pé: título da tela > valor > título de seção > texto > legenda.
      Nenhum título de seção menor que o texto embaixo dele.

**Controles**
- [ ] Seleção (categoria, período, forma de cobrança) usa `ChoiceChips`, não `Button primary`.
- [ ] Nenhum `<button>`/`<input>`/`<select>`/`<textarea>` cru na tela.

**Valores e composição**
- [ ] Zero hexadecimal, `rgb()` ou cor da paleta padrão do Tailwind no código novo.
- [ ] Zero valor do `DESIGN.md` copiado cru.
- [ ] Uma só ação `primary` por área.
- [ ] `accent-*` só em `Badge`, ícone ou texto de estado; nunca fundo de seção.
- [ ] No máximo um `featured-night` por tela.
- [ ] Nenhum `shadow-lg`/`shadow-xl`, nenhum gradiente.

**Responsividade**
- [ ] Testado a 320px (sem rolagem horizontal da página, sem texto cortado, sem botão
      inalcançável) e no desktop largo (largura aproveitada).
- [ ] Tabela rola na horizontal dentro do card no celular.

**Carregamento**
- [ ] Abrir a tela mostra "Carregando..." sem travar a navegação.
- [ ] Trocar filtro, buscar e paginar troca o conteúdo do card de resultado por
      `LoadingState`; o filtro continua na tela com o valor novo.
- [ ] Todo botão que chama o servidor usa `loading` + `loadingText`.
- [ ] Nenhum spinner escrito à mão na tela.

**Tabela**
- [ ] `ResponsiveDataTable` dentro de `Card`; texto longo com `TruncatedText`; dinheiro à
      direita com `formatBRL`; status em `Badge` com rótulo traduzido; ações por `RowActions`.
- [ ] Dados que crescem paginam no Supabase com `.range()`, e o modo foi combinado com o
      usuário.

**Confirmação**
- [ ] Zero `window.confirm()`, `alert()` ou `prompt()` no código novo ou tocado.
- [ ] Toda confirmação usa `ConfirmModal` com título em pergunta, consequência, verbo,
      `loading` e `errorMessage`.

**Texto**
- [ ] Nenhum "—", "–" ou "--" em texto visível (fora célula vazia de tabela).
- [ ] Nenhum nome de tabela nem ENUM cru; todo ENUM passa por `domain-labels.ts`.
- [ ] Nenhuma frase narrando a tela. Lido em voz alta, soa como gente do balcão.

**Código**
- [ ] `npm run lint` (tipos) passou. Cole a saída.
- [ ] `npm test` passou. Cole a saída.

## Bandeiras vermelhas: pare e corrija

| Pensamento | Realidade |
|---|---|
| "A regra manda `flex-col`, então empilho os quatro KPIs" | `flex-col` é **entre seções**. KPIs, itens e campos vão em grade `auto-fit`. |
| "Formulário à esquerda e tabela à direita aproveita melhor o desktop" | São duas seções. Seção empilha. Quem aproveita o desktop é a grade **dentro** da seção. |
| "Coloco os campos um embaixo do outro, é mais simples" | No desktop vira uma coluna de inputs de 1200px. Grade `auto-fit` de `12rem`. |
| "`grid-cols-4` resolve" | A 320px são quatro colunas de 70px. `auto-fit` + `minmax(min(100%,…),1fr)`. |
| "Dinheiro é o dado principal, merece `text-3xl`" | `typo-heading-2`. Destaque vem de `featured-night`, não de tamanho. |
| "O DESIGN.md diz 26px para heading-2" | O DESIGN.md não manda em tamanho. A classe `typo-*` manda. |
| "`text-sm` é 14px, igual ao `typo-body-sm`" | Use a classe do sistema. `text-sm` traz outra entrelinha e abre a porta para `text-xl`. |
| "Uso `font-bold` no total para ele aparecer" | Peso vem da classe. Destaque é superfície. |
| "Mais um card dentro do card de seção separa melhor" | Terceiro nível é proibido. Divisor `border-t border-hairline` ou fundo `bg-canvas-soft` sem borda. |
| "Ponho um card 'Caixas abertos' em volta dos cards de cada caixa, fica organizado" | É o terceiro nível disfarçado. Os cards de cada caixa vão em grade direto na raiz. |
| "Uso `Card` com `title` para o indicador, é mais rápido" | O título do `Card` é de seção (17px) e fica do tamanho do número. `StatCard`. |
| "O título do card pequeno fica mais elegante" | Título menor que a tabela embaixo dele inverte a hierarquia. Use o `title` do `Card` como ele vem. |
| "Produtos numa tabela, com um botão + na linha" | Catálogo de escolha rápida é `TileButton` em grade `auto-fill`. Tabela é para consultar, não para tocar. |
| "O filtro selecionado fica `primary` para se destacar" | Seleção é `ChoiceChips`. O azul cheio é da ação principal. |
| "No PDV, o pedido vai embaixo do catálogo, a regra manda empilhar" | PDV é tela de operação: pedido ao lado, `sticky`, a partir de `lg`. |
| "A busca chama a mesma função que carrega a tela" | A tela inteira recarrega a cada tecla e o campo perde o foco. Busca tem efeito próprio e espera a digitação parar. |
| "O Barber/SIC usa esse cinza, copio a cor" | Inspiração é de composição e comportamento. Cor sempre do Soft, pela tabela de tradução. |
| "O título fica melhor num `h2` acima do card" | `title` do `Card`. |
| "Só um hex, é um caso específico" | Caso específico é token que falta: acrescente em `tokens.css` (`@theme`) com comentário. |
| "`bg-blue-500` é quase o azul do sistema" | `bg-primary`. A paleta padrão do Tailwind não existe aqui. |
| "Essa consulta é rápida, não precisa de carregando" | Rápida no local, lenta na produção. Toda espera tem sinal. |
| "Faço um spinner rapidinho aqui" | `LoadingState` ou `Button loading`. Spinner à mão é como a inconsistência entra. |
| "Um `confirm()` resolve" | Proibido. `ConfirmModal`. |
| "O botão diz 'Confirmar', fica claro" | O botão diz o verbo: "Excluir", "Fechar caixa". |
| "Mostro o status como veio do banco" | ENUM cru é proibido. `domain-labels.ts`. |
| "Coloco 'Ajuda' ao lado do ícone para ficar visível" | Só o ícone, inclusive no celular. O `PageHeader` já faz. |
| "Já sei qual paginação usar" | Se o pedido não disse, pergunte. |
| "No Barber é assim, copio o CSS" | Outro projeto, outra stack. Inspire-se na composição, reconstrua com `@/components/ui` e traduza (seção abaixo). |
| "É só um ajuste pequeno, não precisa da checklist" | Ajuste pequeno é onde o padrão vaza. Rode a checklist. |

## Referências de outros projetos: inspiração de design, nunca de cor

O **Palheta Barber** e o **SIC** são projetos irmãos que já resolveram bem muitas telas de
gestão. Use-os como **inspiração de design e de comportamento**: como a tela é composta,
como as seções se distribuem, a densidade, a hierarquia de tipo, como um card de caixa ou
de indicador se organiza, como um modal se comporta. **Não use as cores deles.** A paleta
do Palheta Soft (azul `primary`, piso quente `canvas-soft`, adesivos `accent-*` do
`DESIGN.md`) é intocável. O Barber é monocromático e o SIC usa as cores do shadcn; nenhuma
das duas paletas entra aqui.

| Pegue de lá | Nunca pegue de lá |
|---|---|
| Composição: o que fica lado a lado, o que empilha, o que vai em grade | Cor de qualquer tipo: hex, `var(--…)` de cor, `bg-background`, `bg-muted`, `text-muted-foreground`, `bg-zinc-*` |
| Anatomia de um componente: rótulo acima do valor, selo no canto, ações no rodapé | O CSS como está (`.module.css`, `cn()`, classes do shadcn) |
| Densidade e espaçamento **relativos** (o card de caixa do Barber é compacto; copie a compactação) | Os valores de px, a fonte mono do Barber, os raios deles |
| Proporção entre os tamanhos de texto (título > valor > rótulo) | Os tamanhos absolutos: aqui a escala é a das classes `typo-*` |
| Comportamento: foco, teclado, estados de espera, erro, vazio | Dependências que o Soft não tem (Radix, bibliotecas de máscara) sem perguntar |

**Como usar:** abra a tela ou o componente indicado abaixo, entenda a composição e o
comportamento, e então **reconstrua com os componentes de `@/components/ui` e as classes
do Soft**, traduzindo cada valor pela tabela "Como traduzir". Se você não consegue ler
arquivos fora deste repositório, siga só esta skill. Não pare a tarefa por isso.

| Projeto | Caminho | Stack |
|---|---|---|
| Palheta Barber (SIGBARBER) | `C:/Users/joaov/Documents/joao/projetos/palhetabarber` | Next.js + **CSS Modules** + tokens `var(--…)` |
| SIC (Sistema de Contratos) | `C:/Users/joaov/Documents/joao/projetos/mo-coworking-sic` | Next.js + **Tailwind + shadcn/ui** (Radix) |

### Telas inteiras para inspirar a composição

| Vou desenhar… | Olhe | O que observar |
|---|---|---|
| Tela de caixa (vários caixas abertos) | Barber `src/app/(admin)/caixa/GradeDeCaixas.tsx`, `CardCaixa.tsx`, `caixa.module.css` | Um card por caixa em grade, valor em destaque, ações no rodapé do card, fechamento em gaveta |
| Painel com indicadores | Barber `src/app/(admin)/painel/page.tsx` · SIC `app/(dashboard)/dashboard/page.tsx` | Faixa de indicadores em grade, seções abaixo |
| Tela financeira com filtro + resumo + tabela | Barber `src/app/(admin)/contabilidade/page.tsx` e `contabilidade.module.css` · SIC `app/(dashboard)/dashboard/financeiro/geral/page.tsx` | Filtro em card próprio, campos em grade, resultado abaixo |
| Catálogo (produtos, serviços) | Barber `src/app/(admin)/catalogo/produtos/page.tsx` | Densidade da listagem e das ações |
| Listagem com busca e ações | SIC `app/(dashboard)/dashboard/contratos/page.tsx` | Busca, filtros e ações de linha |

### Componentes, por necessidade

Abra **só o arquivo indicado**. Não saia navegando pelo projeto.

| Preciso de… | Abra | Leve daqui |
|---|---|---|
| Card de indicador com explicação do valor | Barber `src/components/data/StatCard.tsx` e `ExplicacaoValor.tsx` | A anatomia: rótulo em cima, valor, nota de pé que desce quando não cabe |
| Estado vazio com ação | Barber `src/components/data/EmptyState.tsx` · SIC `components/ui/empty.tsx` | Estrutura: ícone, frase, botão |
| Tabela que vira card no celular | Barber `src/components/data/Table.tsx` | A ideia de "papel" por coluna, se um dia a rolagem horizontal não bastar |
| Paginação acessível | Barber `src/components/data/Pagination.tsx` · SIC `components/ui/pagination.tsx` | `aria-current`, rótulos dos botões |
| Espera compartilhada entre filtro e resultado | Barber `src/components/feedback/RegiaoPendente.tsx` | O padrão provedor + hook + invólucro com `useTransition` |
| Modal de confirmação: foco e `alertdialog` | Barber `src/components/overlay/ModalConfirmacao.tsx` | Foco inicial em Cancelar na destrutiva, `role="alertdialog"`, `aria-describedby` |
| Gaveta lateral | Barber `src/components/overlay/Drawer.tsx` · SIC `components/ui/sheet.tsx` | Prisão de foco, Escape, retorno do foco |
| Abas, alternância segmentada | Barber `src/components/forms/SegmentedControl.tsx` · SIC `components/ui/tabs.tsx` | Teclado (setas), `aria-selected` |
| Campo de moeda, telefone, documento, CEP | Barber `src/components/forms/CampoMoeda.tsx`, `CampoTelefone.tsx`, `CampoDocumento.tsx`, `CampoCep.tsx` | A lógica de máscara e de conversão |
| Período com atalhos (hoje, mês) | Barber `src/components/forms/CamposPeriodo.tsx` e `AtalhosPeriodo.tsx` | O comportamento dos atalhos |
| Menu dropdown, popover, calendário | SIC `components/ui/dropdown-menu.tsx`, `popover.tsx`, `calendar.tsx` | Teclado, fechamento por clique fora |
| Esqueleto de carregamento | SIC `components/ui/skeleton.tsx` | Pulso em opacidade, sem novo spinner |

### Como traduzir o que você leu

Leu um valor lá? Ele vira isto aqui. **Cor sempre pela coluna da direita**, mesmo que a
de lá pareça "quase igual":

| No Barber (`var(--…)`) | No SIC (shadcn) | No Palheta Soft (Tailwind) |
|---|---|---|
| `--bg-app` | `bg-background` | `bg-canvas-soft` (piso, já no `body`) |
| `--bg-surface` | `bg-card` | `bg-surface` |
| `--bg-surface-2`, `--bg-sunken` | `bg-muted` | `bg-canvas-soft` |
| `--bg-surface-inverse` + `--text-inverse` | `bg-primary text-primary-foreground` (em destaque) | `Card variant="featured-night"` |
| `--text-strong` | `text-foreground` | `text-ink` |
| `--text-body` | `text-foreground` | `text-ink-secondary` |
| `--text-muted` | `text-muted-foreground` | `text-ink-muted` (legenda fraca: `text-ink-faint`) |
| `--border-subtle` | `border-border` | `border-hairline` |
| `--action-solid` | `bg-primary` | `Button variant="primary"` (`bg-primary`) |
| `--tint-*` / `--ink-*` de status | `bg-destructive`, cores de status | `Badge sticker="…"`, `text-accent-*-deep` |
| `--r-control` | `rounded-md` | `rounded-xs` (input) |
| `--r-lg` (botão) | `rounded-md` | o raio do `Button` |
| `--r-card` | `rounded-xl` | `rounded-lg` (o `Card` já aplica) |
| `--r-panel` | `rounded-lg` | `rounded-xl` (o `Modal` já aplica) |
| `--sh-card` | `shadow-sm` | `border-hairline`, sem sombra |
| `--sh-overlay` | `shadow-lg` | `shadow-elevated` |
| `--fs-h1` | `text-2xl`/`text-3xl` | `typo-heading-1` |
| `--fs-h2` (valor de destaque) | `text-2xl` | `typo-heading-2` |
| `--fs-h3` | `text-xl`/`text-lg` | `typo-heading-3` |
| `--fs-body` | `text-sm` | `typo-body-sm` |
| `--fs-body-sm`, `--fs-caption` | `text-xs` | `typo-caption` |
| `--font-label` + `--ls-label` (rótulo mono caixa alta) | `text-xs uppercase` | `typo-eyebrow uppercase` (o Soft não tem fonte mono) |
| `--gap-section` | `gap-6` | `gap-5` |
| `--gap-card` | `gap-4` | `gap-4` |
| `--pad-card` | `p-6` | o padding do `Card` |
| `--dur-fast` / `--dur-base` | `duration-150` / `duration-200` | `duration-200 ease-out` |
| `Carregando` | `Spinner` | `LoadingState` |
| `ModalConfirmacao` | `AlertDialog` | `ConfirmModal` |
| `Card` (Barber) | `Card` (shadcn) | `Card` de `@/components/ui` |
| `StatCard` | card com `CardTitle` + número | `StatCard` de `@/components/ui` |
| `SegmentedControl`, `AtalhosPeriodo` | `ToggleGroup`, `Tabs` | `ChoiceChips` |
| `CardCaixa` | `Card` | `Card variant="soft"` de nível 2, em grade na raiz |

Se o valor não tem linha nesta tabela, procure em [traducao.md](traducao.md). Se não está
em nenhuma das duas, o token falta: acrescente em `src/styles/tokens.css` com um comentário
dizendo por que, em vez de escrever o valor cru na tela.
