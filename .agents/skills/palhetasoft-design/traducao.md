# Tradução: DESIGN.md → tokens do Palheta Soft

Toda referência do `DESIGN.md` passa por aqui antes de virar código. A coluna da
direita é o que você escreve. A da esquerda nunca é escrita.

Os tokens moram em `src/styles/tokens.css`. As cores e raios do bloco `@theme` viram
classes do Tailwind (`--color-ink-muted` → `text-ink-muted`, `bg-ink-muted`,
`border-ink-muted`; `--radius-lg` → `rounded-lg`; `--shadow-soft` → `shadow-soft`).

## Cor

| DESIGN.md | Classe do projeto |
|---|---|
| `colors.primary` #0075de | `bg-primary` / `text-primary`. Só ação principal, link e foco. Botão: `Button variant="primary"` |
| `colors.primary-active` #005bab | `bg-primary-active` (o `Button` já usa no hover/press) |
| `colors.secondary` #213183 | `Card variant="featured-night"`. Uma vez por tela, num indicador |
| `colors.on-primary` | `text-on-primary` (texto sobre `primary` ou `featured-night`) |
| `colors.canvas` / `colors.surface` | `bg-surface` (card raiz, tabela, input, modal) |
| `colors.canvas-soft` #f6f5f4 | `bg-canvas-soft` (piso da página, já no `body`; card `soft`; cabeçalho de tabela) |
| `colors.ink` | `text-ink` (título, valor, texto principal) |
| `colors.ink-secondary` | `text-ink-secondary` (texto corrido, rótulo de campo) |
| `colors.ink-muted` | `text-ink-muted` (subtítulo, nota, contagem) |
| `colors.ink-faint` | `text-ink-faint` (placeholder, metadado fraco) |
| `colors.hairline` | `border-hairline` (borda de card, divisor, linha de tabela) |
| borda de input `rgb(221,221,221)` | o `Input`/`Select` já aplica (`--color-input-border`) |
| `accent-sky`, `accent-purple`, `accent-pink`, `accent-orange`, `accent-teal`, `accent-green`, `accent-brown` | `Badge sticker="sky"…` e ícones. **Nunca** fundo de seção ou de card |
| `accent-orange-deep` | `text-accent-orange-deep`: pendente, alerta, ação destrutiva (o `danger-utility` já usa) |
| `accent-teal` | `Button variant="success"`: confirmação positiva |
| `accent-green` | sinal de "ok/pago" em `Badge`, ícone ou texto curto |
| `accent-purple-deep`, `accent-brown` | só em `Badge`/ícone, se tiverem significado |
| paleta padrão do Tailwind (`blue-500`, `gray-600`, `red-50`…) | **Não existe aqui.** Use a linha correspondente acima |

## Tipografia

| DESIGN.md | Classe do projeto |
|---|---|
| NotionInter | Inter (já no layout). Nunca outra fonte |
| `display-1` 64px · `display-2` 54px · `heading-1` 40px | `typo-heading-1` (20 → 24px). **Só o título da tela**, que o `PageHeader` já desenha |
| `heading-2` 26px | `typo-heading-2` (18 → 20px): valor de indicador, total de destaque |
| `heading-3` 22px · `title` 20px | `typo-heading-3` (16 → 17px): **título de seção** (o `title` do `Card` já aplica) |
| `body-md` 16px | `typo-body-md` (14px) |
| `body-sm` 15px | `typo-body-sm` (14px): célula, texto denso, input |
| `button` 16px | `typo-button` (13 → 14px), já no `Button` |
| `caption` 14px | `typo-caption` (12px): rótulo de indicador e de campo, subtítulo, legenda. **Nunca título de seção** |
| `eyebrow` 12px / 600 | `typo-eyebrow` + `uppercase` (11,5px): cabeçalho de coluna, selo |
| peso 700 nos títulos | o peso da classe `typo-*` (600). Nunca `font-bold` |
| tracking negativo de display | já está dentro das classes `typo-heading-*`. Não acrescente `tracking-*` |
| `lnum` / `locl` | já ligados no `body` |

