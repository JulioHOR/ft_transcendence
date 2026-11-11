import { useState } from "react";
import {
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
import { Avatar } from "../ui/Avatar";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { useToaster } from "../ui/toaster-context";

const characters: GameCharacter[] = ["1", "2", "3"];

function parseCharacter(value: string): GameCharacter | null {
  if (value === "1" || value === "2" || value === "3") return value;
  return null;
}

type StartGameProps = {
  character: GameCharacter;
  setPending: (pending: boolean) => void;
  showToast: ReturnType<typeof useToaster>;
};

async function startSelectedGame({
  character,
  setPending,
  showToast,
}: StartGameProps): Promise<void> {
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

type CharacterOptionProps = {
  character: GameCharacter;
  selected: boolean;
};

function CharacterOption({ character, selected }: CharacterOptionProps) {
  return (
    <FormControlLabel
      value={character}
      control={<Radio />}
      label={<CharacterAvatar character={character} />}
      sx={characterOptionSx(selected)}
    />
  );
}

function CharacterAvatar({ character }: { character: GameCharacter }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center" }}>
      <Avatar avatarUrl={null} alt={`Personagem ${character}`} size="xl" />
      <Typography>Personagem {character}</Typography>
    </Stack>
  );
}

function characterOptionSx(selected: boolean) {
  return {
    m: 0,
    minWidth: 0,
    justifyContent: "center",
    border: 1,
    borderRadius: 1,
    borderColor: selected ? "primary.main" : "divider",
    p: 2,
    "& .MuiFormControlLabel-label": { flex: 1 },
  };
}

const characterGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
  gap: 2,
};

type CharacterSelectionProps = {
  selectedCharacter: GameCharacter;
  onSelect: (character: GameCharacter) => void;
};

function CharacterSelection({
  selectedCharacter,
  onSelect,
}: CharacterSelectionProps) {
  return (
    <FormControl>
      <RadioGroup
        row
        aria-label="Selecione um personagem"
        value={selectedCharacter}
        onChange={(_, value) => selectCharacter(value, onSelect)}
        sx={characterGridSx}
      >
        {characters.map((character) =>
          renderCharacterOption(character, selectedCharacter),
        )}
      </RadioGroup>
    </FormControl>
  );
}

function selectCharacter(
  value: string,
  onSelect: CharacterSelectionProps["onSelect"],
) {
  const character = parseCharacter(value);
  if (character !== null) onSelect(character);
}

function renderCharacterOption(
  character: GameCharacter,
  selectedCharacter: GameCharacter,
) {
  return (
    <CharacterOption
      key={character}
      character={character}
      selected={selectedCharacter === character}
    />
  );
}

type StartGameButtonProps = StartGameProps & { pending: boolean };

function StartGameButton({
  character,
  pending,
  setPending,
  showToast,
}: StartGameButtonProps) {
  return (
    <ActionButton
      appearance="primary"
      onClick={() =>
        void startSelectedGame({ character, setPending, showToast })
      }
      disabled={pending}
      startIcon={pending ? <CircularProgress color="inherit" size={18} /> : null}
      sx={{ alignSelf: "flex-start" }}
    >
      {pending ? "Iniciando..." : "Ir para o jogo"}
    </ActionButton>
  );
}

type GameEnvLayoutProps = StartGameButtonProps & {
  selectedCharacter: GameCharacter;
  onSelect: (character: GameCharacter) => void;
};

function GameEnvLayout(props: GameEnvLayoutProps) {
  return (
    <PageContainer>
      <SectionCard sx={{ width: "100%", maxWidth: 800, alignSelf: "center" }}>
        <Stack spacing={2.5}>
          <Typography variant="h2">Ambiente 3D</Typography>
          <Typography color="text.secondary">
            Escolha um personagem para iniciar o jogo.
          </Typography>
          <CharacterSelection
            selectedCharacter={props.selectedCharacter}
            onSelect={props.onSelect}
          />
          <StartGameButton
            character={props.character}
            pending={props.pending}
            setPending={props.setPending}
            showToast={props.showToast}
          />
        </Stack>
      </SectionCard>
    </PageContainer>
  );
}

export function GameEnvPage() {
  const [selectedCharacter, setSelectedCharacter] =
    useState<GameCharacter>("1");
  const [pending, setPending] = useState(false);
  const showToast = useToaster();
  return (
    <GameEnvLayout
      character={selectedCharacter}
      selectedCharacter={selectedCharacter}
      pending={pending}
      setPending={setPending}
      showToast={showToast}
      onSelect={setSelectedCharacter}
    />
  );
}
