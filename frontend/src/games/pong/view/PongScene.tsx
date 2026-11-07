import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { GameSnapshot, Side } from "../protocol";
import { TABLE, getPaddleX } from "../protocol";
import { useSmoothedMeshPosition } from "./useSmoothedMeshPosition";

export const TABLE_SURFACE_Y = -0.5;
const PADDLE_SIZE: [number, number, number] = [0.4, 0.4, 2];
const PADDLE_Y = TABLE_SURFACE_Y + PADDLE_SIZE[1] / 2;
const BALL_Y = TABLE_SURFACE_Y + TABLE.ballRadius;
const TABLE_LENGTH = TABLE.halfLength * 2;
const TABLE_WIDTH = TABLE.halfWidth * 2;
const TABLE_COLOR = "#087f8c";

const PADDLE_VIEW: { side: Side; color: string }[] = [
  { side: "left", color: "#4af" },
  { side: "right", color: "#f4a" },
];

/**
 * Retorna a posição da paddle no eixo Z (largura) a partir do snapshot.
 *
 * @param snapshot - Estado atual da partida
 * @param side - Lado da paddle
 */
function getSnapshotPaddlePosition(snapshot: GameSnapshot, side: Side): number {
  return side === "left"
    ? snapshot.leftPaddlePosition
    : snapshot.rightPaddlePosition;
}

/** Superfície da mesa no plano XZ. */
function TableSurface() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, TABLE_SURFACE_Y, 0]}
      receiveShadow
    >
      <planeGeometry args={[TABLE_LENGTH, TABLE_WIDTH]} />
      <meshStandardMaterial
        color={TABLE_COLOR}
        emissive="#064b55"
        emissiveIntensity={0.2}
        metalness={0.08}
        roughness={0.72}
      />
    </mesh>
  );
}

/**
 * Paddle 3D posicionada em X (comprimento) e Z (largura).
 *
 * @param side - Lado da mesa
 * @param position - Posição no eixo Z (largura)
 * @param color - Cor do material
 */
function Paddle({
  side,
  position,
  color,
}: {
  side: Side;
  position: number;
  color: string;
}) {
  const sideDirection = side === "left" ? -1 : 1;
  const paddleX = getPaddleX(side) + sideDirection * PADDLE_SIZE[0] / 2;
  const mesh = useSmoothedMeshPosition([paddleX, PADDLE_Y, position]);
  return (
    <mesh ref={mesh} castShadow>
      <boxGeometry args={PADDLE_SIZE} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.18}
        metalness={0.12}
        roughness={0.38}
      />
    </mesh>
  );
}

/**
 * Bola 3D.
 *
 * @param x - Posição no eixo X (comprimento)
 * @param z - Posição no eixo Z (largura)
 */
function useBallRoll(ball: React.RefObject<Group | null>, x: number, z: number) {
  const previousPosition = useRef({ x, z });
  const rollAxis = useRef(new Vector3());

  useFrame(() => {
    const distanceX = x - previousPosition.current.x;
    const distanceZ = z - previousPosition.current.z;
    const distance = Math.hypot(distanceX, distanceZ);

    if (distance > 0 && distance < TABLE.ballRadius * 2) {
      rollAxis.current.set(distanceZ, 0, -distanceX).normalize();
      ball.current?.rotateOnWorldAxis(
        rollAxis.current,
        distance / TABLE.ballRadius,
      );
    }

    previousPosition.current = { x, z };
  });
}

function Ball({ x, z }: { x: number; z: number }) {
  const ball = useRef<Group>(null);
  useBallRoll(ball, x, z);
  return (
    <group ref={ball} position={[x, BALL_Y, z]}>
      <mesh castShadow>
        <sphereGeometry args={[TABLE.ballRadius, 24, 24]} />
        <meshStandardMaterial color="#fff" roughness={0.45} />
      </mesh>
      <mesh>
        <torusGeometry args={[TABLE.ballRadius * 0.92, 0.025, 8, 48]} />
        <meshStandardMaterial color="#17354a" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Fundo e iluminação da mesa. */
function PongLighting() {
  return (
    <>
      <color attach="background" args={["#081b2b"]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.65}
        castShadow
        shadow-radius={6}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
    </>
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
      <PongLighting />
      <TableSurface />
      {PADDLE_VIEW.map(({ side, color }) => (
        <Paddle
          key={side}
          side={side}
          position={getSnapshotPaddlePosition(snapshot, side)}
          color={color}
        />
      ))}
      <Ball x={snapshot.ball.x} z={snapshot.ball.z} />
    </>
  );
}
