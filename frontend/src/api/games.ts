import { apiFetch } from "./api";
import { gameStartUrl } from "./endpoints";
import { errorMessage } from "./http";

export type GameCharacter = "1" | "2" | "3";

/** Envia o personagem escolhido antes de transferir o navegador para o jogo. */
export async function startGame(character: GameCharacter): Promise<void> {
  const response = await apiFetch(gameStartUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character }),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "Falha ao iniciar o jogo"),
    );
  }
}
