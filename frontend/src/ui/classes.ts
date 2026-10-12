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
  btn: `rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  /** Botão de destaque (fundo claro). */
  btnSolid: `rounded border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  /** Link textual com sublinhado. */
  link: `text-sm text-zinc-400 underline underline-offset-2 hover:text-white ${focus}`,
  /** Texto auxiliar / secundário. */
  muted: "text-sm text-zinc-400",
  /** Título de página ou seção. */
  title: "text-lg font-medium",
  /** Barra superior (nav / header). */
  bar: "shrink-0 border-b border-zinc-700 px-4 py-3 sm:px-6",
  /** Container de página em coluna ocupando a altura disponível. */
  page: "flex h-full flex-col",
  /** Linha responsiva de controles (empilha no mobile). */
  row: "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
} as const;
