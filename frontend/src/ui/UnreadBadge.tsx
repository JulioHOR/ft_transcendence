import Badge from "@mui/material/Badge";
import type { UnreadBadgeProps } from "./props";

/** Positions the counter beside the content. */
const badgeSx = {
  display: "inline-flex",
  alignItems: "center",
  "& .MuiBadge-badge": { position: "static", transform: "none", ml: 0.75 },
};

/** Displays the unread total beside the content when it is greater than zero. */
export function UnreadBadge({ count, children }: UnreadBadgeProps) {
  if (count === 0) return children;
  return (
    <Badge badgeContent={count} color="secondary" max={99} sx={badgeSx}>
      {children}
    </Badge>
  );
}
