import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { WithId } from '@/types/models';

export interface LiveCollection<T> {
  items: WithId<T>[];
  loading: boolean;
  error: boolean;
}

/**
 * Bir sorguyu canlı dinler. `query` her render'da yeniden oluşturulmasın diye
 * `key` değişmedikçe aynı dinleyici kullanılır.
 */
export function useLiveCollection<T>(key: string | null, makeQuery: () => Query<T>): LiveCollection<T> {
  const [state, setState] = useState<LiveCollection<T>>({ items: [], loading: key !== null, error: false });

  useEffect(() => {
    if (key === null) {
      setState({ items: [], loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      makeQuery(),
      (snap) => setState({ items: snap.docs.map((d) => ({ ...d.data(), id: d.id })), loading: false, error: false }),
      (err) => {
        console.warn(`Dinlenemedi: ${key}`, err);
        setState((s) => ({ ...s, loading: false, error: true }));
      },
    );
    // makeQuery'nin kimliği değil key'i önemli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export interface LiveDocument<T> {
  data: WithId<T> | null;
  loading: boolean;
  error: boolean;
}

export function useLiveDocument<T>(ref: DocumentReference<T> | null): LiveDocument<T> {
  const path = ref?.path ?? null;
  const [state, setState] = useState<LiveDocument<T>>({ data: null, loading: path !== null, error: false });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? { ...snap.data(), id: snap.id } : null, loading: false, error: false }),
      (err) => {
        console.warn(`Dinlenemedi: ${ref.path}`, err);
        setState((s) => ({ ...s, loading: false, error: true }));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}
