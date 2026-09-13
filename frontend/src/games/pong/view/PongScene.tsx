import type { GameSnapshot, Side } from "../protocol";
import { TABLE, getPaddleX } from "../protocol";

const TABLE_SURFACE_Y = -0.5;
const TABLE_BORDER_Y = -0.35;
const BALL_Y = 0.3;
const PADDLE_SIZE: [number, number, number] = [0.4, 0.4, 2];
const TABLE_LENGTH = TABLE.halfLength * 2.2;
const TABLE_WIDTH = TABLE.halfWidth * 2.4;
const BORDER_THICKNESS = 0.35;
const BORDER_HEIGHT = 0.4;
const TABLE_COLOR = "#1a6b4a";
const BORDER_COLOR = "#e8c547";

const PADDLE_VIEW: { side: Side; color: string }[] = [
  { side: "left", color: "#4af" },
  { side: "right", color: "#f4a" },
];

type Vec3 = [number, number, number];

/**
 * Retorna a posição da paddle no eixo Z (largura) a partir do snapshot.
 *
 * @param snapshot - Estado atual da partida
 * @param side - Lado da paddle
 */
function getSnapshotPaddleOffset(snapshot: GameSnapshot, side: Side): number {
  return side === "left"
    ? snapshot.leftPaddleOffset
    : snapshot.rightPaddleOffset;
}

/** Superfície da mesa no plano XZ. */
function TableSurface() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_SURFACE_Y, 0]}>
      <planeGeometry args={[TABLE_LENGTH, TABLE_WIDTH]} />
      <meshStandardMaterial color={TABLE_COLOR} />
    </mesh>
  );
}

/** Trilho individual da borda da mesa. */
function BorderRail({ position, size }: { position: Vec3; size: Vec3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={BORDER_COLOR} />
    </mesh>
  );
}

/**
 * Monta as posições e tamanhos das bordas da mesa.
 */
function getBorderRails(): { position: Vec3; size: Vec3 }[] {
  const halfLength = TABLE_LENGTH / 2;
  const halfWidth = TABLE_WIDTH / 2;
  const railZ = halfWidth + BORDER_THICKNESS / 2;
  const railX = halfLength + BORDER_THICKNESS / 2;
  const longRail: Vec3 = [
    TABLE_LENGTH + BORDER_THICKNESS * 2,
    BORDER_HEIGHT,
    BORDER_THICKNESS,
  ];
  const shortRail: Vec3 = [BORDER_THICKNESS, BORDER_HEIGHT, TABLE_WIDTH];

  return [
    { position: [0, TABLE_BORDER_Y, railZ], size: longRail },
    { position: [0, TABLE_BORDER_Y, -railZ], size: longRail },
    { position: [railX, TABLE_BORDER_Y, 0], size: shortRail },
    { position: [-railX, TABLE_BORDER_Y, 0], size: shortRail },
  ];
}

/** Conjunto das quatro bordas da mesa. */
function TableBorder() {
  return (
    <>
      {getBorderRails().map((rail) => (
        <BorderRail
          key={`${rail.position[0]}:${rail.position[2]}`}
          position={rail.position}
          size={rail.size}
        />
      ))}
    </>
  );
}

/**
 * Paddle 3D posicionada em X (comprimento) e Z (largura).
 *
 * @param side - Lado da mesa
 * @param offset - Posição no eixo Z (largura)
 * @param color - Cor do material
 */
function Paddle({
  side,
  offset,
  color,
}: {
  side: Side;
  offset: number;
  color: string;
}) {
  return (
    <mesh position={[getPaddleX(side), 0, offset]}>
      <boxGeometry args={PADDLE_SIZE} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * Bola 3D.
 *
 * @param x - Posição no eixo X (comprimento)
 * @param z - Posição no eixo Z (largura)
 */
function Ball({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, BALL_Y, z]}>
      <sphereGeometry args={[TABLE.ballRadius, 16, 16]} />
      <meshStandardMaterial color="#fff" />
    </mesh>
  );
}

/**
 * Cena 3D da partida: mesa, paddles e bola a partir do snapshot.
 *
 * @param snapshot - Estado atual da partida
 */
export function PongScene({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <TableSurface />
      <TableBorder />
      {PADDLE_VIEW.map(({ side, color }) => (
        <Paddle
          key={side}
          side={side}
          offset={getSnapshotPaddleOffset(snapshot, side)}
          color={color}
        />
      ))}
      <Ball x={snapshot.ball.x} z={snapshot.ball.z} />
    </>
  );
}
