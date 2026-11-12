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
import { logUnexpectedError } from "../api/http";
import { useAuth } from "./auth-session";
import { useChat } from "./chat-session";
import { useColorMode } from "../ui/color-mode-context";
import { UnreadBadge } from "../ui/UnreadBadge";
import { useFriends } from "./friends-session";
import type {
  MobileNavigationProps,
  MobilePageOptionsProps,
  NavigationProps,
  NavItemProps,
  NavItemUnreadProps,
  NavItemsProps,
} from "./props";

/** Navigation link with an active state and optional badge. */
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

/** Indicates whether the current route matches the navigation link. */
function navRouteSelected(to: string, pathname: string): boolean {
  return (
    pathname === to ||
    (to === "/login" && pathname === "/") ||
    (to === "/profile" && pathname.startsWith("/profile/"))
  );
}

/** Builds the application navigation bar. */
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

/** Gathers the data used by the desktop and mobile menus. */
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

/** Ends the session and returns the user to the login screen. */
function useSignOut() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  return {
    signedIn: user !== null,
    signOut: () => {
      void logout()
        .catch((failure: unknown) => {
          logUnexpectedError("Falha ao encerrar a sessão", failure);
        })
        .finally(() => {
          setUser(null);
          navigate("/login");
        });
    },
  };
}

/** Structural style for the navigation bar. */
const toolbarFrameSx = {
  px: 0,
  borderBottom: 1,
  borderColor: "divider",
};

/** Width and padding shared with the page content. */
const toolbarSx = {
  display: "flex",
  width: "100%",
  maxWidth: 1120,
  mx: "auto",
  px: { xs: 2, sm: 0 },
};

/** Links displayed in the main navigation. */
const navItems = [
  { label: "Entrar", to: "/login" },
  { label: "Perfil", to: "/profile" },
  { label: "Conversas", to: "/chat" },
  { label: "Amigos", to: "/friends" },
  { label: "Pong", to: "/pong" },
  { label: "Ambiente 3D", to: "/environment3d" },
] as const;

/** Returns the available routes based on the session state. */
function availableNavItems(signedIn: boolean) {
  return signedIn
    ? navItems.filter((item) => item.to !== "/login")
    : [navItems[0]];
}

/** Renders the navigation links and unread conversation counter. */
function NavItems({
  unread,
  pendingFriends,
  pathname,
  signedIn,
}: NavItemsProps) {
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

/** Style for horizontal links on larger screens. */
const navItemsSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
};

/** Displays links and the theme toggle in the large-screen layout. */
function DesktopNavigation(props: NavigationProps) {
  return (
    <Box sx={desktopNavigationSx}>
      <NavItems {...props} />
      <Button color="inherit" size="small" onClick={props.toggleMode}>
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

/** Responsive route selector with the current item already selected. */
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

/** Runs the selected option from the compact menu. */
function selectMobilePage(
  selected: string,
  props: MobileNavigationProps,
  navigate: NavigateFunction,
) {
  if (selected === "theme") props.toggleMode();
  else if (selected === "logout") props.signOut();
  else navigate(selected);
}

/** Navigation and theme options for the small-screen selector. */
function mobilePageOptions(props: MobilePageOptionsProps) {
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

/** Unread count displayed in the menu. */
function navItemUnread(path: string, props: NavItemUnreadProps): number {
  if (path === "/chat") return props.unread;
  if (path === "/friends") return props.pendingFriends;
  return 0;
}

/** Responsive layouts for the main navigation. */
const desktopNavigationSx = {
  display: { xs: "none", sm: "flex" },
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: 0.5,
};
