import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny async-data hook with the same call-site ergonomics as the production
 * React-Query hooks (data / isLoading / refetch) so the port is a drop-in.
 */
export function useQueryish<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const alive = useRef(true);
  const tick = useRef(0);

  const run = useCallback(() => {
    const id = ++tick.current;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (alive.current && id === tick.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((e) => alive.current && setError(e))
      .finally(() => alive.current && id === tick.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
  }, [run]);

  return { data, isLoading, error, refetch: run };
}
