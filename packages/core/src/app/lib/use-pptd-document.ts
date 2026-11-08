import { useEffect, useState, useSyncExternalStore } from 'react';
import { desktopHost } from './huandeng-desktop';
import { uiText as t } from './huandeng-locale';
import { PptdBackend } from './pptd-backend';
import { draftHasChanges, PptdDocumentClient } from './pptd-document';
import { workspaceLayoutForLeave } from './pptd-preferences';

export function usePptdDocument(auxiliaryDirty = false, importingAssets = false) {
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
        auxiliaryDirty ||
        importingAssets ||
        current.saving ||
        current.canRetry ||
        current.recoveryRequired ||
        Object.values(current.drafts).some(draftHasChanges)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [client, auxiliaryDirty, importingAssets]);

  useEffect(
    () =>
      desktopHost()?.onBeforeLeave(async () => {
        if (importingAssets) throw new Error(t('图片仍在导入，请完成后再关闭或切换项目。'));
        if (auxiliaryDirty)
          throw new Error(
            t('项目结构、Story、图表或动画还有未保存的草稿，请先保存或管理未保存草稿。'),
          );
        await client.flushAll().catch((error: unknown) => {
          throw new Error(t(error instanceof Error ? error.message : String(error)));
        });
        if (client.getState().canRetry)
          throw new Error(t('还有一次保存尚未确认，请先重试同一次保存。'));
        return { workspaceLayout: workspaceLayoutForLeave() };
      }),
    [client, auxiliaryDirty, importingAssets],
  );

  return { client, backend, state };
}