## Raio

| DESIGN.md | Classe |
|---|---|
| `rounded.xs` 4px | `rounded-xs`: input, select, chip pequeno |
| `rounded.sm` 5px | `rounded-sm`: item de menu, linha de lista |
| `rounded.md` 8px | `rounded-md`: botão utilitário, bloco interno sem borda |
| `rounded.lg` 12px | `rounded-lg`: card (o `Card` já aplica), moldura de tabela |
| `rounded.xl` 16px | `rounded-xl`: modal (o `Modal` já aplica), contêiner grande |
| `rounded.full` | `rounded-full`: `Button primary`/`secondary`, botão de ícone circular, `Badge`. Nunca input |

## Espaço

| DESIGN.md | Classe |
|---|---|
| base 8px, `spacing.xxs`…`xxl` (4–32px) | escala do Tailwind: `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px |
| padding de card 24px | o padding do `Card` (`p-4 sm:p-6`). Não sobrescreva |
| vão entre seções ("large vertical gaps") | `gap-5` no card raiz |
| vão entre cards de uma grade / campos | `gap-4` |
| vão entre botões, ícones | `gap-2` |
| container ~1080–1300px | o `app-shell` já limita. Dentro dele, grade `auto-fit` |
| grade 2-up / 3-up / 4-up | `grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]` |
| altura de toque 44px | o `Button` e o `Input` já garantem ~40–42px |

## Elevação

| DESIGN.md | Classe |
|---|---|
| Level 0, flat (hairline, sem sombra) | `border border-hairline` (padrão do `Card`) |
| Level 1, soft (micro-sombra em camadas) | `shadow-soft`: botão, `Card variant="elevated"`, foco de input |
| Level 2, elevated | `shadow-elevated`: modal, dropdown, popover |
| sombra forte | **Não existe.** Nunca `shadow-md`, `shadow-lg`, `shadow-xl` |

## Componentes

| DESIGN.md | No projeto |
|---|---|
| `button-primary` / `-pressed` | `Button variant="primary"` |
| `button-secondary` | `Button variant="secondary"` |
| `button-utility` | `Button variant="utility"` |
| `button-icon-circular` | `Button variant="icon-circular"` dentro de `Tooltip` |
| `badge-pill` | `Badge` |
| `feature-card` | `Card variant="flat"` ou `"soft"` |
| `feature-card-elevated` | `Card variant="elevated"` (raro; nunca dentro da raiz como seção) |
| `pricing-plan-card-featured` | `Card variant="soft"` (destaque por tom de superfície) |
| `ex-pricing-tier-featured` / `hero-band` | `StatCard tone="featured"` (indicador principal, um por tela) |
| card de número / métrica | `StatCard` |
| grade de escolha / seletor de categoria | `TileButton` / `ChoiceChips` |
| `text-input` | `Input`, `Textarea`, `Select` |
| `ex-data-table-cell` | `ResponsiveDataTable` |
| `ex-modal-card` | `Modal`; confirmação é `ConfirmModal` |
| `ex-empty-state-card` | `emptyMessage` do `ResponsiveDataTable`, ou `Card variant="soft"` com `typo-body-md text-ink-muted` |
| `ex-app-shell-row` | `src/components/layout/sidebar-nav.tsx` (já resolvido) |
| `ex-toast` | `Alert` dentro do card afetado |

## Movimento

O `DESIGN.md` não documenta hover nem tempo de transição. Ambos vêm do projeto:

| Situação | Classe |
|---|---|
| Hover, troca de estado, abrir ajuda, modal, dropdown | `transition-all duration-200 ease-out` |
| Toque em botão | `active:scale-[0.98]` (já no `Button`) |
| Carregamento | `LoadingState` / `Button loading`. Nunca `animate-spin` escrito na tela |

## Quando não existe token

Falta um valor? Não escreva hexadecimal nem `text-[…]` na tela. Acrescente o token em
`src/styles/tokens.css` (cor e raio no `@theme`, o resto em `:root`), com um comentário
dizendo por que nenhum dos existentes servia.
