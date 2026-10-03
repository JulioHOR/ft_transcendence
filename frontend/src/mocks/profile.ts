import { me } from "../api/auth";
import type { User } from "../api/types";

const STORAGE_KEY = "mock-profile-nickname";

export async function getProfile(): Promise<User> {
  const user = await me();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return user;
  try {
    const { userId, nickname } = JSON.parse(raw);
    if (userId !== user.id) return user;
    return { ...user, nickname };
  } catch {
    return user;
  }
}

export async function updateNickname(nickname: string): Promise<User> {
    const user = await me();
    const updatedUser = { ...user, nickname };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id, nickname }));
    return updatedUser;
}

