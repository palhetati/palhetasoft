---
name: palhetasoft-design
description: Use when creating, editing, styling, or refactoring any frontend screen, page, UI component, card layout, modal, confirmation flow, button, data grid, pagination, loading state, or user-facing text in the Palheta Soft repository.
---

# palhetasoft-design: Padrão de Interface e Experiência do Palheta Soft

## Visão Geral

Esta skill governa exclusivamente o frontend do repositório **Palheta Soft**. Toda criação ou refatoração visual deve obedecer simultaneamente à identidade de cores/superfícies do `DESIGN.md` e às regras estruturais, ergonômicas e de performance definidas abaixo.

**Princípio central:** Violar a letra destas regras é violar o espírito delas. Nenhuma pressa autoriza entregar seções estruturais espremidas lado a lado, fonte exagerada, tela travando sem `"Carregando..."`, enum cru na tela ou confirmação improvisada.

---

## 1. Estrutura da Tela (`flex-col`) vs. Elementos de Dados e Conteúdo (Formatação Livre)

1. **Toda tela mora dentro de um `Card`:** Nenhum conteúdo, filtro ou tabela fica solto direto no fundo da página. A página inteira vive dentro de um `Card` estrutural, e a hierarquia interna depende da tela: **pode haver `Card` dentro de `Card`** (por exemplo, o card-mestre da tela contendo subcards de indicadores, filtros e listagem), desde que a composição visual fique limpa, suave e coerente.
2. **Cards e Blocos de Estrutura da Tela (`flex flex-col` obrigatório):**
   - Quando o elemento divide a **estrutura macro da página** (card raiz da tela, card de seção de filtros, card de formulário de cadastro, card de tabela/listagem, seções principais), posicione **sempre em `flex flex-col`** (um embaixo do outro), tanto no desktop quanto no mobile.
   - Nunca coloque duas seções estruturais lado a lado (ex.: formulário na esquerda e tabela na direita em `grid-cols-2`).
3. **Cards de Indicadores/Badges de Dados e Itens Não-Estruturais (Formatação Livre):**
   - Quando o elemento exibe **dados rápidos, badges de métricas, KPIs** (como os cards de indicadores do Dashboard ou resumos numéricos), itens de catálogo ou controles internos que **não definem a estrutura macro da página**, a **formatação é livre** (`grid` responsivo, `flex-row`, `flex-wrap`, etc.).
4. **Mobile-First:** Toda tela e todo agrupamento livre de indicadores ou campos nasce pensado primeiro para o celular (`320px` a `600px`) e se expande suavemente para telas maiores.

```tsx
// Padrão obrigatório: estrutura macro em flex-col; cards de dados/badges livres
<Card variant="flat" className="flex flex-col gap-5">
  <PageHeader
    title="Painel Financeiro"
    helpTitle="Como ler o Painel Financeiro"
    helpText="Acompanhe aqui o saldo realizado, o faturamento e os últimos lançamentos."
  />

  {/* Cards de indicadores/badges de dados: livres para grid responsivo ou flex-wrap */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Card variant="featured-night" title="Líquido Realizado">{/* Valor */}</Card>
    <Card variant="soft" title="Faturamento Bruto">{/* Valor */}</Card>
    <Card variant="soft" title="Líquido Previsto">{/* Valor */}</Card>
    <Card variant="soft" title="Reserva Trabalhista">{/* Valor */}</Card>
  </div>

  {/* Seções estruturais da tela: sempre empilhadas uma embaixo da outra em flex-col */}
  <Card variant="soft" title="Filtros do Período">
    {/* Campos internos livres (flex-wrap / grid responsivo) */}
  </Card>

  <Card variant="flat" title="Histórico de Lançamentos">
    {carregando ? <LoadingState label="Carregando..." /> : <ResponsiveDataTable ... />}
  </Card>
</Card>
```

---

