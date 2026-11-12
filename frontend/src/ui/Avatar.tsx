import { Link as RouterLink } from "react-router-dom";
import MuiAvatar from "@mui/material/Avatar";
import MuiLink from "@mui/material/Link";
import { resolveAvatarUrl } from "../api/profile";
import type { AvatarProps, AvatarSize, LinkedAvatarProps } from "./props";

export type { AvatarSize } from "./props";

/** Pixel dimensions for each supported avatar size. */
const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 80,
  xl: 96,
};

/** Circular avatar; becomes a profile link when userId is provided. */
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

/** Wraps the avatar in a link to the profile. */
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
