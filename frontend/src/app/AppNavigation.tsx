import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import { logout } from "../api/auth";
import { useAuth } from "./auth-session";
import { useChat } from "./chat-session";
import { useColorMode } from "../ui/color-mode-context";
import { UnreadBadge } from "../ui/UnreadBadge";
import { useFriends } from "./friends-session";

/** Propriedades de um link da navegação. */
type NavItemProps = {
  /** Caminho associado ao link. */
  to: string;
  /** Texto mostrado no link. */
  label: string;
  /** Caminho atual, usado para marcar o link ativo. */
  pathname: string;
  /** Total não lido, usado apenas no link de conversas. */
  unread?: number;
  /** Solicitações pendentes, usadas apenas no link de amigos. */
  pendingFriends?: number;
};

/** Link da navegação com estado ativo e badge opcional. */
function NavItem(props: NavItemProps) {
  const selected = navRouteSelected(props.to, props.pathname);
  return (
    <Button
      component={RouterLink}
      to={props.to}
      color={selected ? "primary" : "inherit"}
      variant={selected ? "contained" : "text"}
      aria-current={selected ? "page" : undefined}
      size="small"
    >
      <UnreadBadge count={props.unread ?? props.pendingFriends ?? 0}>
        {props.label}
      </UnreadBadge>
    </Button>
  );
}

/** Indica se a rota atual corresponde ao link da navegação. */
function navRouteSelected(to: string, pathname: string): boolean {
  return (
    pathname === to ||
    (to === "/login" && pathname === "/") ||
    (to === "/profile" && pathname.startsWith("/profile/"))
  );
}

/** Monta a barra de navegação da aplicação. */
export function AppNavigation() {
  const menuProps = useNavigationProps();
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar component="nav" aria-label="Principal" sx={toolbarFrameSx}>
        <Box sx={toolbarSx}>
          <DesktopNavigation {...menuProps} />
          <MobilePageSelect {...menuProps} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

/** Reúne os dados usados pelos menus para desktop e celular. */
function useNavigationProps(): NavigationProps {
  const { unreadTotal } = useChat();
  const { pendingCount } = useFriends();
  const { mode, toggleMode } = useColorMode();
  const { pathname } = useLocation();
  const { signedIn, signOut } = useSignOut();
  return {
    pathname,
    unread: unreadTotal,
    pendingFriends: pendingCount,
    mode,
    toggleMode,
    signedIn,
    signOut,
  };
}

/** Encerra a sessão e devolve o usuário à tela de entrada. */
function useSignOut() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  return {
    signedIn: user !== null,
    signOut: () => {
      void logout()
        .catch(() => undefined)
        .finally(() => {
          setUser(null);
          navigate("/login");
        });
    },
  };
}

/** Estilo da barra estrutural do navbar. */
const toolbarFrameSx = {
  px: 0,
  borderBottom: 1,
  borderColor: "divider",
};

/** Largura e recuo compartilhados com o conteúdo das páginas. */
const toolbarSx = {
  display: "flex",
  width: "100%",
  maxWidth: 1120,
  mx: "auto",
  px: { xs: 2, sm: 0 },
};

/** Links exibidos na navegação principal. */
const navItems = [
  { label: "Entrar", to: "/login" },
  { label: "Perfil", to: "/profile" },
  { label: "Conversas", to: "/chat" },
  { label: "Amigos", to: "/friends" },
  { label: "Pong", to: "/pong" },
] as const;

/** Retorna as rotas disponíveis conforme o estado da sessão. */
function availableNavItems(signedIn: boolean) {
  return signedIn
    ? navItems.filter((item) => item.to !== "/login")
    : [navItems[0]];
}

/** Estado necessário para exibir a navegação principal. */
type NavigationProps = {
  /** Total de mensagens não lidas. */
  unread: number;
  pendingFriends: number;
  /** Caminho atual da aplicação. */
  pathname: string;
  /** Tema atual e ação de alternância. */
  mode: "dark" | "light";
  toggleMode: () => void;
  signedIn: boolean;
  signOut: () => void;
};

