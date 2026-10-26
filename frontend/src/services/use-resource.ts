import { useEffect, useState } from 'react';

type Resource<T> = { key: string; data?: T; error?: string };
export function useResource<T>(key: string, loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ key: '' });
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState({ key });
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
  }, [key, loader]);
  return state.key === key ? state : { key };
}
