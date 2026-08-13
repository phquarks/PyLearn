import { useEffect } from 'react';

import { getCurrentSession, subscribeToAuthChanges } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export function useAuthSession() {
  const setAuthState = useAuthStore((state) => state.setAuthState);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((session) => {
        if (isMounted) {
          setAuthState(session, true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthState(null, true);
        }
      });

    const unsubscribe = subscribeToAuthChanges((_event, session) => {
      setAuthState(session, true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setAuthState]);
}
