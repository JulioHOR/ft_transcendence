import Badge from "@mui/material/Badge";
import type { UnreadBadgeProps } from "./props";

/** Posiciona o contador ao lado do conteúdo. */
const badgeSx = {
  display: "inline-flex",
  alignItems: "center",
  "& .MuiBadge-badge": { position: "static", transform: "none", ml: 0.75 },
};

/** Exibe o total não lido junto ao conteúdo quando ele é maior que zero. */
export function UnreadBadge({ count, children }: UnreadBadgeProps) {
  if (count === 0) return children;
  return (
    <Badge badgeContent={count} color="secondary" max={99} sx={badgeSx}>
      {children}
    </Badge>
  );
}
