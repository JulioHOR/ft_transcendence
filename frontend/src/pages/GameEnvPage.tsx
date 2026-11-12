import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import { startGame, type GameCharacter } from "../api/games";
import { friendlyError } from "../api/http";
import { ActionButton } from "../ui/ActionButton";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { useToaster } from "../ui/toaster-context";

const characters: GameCharacter[] = ["1", "2", "3"];
const SELECTED_CHARACTER_STORAGE_KEY = "environment3d.selectedCharacter";
const characterImages: Record<GameCharacter, string> = {
  "1": "/characters/character-1.png",
  "2": "/characters/character-2.jpg",
  "3": "/characters/character-3.jpeg",
};
const characterGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
  gap: 2,
};

function parseCharacter(value: string): GameCharacter | null {
  return characters.find((character) => character === value) ?? null;
}

async function startSelectedGame(
  character: GameCharacter,
  setPending: (pending: boolean) => void,
  showToast: ReturnType<typeof useToaster>,
): Promise<void> {
  setPending(true);
  try {
    await startGame(character);
    window.location.assign("/game/");
  } catch (failure) {
    showToast(
      friendlyError(
        failure,
        "Não foi possível iniciar o ambiente 3D.",
        "Falha ao iniciar o ambiente 3D.",
      ),
      "error",
    );
    setPending(false);
  }
}

type CharacterSelectionProps = {
  selected: GameCharacter;
  onSelect: (character: GameCharacter) => void;
};

type CharacterOptionProps = {
  character: GameCharacter;
  selected: boolean;
  onSelect: (character: GameCharacter) => void;
};

const characterOptionSx = (selected: boolean) => ({
  display: "block",
  width: "100%",
  p: 0,
  border: 1,
  borderColor: selected ? "primary.main" : "divider",
  borderWidth: selected ? 3 : 1,
  borderRadius: 1,
  overflow: "hidden",
  "&.Mui-focusVisible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 2,
  },
});

function CharacterOption({
  character,
  selected,
  onSelect,
}: CharacterOptionProps) {
  return (
    <ButtonBase
      aria-label={`Personagem ${character}`}
      aria-pressed={selected}
      onClick={() => onSelect(character)}
      sx={characterOptionSx(selected)}
    >
      <CharacterCard character={character} />
    </ButtonBase>
  );
}

function CharacterCard({ character }: { character: GameCharacter }) {
  return (
    <Box
      component="img"
      src={characterImages[character]}
      alt={`Personagem ${character}`}
      loading="lazy"
      sx={{
        display: "block",
        width: "100%",
        aspectRatio: "3 / 4",
        objectFit: "cover",
      }}
    />
  );
}

function CharacterSelection({ selected, onSelect }: CharacterSelectionProps) {
  return (
    <Box role="group" aria-label="Selecione um personagem" sx={characterGridSx}>
      {characters.map((character) => (
        <CharacterOption
          key={character}
          character={character}
          selected={selected === character}
          onSelect={onSelect}
        />
      ))}
    </Box>
  );
}

type GameSelectionProps = CharacterSelectionProps & {
  pending: boolean;
  onStart: () => void;
};

function GameInstructions() {
  return (
    <>
      <Typography variant="h2">Ambiente 3D</Typography>
      <Typography color="text.secondary">
        Escolha um personagem para iniciar o ambiente 3D.
      </Typography>
    </>
  );
}

function GameStartButton({
  pending,
  onStart,
}: Pick<GameSelectionProps, "pending" | "onStart">) {
  return (
    <ActionButton
      appearance="primary"
      onClick={onStart}
      disabled={pending}
      startIcon={
        pending ? <CircularProgress color="inherit" size={18} /> : null
      }
      sx={{ width: "100%" }}
    >
      {pending ? "Iniciando..." : "Entrar no Ambiente 3D"}
    </ActionButton>
  );
}

function GameSelection({
  selected,
  onSelect,
  pending,
  onStart,
}: GameSelectionProps) {
  return (
    <PageContainer>
      <SectionCard sx={{ width: "100%", maxWidth: 800, alignSelf: "center" }}>
        <Stack spacing={2.5}>
          <GameInstructions />
          <CharacterSelection selected={selected} onSelect={onSelect} />
          <GameStartButton pending={pending} onStart={onStart} />
        </Stack>
      </SectionCard>
    </PageContainer>
  );
}

export function GameEnvPage() {
  const [selected, setSelected] = useState<GameCharacter>(
    () =>
      parseCharacter(
        window.sessionStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY) ?? "",
      ) ?? "1",
  );
  const [pending, setPending] = useState(false);
  const showToast = useToaster();
  return (
    <GameSelection
      selected={selected}
      onSelect={(character) => {
        window.sessionStorage.setItem(
          SELECTED_CHARACTER_STORAGE_KEY,
          character,
        );
        setSelected(character);
      }}
      pending={pending}
      onStart={() => void startSelectedGame(selected, setPending, showToast)}
    />
  );
}
