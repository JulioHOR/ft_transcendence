import type { ReactNode } from "react";
import Badge from "@mui/material/Badge";

/** Posiciona o contador ao lado do conteúdo. */
const badgeSx = {
  display: "inline-flex",
  alignItems: "center",
  "& .MuiBadge-badge": { position: "static", transform: "none", ml: 0.75 },
};

/** Propriedades do contador de itens não lidos. */
type UnreadBadgeProps = {
  /** Quantidade de itens não lidos. */
  count: number;
  /** Texto ou elemento ao qual o contador será associado. */
  children: ReactNode;
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
