import { useEffect, useState, useSyncExternalStore } from 'react';
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
      if (current.saving || Object.values(current.drafts).some(draftHasChanges)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [client]);

  return { client, backend, state };
}
