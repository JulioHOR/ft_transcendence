import Typography from "@mui/material/Typography";
import type { PageHeadingProps } from "./props";

/** Visual title for a page or section. */
export function PageHeading({ children }: PageHeadingProps) {
  return <Typography variant="h2">{children}</Typography>;
}
