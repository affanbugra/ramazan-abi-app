import Constants from 'expo-constants';
import { limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { functions, typedCollection, typedDoc } from '@/lib/firebase';
import type { InviteDoc, WithId } from '@/types/models';
import { callableError, type FieldError } from '@/features/auth/api';

export type InviteTab = 'active' | 'used' | 'expired' | 'revoked';

/** Süresi dolmuşluk saklanmaz, expiresAt'ten hesaplanır (PROJE.md 5). */
export function inviteTab(invite: InviteDoc, now: number): InviteTab {
  if (invite.status === 'used') return 'used';
  if (invite.status === 'revoked') return 'revoked';
  return invite.expiresAt.toMillis() <= now ? 'expired' : 'active';
}

export function useInvites(): { invites: WithId<InviteDoc>[]; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ invites: WithId<InviteDoc>[]; loading: boolean; error: boolean }>({
    invites: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    const q = query(typedCollection<InviteDoc>('invites'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snap) =>
        setState({ invites: snap.docs.map((d) => ({ ...d.data(), id: d.id })), loading: false, error: false }),
      (err) => {
        console.warn('Davet kodları dinlenemedi', err);
        setState((s) => ({ ...s, loading: false, error: true }));
      },
    );
  }, []);

  return state;
}

const createInviteCallable = httpsCallable<{ label: string }, { code: string; expiresAt: number }>(
  functions,
  'createInvite',
);

export async function createInvite(
  label: string,
): Promise<{ ok: true; code: string; expiresAt: number } | { ok: false; error: FieldError<'label'> }> {
  try {
    const { data } = await createInviteCallable({ label });
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: callableError(err, ['label'] as const) };
  }
}

export function revokeInvite(code: string): Promise<void> {
  return updateDoc(typedDoc<InviteDoc>(`invites/${code}`), { status: 'revoked', revokedAt: serverTimestamp() });
}

interface StoreLinks {
  ios?: string;
  android?: string;
}

export function inviteShareMessage(code: string): string {
  const links = (Constants.expoConfig?.extra?.storeLinks ?? {}) as StoreLinks;
  const lines = [`Ramazan Abi kantin uygulaması davet kodun: ${code}. 1 saat geçerli.`];
  if (links.ios) lines.push(`iPhone: ${links.ios}`);
  if (links.android) lines.push(`Android: ${links.android}`);
  return lines.join('\n');
}
