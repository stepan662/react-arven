import { useEffect, useLayoutEffect } from "react";

// Select useLayoutEffect for the client and useEffect for the server to avoid warnings
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
