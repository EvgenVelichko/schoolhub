
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    setFirebase(initializeFirebase());
  }, []);

  if (!firebase) return null;

  return (
    <FirebaseProvider app={firebase.app} db={firebase.db} auth={firebase.auth}>
      {children}
    </FirebaseProvider>
  );
}