## 2. Base `DESIGN.md` e Projetos Irmãos de Referência

1. **Fonte Primária (`DESIGN.md`):** Use o arquivo `DESIGN.md` na raiz deste projeto para paleta de cores (`--color-canvas-soft`, `--color-surface`, `--color-primary`, `--color-hairline` e paleta de apoio), contraste de superfície e estrutura base. Você pode criar novos componentes reutilizáveis em `src/components/ui/` além dos listados no `DESIGN.md`, desde que obedeçam à linguagem visual do sistema.
2. **Referências Complementares (Projetos Irmãos em Next.js):**
   Caso precise de referência para criar ou refinar componentes que não estejam detalhados no `DESIGN.md`, consulte os projetos locais:
   - `C:\Users\joaov\Documents\joao\projetos\palhetabarber` (**Palheta Barber**)
   - `C:\Users\joaov\Documents\joao\projetos\mo-coworking-sic` (**SIC, Sistema de Contratos**)
   - **Regra de adaptação:** Nunca copie cores, fontes ou espaçamentos brutos desses projetos. Adapte o comportamento e a anatomia do componente respeitando 100% a paleta de cores, a fonte (`Inter`) e a suavidade do Palheta Soft.

---

## 3. Tipografia Proporcional (Sobrepõe Tamanhos Grandes do `DESIGN.md`)

Mesmo que o `DESIGN.md` documente fontes de marketing de `40px`, `54px` ou `64px`, **nunca utilize tamanhos de fonte gigantes no ERP**.

Mantenha uma escala proporcional, confortável e equilibrada:
- **Título da tela (`h1`):** `20px` a `22px` (`font-semibold`, destaque limpo sem exagero).
- **Subtítulo / Título de Card (`h2`/`h3`) e Valores de Resumo:** `16px` a `18px` (`font-medium` ou `font-semibold`).
- **Texto normal / Células / Inputs:** `14px` (`0.875rem`, leitura confortável).
- **Botões:** `13px` a `14px` (`font-medium`, nunca fonte grande).
- **Rótulos secundários, cabeçalhos de coluna e legendas:** `12px`.

---

## 4. Botão de Ajuda (Apenas Ícone) + Seção de Ajuda

- **Toda tela** deve ter obrigatoriamente um **botão de ajuda contendo apenas o ícone** (`CircleHelp`, sem texto ao lado do ícone, inclusive no mobile).
- Ao acionar o botão de ajuda (ou logo abaixo do cabeçalho da tela), exibe-se uma **seção de ajuda dedicada** (bloco expansível suave dentro do card da tela) explicando em linguagem simples o que o usuário faz naquela tela.

---

## 5. Linguagem Humana, Zero Travessões e Zero Nomes Técnicos

Toda a UI é feita para um **usuário não-técnico** (dono do estabelecimento, gerente, caixa, atendente):

1. **Zero Travessões e Zero Texto com Cara de IA:**
   - **Nunca** utilize travessões (`—`, `–`) nem hífen duplo (`--`) em títulos, dicas, alertas, modais, comentários visíveis ou botões.
   - Escreva frases curtas, diretas e naturais, usando vírgulas e pontos finais. Sem slogans artificiais ou frases narrando a tela.
2. **Proibido Exibir Nomes de Tabelas ou ENUMs Crus:**
   - **Tabelas** sempre ganham sinônimos claros do negócio (nunca escreva `parametros_web`, `cash_movements`, `sale_payments`, `system_modules`; escreva *"Configurações Gerais"*, *"Movimentações do Caixa"*, *"Formas de Pagamento"*, *"Menus do Sistema"*).
   - **ENUMs** sempre passam por um mapa de tradução legível antes de chegar na tela (nunca exiba `bleed_outflow`, `supply_inflow`, `simples_nacional`, `non_clt`, `manual_pos`; exiba *"Sangria"*, *"Suprimento de Troco"*, *"Simples Nacional"*, *"Diarista / Prestador"*, *"Pagamento no Balcão"*).

