import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import type { GameSnapshot, Side } from "../protocol";
import { TABLE, getPaddleX } from "../protocol";
import {
  BALL_Y,
  BALL_COLOR,
  BALL_TRAIL_COLOR,
  EDGE_GLOW_COLOR,
  GLOW_INTENSITY,
  LEFT_PADDLE_COLOR,
  NET_COLOR,
  PADDLE_SIZE,
  PADDLE_Y,
  RIGHT_PADDLE_COLOR,
  SUPPORT_COLOR,
  TABLE_COLOR,
  TABLE_EDGE_COLOR,
  TABLE_EDGE_LINES,
  TABLE_LENGTH,
  TABLE_MARKING_COLOR,
  TABLE_RAILS,
  TABLE_SURFACE_Y,
  TABLE_WIDTH,
  TRAIL_FULL_SPEED,
  TRAIL_LENGTH,
  TRAIL_MIN_SPEED,
} from "../constants";
import { useTheme } from "@mui/material/styles";
import type {
  BallBodyProps,
  BallProps,
  BallPoint,
  BallTrailProps,
  Impact,
  ImpactFlashProps,
  PaddleProps,
  PongSceneProps,
  TableRailProps,
  TrailPointProps,
} from "./props";
/** Returns the paddle position specified in the snapshot. */
function getSnapshotPaddlePosition(snapshot: GameSnapshot, side: Side): number {
  return side === "left"
    ? snapshot.leftPaddlePosition
    : snapshot.rightPaddlePosition;
}

/** Isometric table with a simple wood and felt finish. */
function TableSurface() {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TABLE_SURFACE_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={[TABLE_LENGTH, TABLE_WIDTH]} />
        <meshStandardMaterial
          color={TABLE_COLOR}
          emissive={TABLE_COLOR}
          emissiveIntensity={GLOW_INTENSITY}
          roughness={0.72}
        />
      </mesh>
      <TableFrame />
    </>
  );
}

/** Renders the table rails, finish, and support. */
function TableFrame() {
  return (
    <>
      {TABLE_RAILS.map((rail) => (
        <TableRail key={rail.position.join(":")} {...rail} />
      ))}
      <TableEdgeGlow />
      <TableSupport />
    </>
  );
}

/** Renders a structural table rail. */
function TableRail({ position, size }: TableRailProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={TABLE_EDGE_COLOR}
        emissive={TABLE_EDGE_COLOR}
        emissiveIntensity={0.12}
        roughness={0.6}
      />
    </mesh>
  );
}

/** Renders the illuminated lines inside the edge. */
function TableEdgeGlow() {
  return (
    <>
      {TABLE_EDGE_LINES.map((line, index) => (
        <mesh key={index} position={line.position}>
          <boxGeometry args={line.size} />
          <meshBasicMaterial
            color={EDGE_GLOW_COLOR}
            transparent
            opacity={0.48}
          />
        </mesh>
      ))}
    </>
  );
}

/** Renders the table's lower support. */
function TableSupport() {
  return (
    <group>
      <mesh position={[0, TABLE_SURFACE_Y - 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[TABLE_LENGTH * 0.72, 0.45, TABLE_WIDTH * 0.58]} />
        <meshStandardMaterial color={SUPPORT_COLOR} roughness={0.78} />
      </mesh>
    </group>
  );
}

/** Renders the center net of the table. */
function TableNet() {
  return (
    <mesh position={[0, TABLE_SURFACE_Y + 0.025, 0]} castShadow>
      <boxGeometry args={[0.07, 0.025, TABLE_WIDTH]} />
      <meshStandardMaterial color={NET_COLOR} roughness={0.9} />
    </mesh>
  );
}

/** Renders the paddle on one side. */
function Paddle({ side, position }: PaddleProps) {
  const sideDirection = side === "left" ? -1 : 1;
  const paddleX = getPaddleX(side) + (sideDirection * PADDLE_SIZE[0]) / 2;

  return (
    <mesh position={[paddleX, PADDLE_Y, position]} castShadow>
      <boxGeometry args={PADDLE_SIZE} />
      <meshStandardMaterial
        color={side === "left" ? LEFT_PADDLE_COLOR : RIGHT_PADDLE_COLOR}
        emissive={side === "left" ? LEFT_PADDLE_COLOR : RIGHT_PADDLE_COLOR}
        emissiveIntensity={GLOW_INTENSITY}
        roughness={0.35}
        metalness={0.1}
      />
    </mesh>
  );
}

/** Adds or removes trail points based on the speed. */
function addTrailPoint(
  distance: number,
  previous: BallPoint,
  setTrail: Dispatch<SetStateAction<BallPoint[]>>,
) {
  if (distance >= TRAIL_MIN_SPEED) {
    setTrail((current) => [previous, ...current].slice(0, TRAIL_LENGTH));
    return;
  }
  setTrail((current) => (current.length === 0 ? current : []));
}

/** Updates the visual effect when the ball changes direction. */
function setImpact(
  changedDirection: boolean,
  z: number,
  paddlePosition: number,
  impact: MutableRefObject<Impact>,
) {
  if (!changedDirection) return;
  const hitAngle = (z - paddlePosition) / TABLE.paddleHalfDepth;
  impact.current = {
    strength: 1,
    angle: Math.max(-1, Math.min(1, hitAngle)) * 0.75,
  };
}

/** Maintains the trail, speed, and impact used to present the ball. */
function useBallFeedback(x: number, z: number, paddlePosition: number) {
  const previous = useRef({ x, z, directionX: 0 });
  const impact = useRef<Impact>({ strength: 0, angle: 0 });
  const [trail, setTrail] = useState<BallPoint[]>([]);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    const deltaX = x - previous.current.x;
    const deltaZ = z - previous.current.z;
    const distance = Math.hypot(deltaX, deltaZ);
    setSpeed(distance);
    const changedDirection =
      deltaX !== 0 &&
      previous.current.directionX !== 0 &&
      deltaX * previous.current.directionX < 0;

    addTrailPoint(distance, previous.current, setTrail);
    setImpact(changedDirection, z, paddlePosition, impact);
    previous.current = { x, z, directionX: deltaX };
  }, [paddlePosition, x, z]);

  useFrame((_, delta) => {
    impact.current.strength = Math.max(0, impact.current.strength - delta * 5);
  });

  return { trail, impact, speed };
}

