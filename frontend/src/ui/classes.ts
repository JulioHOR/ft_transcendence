const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

export const ui = {
  field: `w-full min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 ${focus}`,
  btn: `rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  btnSolid: `rounded border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  link: `hover:text-white ${focus}`,
  muted: "text-sm text-zinc-400",
  title: "text-lg font-medium",
  bar: "shrink-0 border-b border-zinc-700 px-4 py-3 sm:px-6",
  page: "flex h-full flex-col",
  row: "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
} as const;
