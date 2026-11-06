import { useEffect, useState } from 'react';

type Resource<T> = { key: string; data?: T; error?: string };
export function useResource<T>(
  key: string, loader: (signal: AbortSignal) => Promise<T>, enabled = true, retainOnRefresh = false,
) {
  const [state, setState] = useState<Resource<T>>({ key: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let current = true;
    setState((previous) => retainOnRefresh && previous.key === key ? previous : { key });
    loader(controller.signal)
      .then((data) => {
        if (current) setState({ key, data });
      })
      .catch((error: unknown) => {
        if (current)
          setState({
            key,
            error: error instanceof Error ? error.message : 'No se pudo cargar la información.',
          });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [key, loader, enabled, retainOnRefresh]);
  return enabled && state.key === key ? state : { key };
}