---

## 6. Performance Assíncrona, Pré-Load `"Carregando..."` e Feedback de Ação

1. **Entrada Imediata na Tela (Nada Trava a Navegação):**
   - Nenhuma tela pode demorar para abrir esperando consultas lentas bloqueantes.
   - Toda tela nova ou com pré-load de dados deve carregar seus dados pesados de forma **assíncrona** e exibir no centro da área um estado claro **`"Carregando..."` acompanhado de um spinner suave** até o pré-load concluir.
2. **Feedback Obrigatório em Confirmações e Submissões:**
   - Todo botão de salvar, confirmar, filtrar ou executar ação exibe obrigatoriamente **um spinner animado + texto de carregamento** (ex.: `"Carregando..."` ou `"Salvando..."`) e permanece bloqueado contra duplo clique até a resposta terminar, mantendo a segurança e consistência dos dados.

---

## 7. Ações Destrutivas e Importantes: `ConfirmModal` Único e Compartilhado

- **Proibido** usar `window.confirm()`, `window.alert()` ou `window.prompt()`.
- **Proibido** criar um modal de confirmação avulso dentro do arquivo de cada tela.
- Utilize (ou crie em `src/components/ui/confirm-modal.tsx`, caso ainda não exista, exportando em `@/components/ui`) **um único componente compartilhado `ConfirmModal`** para todo o sistema, contendo:
  - Título claro em forma de pergunta,
  - Explicação objetiva do impacto para o usuário leigo,
  - Botão `Cancelar` e botão de confirmação com **spinner obrigatório** (`loading={isPending}`) até a conclusão da ação, permanecendo aberto se houver erro para mostrar o alerta ao usuário.

---

## 8. Regras Obrigatórias para Grids (Tabelas de Dados)

1. **Scroll Horizontal no Mobile:**
   - Todo grid deve estar envolvido em um container com `overflow-x-auto` (`-webkit-overflow-scrolling: touch`) para permitir rolagem horizontal fluida no celular sem cortar colunas nem espremer dados.
2. **Textos Grandes em Colunas (`...` + Tooltip):**
   - Células com textos longos devem truncar com reticências (`truncate` + largura máxima coerente) e exibir **obrigatoriamente um tooltip** com o texto completo ao passar o mouse ou tocar.
3. **Paginação via Supabase SDK:**
   - **Poucos dados:** Grids com volume comprovadamente pequeno e fixo podem operar sem paginação.
   - **Muitos dados (crescimento contínuo):** Devem **obrigatoriamente** paginar no backend usando o **Supabase SDK** (`.range(from, to)`), implementando um destes dois padrões:
     - **Modo A (Paginação Normal Numerada):** Controles de página (`1, 2, 3...`) buscando cada página no backend via Supabase SDK.
     - **Modo B (Scroll Infinito):** Carregamento progressivo em lotes no backend via Supabase SDK conforme o usuário rola a lista, sem números de página.
   - **Regra de decisão:** Se o requisito não especificar qual dos dois modos usar e ambos forem plausíveis para aquela tela, **pergunte ao usuário qual se encaixa melhor antes de implementar**.
4. **Botões de Ação nas Linhas do Grid:**
   - **Poucos botões (até 4 ações):** Renderize **apenas o ícone** de cada ação (sem rótulo de texto na linha) com **tooltip obrigatório** informando exatamente o que o botão faz.
   - **Muitos botões (mais de 4 ações):** Renderize um botão de ícone de mais opções (`MoreVertical` / `MoreHorizontal`, com tooltip *"Mais ações"*) que abre um **menu dropdown suave** contendo as ações com seus respectivos ícones e nomes.

---

## 9. Botões, Sombras e Transições Suaves

