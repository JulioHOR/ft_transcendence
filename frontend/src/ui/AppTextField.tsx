import TextField from "@mui/material/TextField";
import type { AppTextFieldProps } from "./props";

/** Campo Material UI com tamanho e variante padrão do aplicativo. */
export function AppTextField(props: AppTextFieldProps) {
  return <TextField size="small" fullWidth variant="outlined" {...props} />;
}
