import { useEffect, useState, useSyncExternalStore } from 'react';
import { desktopHost } from './huanding-desktop';
import { PptdBackend } from './pptd-backend';
import { draftHasChanges, PptdDocumentClient } from './pptd-document';

export function usePptdDocument() {
  const [backend] = useState(() => new PptdBackend());
  const [client] = useState(() => new PptdDocumentClient(backend));
  const state = useSyncExternalStore(client.subscribe, client.getState);

  useEffect(() => {
    void client.connect();
    return () => client.disconnect();
  }, [client]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const current = client.getState();
      if (
        current.saving ||
        current.canRetry ||
        Object.values(current.drafts).some(draftHasChanges)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [client]);

  useEffect(
    () =>
      desktopHost()?.onBeforeLeave(async () => {
        await client.flushAll();
        if (client.getState().canRetry)
          throw new Error('还有一次保存尚未确认，请先重试同一次保存。');
      }),
    [client],
  );

  return { client, backend, state };
}
