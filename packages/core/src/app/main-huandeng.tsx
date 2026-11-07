import { ThemeProvider } from 'next-themes';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { HuandengEditor } from './routes/huandeng';
import './styles.css';

const HuandengExport = lazy(() =>
  import('./routes/huandeng-export').then((module) => ({ default: module.HuandengExport })),
);

const root = document.getElementById('root');
if (!root) throw new Error('The HUANDENG editor root is missing.');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BrowserRouter>
        <TooltipProvider delay={200}>
          <Suspense
            fallback={
              <div className="grid h-screen place-items-center text-sm text-muted-foreground">
                准备页面…
              </div>
            }
          >
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
