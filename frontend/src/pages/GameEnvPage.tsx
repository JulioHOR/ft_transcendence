import { useState } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { startGame, type GameCharacter } from "../api/games";
import { friendlyError } from "../api/http";
import { ActionButton } from "../ui/ActionButton";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { useToaster } from "../ui/toaster-context";

const characters: GameCharacter[] = ["1", "2", "3"];
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
        "Não foi possível iniciar o jogo.",
        "Falha ao iniciar o jogo",
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
};

const characterOptionSx = (selected: boolean) => ({
  m: 0,
  minWidth: 0,
  justifyContent: "center",
  border: 1,
  borderRadius: 1,
  borderColor: selected ? "primary.main" : "divider",
  p: 2,
  "& .MuiFormControlLabel-label": { flex: 1 },
});

function CharacterOption({ character, selected }: CharacterOptionProps) {
  return (
    <FormControlLabel
      value={character}
      control={<Radio />}
      label={<CharacterCard character={character} />}
      sx={characterOptionSx(selected)}
    />
  );
}

function CharacterCard({ character }: { character: GameCharacter }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", width: "100%" }}>
      <Box
        component="img"
        src={characterImages[character]}
        alt={`Personagem ${character}`}
        loading="lazy"
        sx={{
          display: "block",
          width: "100%",
          aspectRatio: "3 / 4",
          objectFit: "contain",
          borderRadius: 1,
        }}
      />
      <Typography>Personagem {character}</Typography>
    </Stack>
  );
}

function CharacterSelection({ selected, onSelect }: CharacterSelectionProps) {
  return (
    <FormControl>
      <RadioGroup
        row
        aria-label="Selecione um personagem"
        value={selected}
        onChange={(_, value) => {
          const character = parseCharacter(value);
          if (character !== null) onSelect(character);
        }}
        sx={characterGridSx}
      >
        {characters.map((character) => (
          <CharacterOption
            key={character}
            character={character}
            selected={selected === character}
          />
        ))}
      </RadioGroup>
    </FormControl>
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
        Escolha um personagem para iniciar o jogo.
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
      sx={{ alignSelf: "flex-start" }}
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
  const [selected, setSelected] = useState<GameCharacter>("1");
  const [pending, setPending] = useState(false);
  const showToast = useToaster();
  return (
    <GameSelection
      selected={selected}
      onSelect={setSelected}
      pending={pending}
      onStart={() => void startSelectedGame(selected, setPending, showToast)}
    />
  );
}
