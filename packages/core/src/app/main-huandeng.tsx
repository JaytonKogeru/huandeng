import { ThemeProvider } from 'next-themes';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import {
  getUiLocale,
  initializeUiLocale,
  subscribeUiLocale,
  uiText,
  useHuandengLocale,
} from './lib/huandeng-locale';
import { DesktopThemeSync, initializeInterfaceTheme } from './lib/huandeng-theme';
import { setLocale } from './lib/locale-store';
import { HuandengEditor } from './routes/huandeng';
import './styles.css';

const HuandengExport = lazy(() =>
  import('./routes/huandeng-export').then((module) => ({ default: module.HuandengExport })),
);

const root = document.getElementById('root');
if (!root) throw new Error('The HUANDENG editor root is missing.');
const editorRoot = createRoot(root);
let localeSubscription: (() => void) | undefined;

function LoadingPage() {
  const { t } = useHuandengLocale();
  return (
    <div className="grid h-screen place-items-center text-sm text-muted-foreground">
      {t('准备页面…')}
    </div>
  );
}

async function startEditor() {
  await initializeInterfaceTheme();
  await initializeUiLocale();
  const syncSharedLocale = () => setLocale(getUiLocale());
  syncSharedLocale();
  localeSubscription?.();
  localeSubscription = subscribeUiLocale(syncSharedLocale);
  editorRoot.render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <DesktopThemeSync />
        <BrowserRouter>
          <TooltipProvider delay={200}>
            <Suspense fallback={<LoadingPage />}>
              <Routes>
                <Route path="/huandeng" element={<HuandengEditor />} />
                <Route path="/huandeng/export/:exportId" element={<HuandengExport />} />
                <Route path="*" element={<Navigate to="/huandeng" replace />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}

function showStartupError(error: unknown) {
  editorRoot.render(
    <main className="grid h-screen place-items-center p-8">
      <div className="max-w-lg space-y-4">
        <h1 className="text-lg font-medium">{uiText('无法读取界面设置。')}</h1>
        <p role="alert" className="break-words text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          className="rounded border px-3 py-2"
          onClick={() => void startEditor().catch(showStartupError)}
        >
          {uiText('重试')}
        </button>
      </div>
    </main>,
  );
}

void startEditor().catch(showStartupError);
