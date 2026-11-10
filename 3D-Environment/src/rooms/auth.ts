import type { AuthContext } from "colyseus";

export type GameUser = {
    id : number;
    nickname : string;
};

const BACKEND_URL = process.env.BACKEND_URL ?? `https://backend:${process.env.BACKEND_INTERNAL_PORT}`;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ask for the client that has this cookie
async function fetchDashboardUser(cookie: string): Promise<GameUser | null> {
    const res = await fetch(`${BACKEND_URL}/api/me`, {
        headers: { cookie },
        signal: AbortSignal.timeout(3000),
    });
    if (res.status !== 200) return null;

    const body = (await res.json()) as Partial<GameUser>;
    if (typeof body.id !== "number" || typeof body.nickname !== "string") {
        return null;
    }
    return { id: body.id, nickname: body.nickname};
}

function guestUser(): GameUser {
    const n = Math.floor(Math.random() * 10_000);
    return { id: -n - 1, nickname: `dev_${n}`};
}

export async function authenticate(context: AuthContext): Promise<GameUser | false> {
    const cookie = context.headers.get("cookie");

    let user: GameUser | null = null;
    if (cookie) {
        try {
            user = await fetchDashboardUser(cookie);
        } catch (err) {
            console.error("dashboard auth failed:", err);
        }
    }
    if (user) return user;
    if (!IS_PRODUCTION) return guestUser();
    return false;
}