/** Renders a trail proportional to the current speed. */
function BallTrail({ trail, speed }: BallTrailProps) {
  const speedFactor = getTrailSpeedFactor(speed);
  const visibleTrail = Math.ceil(speedFactor * trail.length);
  if (visibleTrail === 0) return null;
  return (
    <>
      {trail.slice(0, visibleTrail).map((point, index) => (
        <TrailPoint
          key={`${point.x}-${point.z}-${index}`}
          point={point}
          index={index}
          speedFactor={speedFactor}
          color={BALL_TRAIL_COLOR}
        />
      ))}
    </>
  );
}

/** Converts speed into the trail's visual intensity. */
function getTrailSpeedFactor(speed: number): number {
  return Math.min(
    1,
    Math.max(
      0,
      (speed - TRAIL_MIN_SPEED) / (TRAIL_FULL_SPEED - TRAIL_MIN_SPEED),
    ),
  );
}

/** Renders a trail point with decreasing opacity. */
function TrailPoint({ point, index, speedFactor, color }: TrailPointProps) {
  return (
    <mesh
      position={[point.x, BALL_Y, point.z]}
      scale={1 - index / (TRAIL_LENGTH + 1)}
    >
      <sphereGeometry args={[TABLE.ballRadius * 0.72, 12, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2 + speedFactor * 0.55 * (1 - index / TRAIL_LENGTH)}
      />
    </mesh>
  );
}

/** Renders the visual ring for an impact on the paddle. */
function ImpactFlash({ impact }: ImpactFlashProps) {
  const flash = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = flash.current;
    if (mesh == null) return;
    updateImpactFlash(mesh, impact.current);
  });

  return (
    <mesh ref={flash} position={[0, 0.04, 0]} visible={false}>
      <torusGeometry args={[0.12, 0.025, 8, 24]} />
      <meshBasicMaterial color={TABLE_MARKING_COLOR} transparent opacity={0} />
    </mesh>
  );
}

/** Updates the impact's scale and opacity on each frame. */
function updateImpactFlash(mesh: Mesh, impact: Impact) {
  mesh.visible = impact.strength > 0.01;
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = impact.angle;
  mesh.scale.set(1 + impact.strength * 1.2, 1, 1 + impact.strength * 0.7);
  (mesh.material as MeshBasicMaterial).opacity = impact.strength * 0.8;
}

/** Renders the ball and its motion effects. */
function Ball({ snapshot }: BallProps) {
  const paddlePosition =
    snapshot.ball.x < 0
      ? snapshot.leftPaddlePosition
      : snapshot.rightPaddlePosition;
  const { trail, impact, speed } = useBallFeedback(
    snapshot.ball.x,
    snapshot.ball.z,
    paddlePosition,
  );
  const servePending = snapshot.serveSide !== null;

  return (
    <>
      <BallTrail
        trail={servePending ? [] : trail}
        speed={servePending ? 0 : speed}
      />
      <BallBody
        snapshot={snapshot}
        impact={servePending ? undefined : impact}
      />
    </>
  );
}

/** Renders the ball body and ring. */
function BallBody({ snapshot, impact }: BallBodyProps) {
  return (
    <group position={[snapshot.ball.x, BALL_Y, snapshot.ball.z]}>
      <BallSphere />
      <BallRing />
      {impact && <ImpactFlash impact={impact} />}
    </group>
  );
}

/** Renders the ball's glowing sphere. */
function BallSphere() {
  return (
    <mesh castShadow>
      <sphereGeometry args={[TABLE.ballRadius, 20, 12]} />
      <meshStandardMaterial
        color={BALL_COLOR}
        emissive={BALL_COLOR}
        emissiveIntensity={GLOW_INTENSITY}
        roughness={0.2}
        metalness={0.35}
      />
    </mesh>
  );
}

/** Renders the ball's decorative ring. */
function BallRing() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[TABLE.ballRadius * 0.92, 0.025, 8, 32]} />
      <meshStandardMaterial
        color={TABLE_MARKING_COLOR}
        roughness={0.18}
        metalness={0.5}
      />
    </mesh>
  );
}

/** Reads the background color defined by the active Material UI theme. */
function usePongBackgroundColor(): string {
  const { palette } = useTheme();
  return palette.background.default;
}

/** Sets the scene's background color. */
function SceneBackground() {
  return <color attach="background" args={[usePongBackgroundColor()]} />;
}

/** Renders all 3D elements of the match. */
export function PongScene({ snapshot }: PongSceneProps) {
  return (
    <>
      <SceneLighting />
      <SceneBackground />
      <TableSurface />
      <TableNet />
      {(["left", "right"] as const).map((side) => (
        <Paddle
          key={side}
          side={side}
          position={getSnapshotPaddlePosition(snapshot, side)}
        />
      ))}
      <Ball snapshot={snapshot} />
    </>
  );
}

/** Configures the lighting used by the table and objects. */
function SceneLighting() {
  return (
    <>
      <hemisphereLight args={["#d7f4ff", "#17231d", 1.15]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 10, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={1.2}
        distance={24}
        color="#fff3d6"
      />
    </>
  );
}
