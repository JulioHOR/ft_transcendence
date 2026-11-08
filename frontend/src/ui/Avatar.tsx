import { Link as RouterLink } from "react-router-dom";
import MuiAvatar from "@mui/material/Avatar";
import MuiLink from "@mui/material/Link";
import { resolveAvatarUrl } from "../api/profile";
import type { AvatarProps, AvatarSize, LinkedAvatarProps } from "./props";

export type { AvatarSize } from "./props";

/** Dimensões em pixels para cada tamanho de avatar suportado. */
const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 80,
  xl: 96,
};

/** Avatar circular; com userId vira link para o perfil. */
export function Avatar(props: AvatarProps) {
  const size = sizePx[props.size ?? "md"];
  const image = (
    <MuiAvatar
      src={resolveAvatarUrl(props.avatarUrl)}
      alt={props.alt}
      sx={{
        width: size,
        height: size,
        border: 1,
        borderColor: props.borderColor ?? "divider",
      }}
    />
  );
  if (props.userId == null) return image;
  return (
    <LinkedAvatar userId={props.userId} label={props.alt}>
      {image}
    </LinkedAvatar>
  );
}

/** Envolve o avatar em um link para o perfil. */
function LinkedAvatar({ userId, label, children }: LinkedAvatarProps) {
  return (
    <MuiLink
      component={RouterLink}
      to={`/profile/${userId}`}
      sx={{ flexShrink: 0, display: "inline-flex" }}
      aria-label={`Perfil de ${label}`}
    >
      {children}
    </MuiLink>
  );
}
