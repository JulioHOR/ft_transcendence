import TextField, { type TextFieldProps } from "@mui/material/TextField";

/** Campo Material UI com tamanho e variante padrão do aplicativo. */
export function AppTextField(props: TextFieldProps) {
  return <TextField size="small" fullWidth variant="outlined" {...props} />;
}
