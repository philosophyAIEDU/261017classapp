// 데이터를 불러올 때 "불러오는 중 / 오류 / 결과"를 한 번에 관리하는 도우미입니다.

import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { useSession } from '../store/sessionStore';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '잠시 문제가 생겼어요. 다시 시도해 주세요.';
}

export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const dataVersion = useSession((s) => s.dataVersion);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((result) => alive && setData(result))
      .catch((e: unknown) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run, tick, dataVersion]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
