import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Mesh } from "three";

const MOVEMENT_SMOOTHING = 18;

type Position3D = [number, number, number];

/** Move cada eixo da malha em direção ao snapshot atual. */
function smoothMeshPosition(
  mesh: Mesh,
  target: Position3D,
  delta: number,
): void {
  mesh.position.x = MathUtils.damp(
    mesh.position.x,
    target[0],
    MOVEMENT_SMOOTHING,
    delta,
  );
  mesh.position.y = MathUtils.damp(
    mesh.position.y,
    target[1],
    MOVEMENT_SMOOTHING,
    delta,
  );
  mesh.position.z = MathUtils.damp(
    mesh.position.z,
    target[2],
    MOVEMENT_SMOOTHING,
    delta,
  );
}

/** Suaviza a posição visual de uma malha entre snapshots do servidor. */
export function useSmoothedMeshPosition(target: Position3D) {
  const mesh = useRef<Mesh>(null);
  const targetPosition = useRef(target);

  useEffect(() => {
    targetPosition.current = target;
  }, [target]);

  useLayoutEffect(() => {
    mesh.current?.position.set(...targetPosition.current);
  }, []);

  useFrame((_, delta) => {
    const currentMesh = mesh.current;
    if (currentMesh == null) return;
    smoothMeshPosition(currentMesh, targetPosition.current, delta);
  });

  return mesh;
}
