import { Link } from "react-router-dom";
import { resolveAvatarUrl } from "../api/profile";
import { ui } from "./classes";

/** Tamanhos suportados do avatar. */
export type AvatarSize = "sm" | "md" | "lg";

const sizeClass: Record<AvatarSize, string> = {
  sm: ui.avatarSm,
  md: ui.avatarMd,
  lg: ui.avatarLg,
};

/** Avatar circular; com userId vira link para o perfil. */
export function Avatar(props: {
  avatarUrl: string | null | undefined;
  alt: string;
  size?: AvatarSize;
  userId?: number;
}) {
  const image = (
    <img
      src={resolveAvatarUrl(props.avatarUrl)}
      alt={props.alt}
      className={`${ui.avatar} ${sizeClass[props.size ?? "md"]}`}
    />
  );
  if (props.userId == null) return image;
  return (
    <Link
      to={`/profile/${props.userId}`}
      className="shrink-0"
      aria-label={`Perfil de ${props.alt}`}
    >
      {image}
    </Link>
  );
}
