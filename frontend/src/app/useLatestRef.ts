import { useEffect, useRef } from "react";

/** Keeps the ref up to date without reading `.current` during render. */
export function useLatestRef<T>(value: T): { current: T } {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });
  return valueRef;
}
