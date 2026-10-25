import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

/** Ícones compartilhados usados nas ações do aplicativo. */
export type AppIconName = "block" | "sports" | "play";

const iconPaths: Record<AppIconName, string> = {
  block: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-7 10a7 7 0 0 1 11.95-4.95L7.05 16.95A6.97 6.97 0 0 1 5 12Zm7 7a6.97 6.97 0 0 1-4.95-2.05l9.9-9.9A7 7 0 0 1 12 19Z",
  sports: "M20.57 14.86 22 13.43l-1.42-1.42-1.43 1.42-1.42-1.42 1.42-1.42-1.42-1.42-1.42 1.42-1.42-1.42 1.42-1.42-1.42-1.42-1.42 1.42-1.42-1.42 1.42-1.42L12.62 3.5 11.2 4.92 9.78 3.5 8.36 4.92 9.78 6.34 8.36 7.76 6.94 6.34 5.52 7.76l1.42 1.42-1.42 1.42 1.42 1.42 1.42-1.42 1.42 1.42-1.42 1.42 1.42 1.42 1.42-1.42 1.42 1.42-1.42 1.42 1.42 1.42 1.42-1.42 1.42 1.42 1.42-1.42-1.42-1.42 1.42-1.42 1.42 1.42ZM8 10h2v2H8v-2Zm6 4h-2v-2h2v2Zm0-4h-2V8h2v2Z",
  play: "M8 5v14l11-7z",
};

/** Exibe um ícone vetorial padronizado pelo tema Material UI. */
export function AppIcon({
  name,
  ...props
}: Omit<SvgIconProps, "children"> & { name: AppIconName }) {
  return (
    <SvgIcon {...props}>
      <path d={iconPaths[name]} />
    </SvgIcon>
  );
}
