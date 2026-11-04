import BlockIcon from "@mui/icons-material/Block";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import type { SvgIconProps } from "@mui/material/SvgIcon";

/** Ícones compartilhados usados nas ações do aplicativo. */
export type AppIconName =
  "block" | "sports" | "play" | "achievement" | "competitor" | "professional";

const icons = {
  block: BlockIcon,
  sports: SportsEsportsIcon,
  play: PlayArrowIcon,
  achievement: EmojiEventsIcon,
  competitor: MilitaryTechIcon,
  professional: WorkspacePremiumIcon,
};

/** Exibe um ícone Material padronizado pelo tema do aplicativo. */
export function AppIcon({
  name,
  ...props
}: SvgIconProps & { name: AppIconName }) {
  const Icon = icons[name];
  return <Icon {...props} />;
}
