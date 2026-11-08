import BlockIcon from "@mui/icons-material/Block";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseCircleOutlinedIcon from "@mui/icons-material/PauseCircleOutlined";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import type { AppIconProps } from "./props";

export type { AppIconName } from "./props";

const icons = {
  block: BlockIcon,
  sports: SportsEsportsIcon,
  play: PlayArrowIcon,
  pause: PauseCircleOutlinedIcon,
  achievement: EmojiEventsIcon,
  competitor: MilitaryTechIcon,
  professional: WorkspacePremiumIcon,
};

/** Exibe um ícone Material padronizado pelo tema do aplicativo. */
export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = icons[name];
  return <Icon {...props} />;
}
