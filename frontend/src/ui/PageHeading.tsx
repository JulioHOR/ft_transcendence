import Typography from "@mui/material/Typography";

/** Título visual de uma página ou seção. */
export function PageHeading({ children }: { children: string }) {
  return <Typography variant="h2">{children}</Typography>;
}
