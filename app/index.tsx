import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/session';

/** Açılışta oturuma göre doğru gruba yönlendirir. */
export default function Index() {
  const session = useSession((s) => s.session);

  if (session.status !== 'signedIn') {
    return <Redirect href="/(auth)/welcome" />;
  }
  const { role, status } = session.profile;
  if (status === 'suspended') {
    return <Redirect href="/suspended" />;
  }
  return <Redirect href={role === 'admin' ? '/(admin)/(tabs)/orders' : '/(student)/(tabs)/menu'} />;
}