- **Reuso estrito:** Utilize sempre os componentes exportados em `@/components/ui`.
- **Estilo dos botões:** Aparência suave, fonte comedida (`13px` a `14px`), sombras delicadas (`shadow-soft`), cores contextuais adequadas a cada situação (primária azul `#0075de` para ação principal, neutra suave para utilitários, tom de perigo/alerta suave para exclusão, verde/teal suave para confirmação positiva) e **animação suave de toque** (`transition-all duration-200 ease-out active:scale-[0.98]`).
- **Zero transições secas:** Toda interação na UI (abrir/fechar seção de ajuda, abrir modal, expandir dropdown, trocar estado de carregamento, abrir/recolher sidebar) deve ter transição suave (`duration-200 ease-out`).

---

## Racionalizações Comuns (Pare Imediatamente)

| Desculpa / Pensamento | Realidade |
|---|---|
| "Vou colocar o card de cadastro ao lado do card da tabela em duas colunas no desktop" | Proibido para itens de estrutura. Seções estruturais da tela ficam sempre em `flex flex-col` (uma embaixo da outra). Apenas cards de indicadores/badges de dados (como KPIs do Dashboard) e elementos internos não-estruturais têm formatação livre. |
| "O `DESIGN.md` tem `40px` e `64px`, vou usar no título ou no valor do KPI" | Proibido. Valores gigantes estouram a harmonia do ERP; mantenha a escala proporcional (`20px-22px` título, `16px-18px` subtítulo/destaque). |
| "São 5 ações pequenas, cabem em linha na tabela" | Mais de 4 ações exigem obrigatoriamente menu dropdown com ícones. Até 4 ações usam apenas ícone + tooltip obrigatório. |
| "Já sei qual paginação escolher para essa tabela grande" | Se não foi definido entre paginação numerada ou scroll infinito, pergunte ao usuário qual prefere. |
| "Vou montar um `<Modal>` rápido de exclusão aqui mesmo na página" | Proibido. Use ou crie o componente global compartilhado `ConfirmModal` em `src/components/ui/`. |
| "Server Component já carrega rápido, não preciso de `Carregando...` com spin" | Toda tela nova/com pré-load deve rodar de forma assíncrona exibindo `"Carregando..."` com spinner até concluir, sem travar a entrada na tela. |
| "Vou escrever o texto da tabela/enum só como subtítulo técnico" | Nunca exiba nomes de tabelas ou ENUMs crus para o usuário. Traduza tudo para termos humanos. |
| "Vou colocar texto 'Ajuda' ao lado do ícone `?` para ficar visível" | O botão de ajuda deve ter **apenas o ícone** (mesmo no mobile), abrindo a seção de ajuda da tela. |

## Red Flags (Lista de Verificação Rápida antes de Entregar)

- [ ] A tela inteira mora dentro de um `Card` e as seções estruturais seguem `flex flex-col` (deixando `grid`/`flex-row` livre apenas para cards de indicadores/badges de dados e conteúdos internos não-estruturais)?
- [ ] As fontes estão proporcionais (sem `40px`/`54px`/`64px`) e mantendo hierarquia título > subtítulo > corpo?
- [ ] Existe botão de ajuda **apenas com ícone** (inclusive no mobile) abrindo a **seção de ajuda** da tela?
- [ ] Toda tela nova/pré-load roda assíncrona mostrando `"Carregando..."` com spinner, sem travar a abertura?
- [ ] Todo modal/botão de confirmação usa `ConfirmModal` compartilhado e mostra spinner até concluir?
- [ ] Zero travessões (`—`, `–`, `--`), zero nomes de tabelas e zero ENUMs crus na interface?
- [ ] O grid tem scroll horizontal no mobile (`overflow-x-auto`), textos longos com `...` + tooltip, ícones com tooltip (<= 4 ações) ou dropdown (> 4 ações), e paginação via Supabase SDK alinhada com o usuário?
- [ ] Todas as transições de botões, modais, dropdowns e sidebar são suaves?
