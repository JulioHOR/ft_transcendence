import Typography from "@mui/material/Typography";
import type { PageHeadingProps } from "./props";

/** Título visual de uma página ou seção. */
export function PageHeading({ children }: PageHeadingProps) {
  return <Typography variant="h2">{children}</Typography>;
}
