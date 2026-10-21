import { Link as RouterLink } from "react-router-dom";
import MuiAvatar from "@mui/material/Avatar";
import MuiLink from "@mui/material/Link";
import { resolveAvatarUrl } from "../api/profile";

/** Tamanhos suportados do avatar. */
export type AvatarSize = "sm" | "md" | "lg";

/** Dimensões em pixels para cada tamanho de avatar suportado. */
const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 80,
};

/** Avatar circular; com userId vira link para o perfil. */
export function Avatar(props: {
  avatarUrl: string | null | undefined;
  alt: string;
  size?: AvatarSize;
  userId?: number;
}) {
  const size = sizePx[props.size ?? "md"];
  const image = (
    <MuiAvatar
      src={resolveAvatarUrl(props.avatarUrl)}
      alt={props.alt}
      sx={{ width: size, height: size, border: 1, borderColor: "divider" }}
    />
  );
  if (props.userId == null) return image;
  return (
    <LinkedAvatar userId={props.userId} label={props.alt}>
      {image}
    </LinkedAvatar>
  );
}

function LinkedAvatar({
  userId,
  label,
  children,
}: {
  userId: number;
  label: string;
  children: React.ReactNode;
}) {
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