type MobileNavigationProps = Pick<
  NavigationProps,
  | "pathname"
  | "unread"
  | "pendingFriends"
  | "mode"
  | "toggleMode"
  | "signedIn"
  | "signOut"
>;

/** Renderiza os links da navegação e o contador de conversas não lidas. */
function NavItems({
  unread,
  pendingFriends,
  pathname,
  signedIn,
}: Pick<
  NavigationProps,
  "unread" | "pendingFriends" | "pathname" | "signedIn"
>) {
  return (
    <Box sx={navItemsSx}>
      {availableNavItems(signedIn).map((item) => (
        <NavItem
          key={item.to}
          {...item}
          pathname={pathname}
          unread={item.to === "/chat" ? unread : undefined}
          pendingFriends={item.to === "/friends" ? pendingFriends : undefined}
        />
      ))}
    </Box>
  );
}

/** Estilo dos links horizontais em telas maiores. */
const navItemsSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
};

/** Exibe links e alternância de tema no layout para telas maiores. */
function DesktopNavigation(props: NavigationProps) {
  return (
    <Box sx={desktopNavigationSx}>
      <NavItems {...props} />
      <Button
        color="inherit"
        size="small"
        onClick={props.toggleMode}
      >
        Tema: {props.mode === "dark" ? "escuro" : "claro"}
      </Button>
      {props.signedIn ? (
        <Button color="inherit" size="small" onClick={props.signOut}>
          Sair
        </Button>
      ) : null}
    </Box>
  );
}

/** Seletor responsivo de rotas, com o item atual já selecionado. */
function MobilePageSelect(props: MobileNavigationProps) {
  const navigate = useNavigate();
  const availableItems = availableNavItems(props.signedIn);
  const selectedItem =
    availableItems.find((item) => navRouteSelected(item.to, props.pathname)) ??
    availableItems[0];
  return (
    <Select
      size="small"
      fullWidth
      value={selectedItem.to}
      sx={{ display: { xs: "flex", sm: "none" } }}
      inputProps={{ "aria-label": "Navegar para página" }}
      onChange={(event) =>
        selectMobilePage(String(event.target.value), props, navigate)
      }
    >
      {mobilePageOptions(props)}
    </Select>
  );
}

/** Executa a opção selecionada no menu compacto. */
function selectMobilePage(
  selected: string,
  props: MobileNavigationProps,
  navigate: NavigateFunction,
) {
  if (selected === "theme") props.toggleMode();
  else if (selected === "logout") props.signOut();
  else navigate(selected);
}

/** Opções de navegação e tema do seletor para telas pequenas. */
function mobilePageOptions(
  props: Pick<
    NavigationProps,
    "unread" | "pendingFriends" | "mode" | "signedIn"
  >,
) {
  return [
    ...availableNavItems(props.signedIn).map((item) => (
      <MenuItem key={item.to} value={item.to}>
        <UnreadBadge count={navItemUnread(item.to, props)}>
          {item.label}
        </UnreadBadge>
      </MenuItem>
    )),
    <MenuItem key="theme" value="theme">
      Usar tema {props.mode === "dark" ? "claro" : "escuro"}
    </MenuItem>,
    props.signedIn ? (
      <MenuItem key="logout" value="logout">
        Sair
      </MenuItem>
    ) : null,
  ];
}

/** Quantidade não lida exibida no menu. */
function navItemUnread(
  path: string,
  props: Pick<NavigationProps, "unread" | "pendingFriends">,
): number {
  if (path === "/chat") return props.unread;
  if (path === "/friends") return props.pendingFriends;
  return 0;
}

/** Layouts responsivos da navegação principal. */
const desktopNavigationSx = {
  display: { xs: "none", sm: "flex" },
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: 0.5,
};
