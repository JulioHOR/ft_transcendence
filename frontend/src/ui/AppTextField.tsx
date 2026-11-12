import TextField from "@mui/material/TextField";
import type { AppTextFieldProps } from "./props";

/** Material UI field with the application's default size and variant. */
export function AppTextField(props: AppTextFieldProps) {
  return <TextField size="small" fullWidth variant="outlined" {...props} />;
}
