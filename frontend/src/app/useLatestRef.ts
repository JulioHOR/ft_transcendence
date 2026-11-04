import { useEffect, useRef } from "react";

/** Mantém ref atualizada sem ler `.current` no render. */
export function useLatestRef<T>(value: T): { current: T } {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });
  return valueRef;
}
