const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

/**
 * Classes utilitárias compartilhadas da interface.
 * Centraliza combinações Tailwind reutilizadas pelas páginas.
 */
export const ui = {
  /** Campo de texto de formulário. */
  field: `w-full min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 ${focus}`,
  /** Botão secundário com borda. */
  btn: `shrink-0 rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  /** Botão de destaque (fundo claro). */
  btnSolid: `shrink-0 rounded border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  /** Link textual com sublinhado. */
  link: `text-sm text-zinc-400 underline underline-offset-2 hover:text-white ${focus}`,
  /** Link de nome/nickname para perfil. */
  nameLink: `font-medium text-zinc-200 underline-offset-2 hover:underline ${focus}`,
  /** Label visível de formulário. */
  label: "text-sm text-zinc-400",
  /** Texto auxiliar / secundário. */
  muted: "text-sm text-zinc-400",
  /** Texto de erro. */
  error: "text-sm text-red-400",
  /** Texto primário do conteúdo. */
  text: "text-zinc-200",
  /** Título de página ou seção. */
  title: "text-lg font-medium",
  /** Barra superior (nav / header). */
  bar: "shrink-0 border-b border-zinc-700 px-4 py-3 sm:px-6",
  /** Container de página em coluna ocupando a altura disponível. */
  page: "flex h-full w-full flex-col",
  /** Página com padding, scroll e largura total. */
  pageShell:
    "flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:gap-5 sm:p-6",
  /** Área de conteúdo que cresce e ocupa o espaço restante. */
  content: "flex min-h-0 w-full flex-1 flex-col gap-4",
  /** Painel com borda e espaçamento interno. */
  panel: "w-full rounded border border-zinc-700 p-3 sm:p-4",
  /** Linha responsiva de controles alinhados na base (100% largura). */
  row: "flex w-full flex-col gap-2 sm:flex-row sm:items-end",
  /** Coluna de formulário em largura total. */
  formCol: "flex w-full flex-col gap-2",
  /** Campo com label empilhados. */
  fieldBlock: "flex min-w-0 w-full flex-1 flex-col gap-1",
  /** Pilha vertical com espaçamento curto. */
  stack: "flex w-full flex-col gap-2",
  /** Pilha vertical com espaçamento médio. */
  stackMd: "flex w-full flex-col gap-3",
  /** Pilha vertical com espaçamento largo. */
  stackLg: "flex w-full flex-col gap-6",
  /** Linha horizontal com espaçamento curto (100% largura). */
  inline: "flex w-full items-center gap-2",
  /** Linha de itens alinhados ao centro. */
  inlineCenter: "flex items-center gap-2",
  /** Linha que quebra em várias linhas. */
  wrap: "flex w-full flex-wrap items-center gap-2",
  /** Linha de lista com itens que podem quebrar. */
  listRow: "flex w-full flex-wrap items-center gap-3",
  /** Quadro de mensagens (lista + rodapé de digitação). */
  messagePanel:
    "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded border border-zinc-700",
  /** Lista rolável dentro do quadro de mensagens. */
  messageList: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3",
  /** Rodapé interno do quadro (digitando…). */
  messageFooter:
    "shrink-0 border-t border-zinc-700 px-3 py-1.5 text-sm text-zinc-400",
  /** Linha de uma mensagem do chat. */
  messageRow: "flex w-full items-center gap-2",
  /** Recibo entregue (um ✓) à direita do texto. */
  receiptDelivered: "ml-1 text-sky-400",
  /** Recibo visualizado (dois ✓) à direita do texto. */
  receiptSeen: "ml-1 text-emerald-400",
  /** Base visual do avatar (tamanho via Avatar). */
  avatar: "shrink-0 rounded-full border border-zinc-700 object-cover",
  /** Avatar pequeno (listas / chat). */
  avatarSm: "h-8 w-8",
  /** Avatar médio. */
  avatarMd: "h-10 w-10",
  /** Avatar grande (perfil). */
  avatarLg: "h-20 w-20",
  /** Input de arquivo oculto (acionado por botão). */
  fileInput: "hidden",
  /** Status online na lista de friends. */
  online: "text-sm text-green-400",
  /** Status offline na lista de friends. */
  offline: "text-sm text-zinc-500",
  /** Aba inativa do chat. */
  tab: `rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 ${focus}`,
  /** Aba ativa do chat. */
  tabActive: `rounded border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 ${focus}`,
  /** Botão para fechar aba de chat privado. */
  tabClose: `rounded border border-zinc-700 px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 ${focus}`,
} as const;
