import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimationStep, BuildTimeline } from '../../pptd/animation-model';
import type { PageSnapshot } from '../../pptd/types';
import { AnimationPanel } from '../components/pptd/animation-panel';
import {
  getUiLocale,
  initializeUiLocale,
  setUiLocale,
  subscribeUiLocale,
  uiText,
} from './huandeng-locale';
import { animationStepLabel } from './pptd-animation-label';
import { elementLabel } from './pptd-element-label';

let storage: Map<string, string>;
beforeEach(async () => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { documentElement: { lang: '' } });
  vi.stubGlobal('navigator', { language: 'zh-CN', languages: ['zh-CN'] });
  await setUiLocale('zh-CN');
});
afterEach(async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { setItem: () => {} });
  await setUiLocale('en');
  vi.unstubAllGlobals();
});

const effect = {
  id: 'a',
  targetId: 'figure',
  kind: 'fade-in',
  trigger: 'click',
  durationMs: 400,
  delayMs: 0,
} as const;
const animation: BuildTimeline = { schemaVersion: 2, effects: [effect] };
const step: AnimationStep = {
  id: 'a',
  label: '步骤 1',
  index: 0,
  startMs: 0,
  endMs: 400,
  effectIds: ['a'],
  instant: false,
};

describe('interface language preference and document isolation', () => {
  it('persists browser preference, notifies only real changes, and preserves state on storage failure', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUiLocale(listener);
    await setUiLocale('en');
    expect(storage.get('huandeng:ui-locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    await setUiLocale('en');
    expect(listener).toHaveBeenCalledTimes(1);
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('disk full');
      },
    });
    await expect(setUiLocale('zh-CN')).rejects.toThrow('disk full');
    expect(getUiLocale()).toBe('en');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('uses the desktop preference across changing server origins and subscribes only once', async () => {
    let changed: (locale: 'en' | 'zh-CN') => void = () => {};
    const onLocaleChanged = vi.fn((listener) => {
      changed = listener;
      return () => {};
    });
    const desktop = {
      getLocale: vi.fn(async () => 'en'),
      setLocale: vi.fn(async (value) => value),
      onLocaleChanged,
    };
    vi.stubGlobal('window', { huandengDesktop: desktop });
    await initializeUiLocale();
    await initializeUiLocale();
    expect(getUiLocale()).toBe('en');
    expect(onLocaleChanged).toHaveBeenCalledTimes(1);
    changed('zh-CN');
    expect(getUiLocale()).toBe('zh-CN');
    expect(uiText('主幻灯片')).toBe('Main Slides');
    expect(uiText('添加效果')).toBe('添加效果');
    await setUiLocale('en');
    expect(desktop.setLocale).toHaveBeenCalledWith('en');
    expect(storage.get('huandeng:ui-locale')).toBe('zh-CN');
    desktop.setLocale.mockRejectedValueOnce(new Error('preferences locked'));
    await expect(setUiLocale('zh-CN')).rejects.toThrow('preferences locked');
    expect(getUiLocale()).toBe('en');
  });

  it('localizes generated names while keeping authored names, even when they equal a system message', async () => {
    await setUiLocale('en');
    expect(animationStepLabel(step, animation)).toBe('Step 1');
    expect(
      animationStepLabel(
        { ...step, id: 'timeline:end' },
        { ...animation, effects: [{ ...effect, id: 'timeline:end' }] },
      ),
    ).toBe('Step 1');
    expect(
      animationStepLabel(step, { ...animation, effects: [{ ...effect, label: '步骤 1' }] }),
    ).toBe('步骤 1');
    expect(
      animationStepLabel(
        { ...step, id: 'cue:a' },
        { schemaVersion: 1, cues: [{ id: 'a', label: '动画结束' }] },
      ),
    ).toBe('动画结束');
    expect(animationStepLabel({ ...step, id: 'timeline:end' }, { schemaVersion: 1 })).toBe(
      'Animation end',
    );
    expect(elementLabel({ elementId: 'a', elementType: 'shape', name: '淡入' })).toBe('淡入');
    expect(
      elementLabel({ elementId: 'a', elementType: 'text', content: { text: '主幻灯片' } }),
    ).toBe('主幻灯片');
  });

  it('renders the animation workspace in both languages without changing page bytes or invoking writes', async () => {
    const page = {
      pageId: 'page',
      shortCode: 'A8AA',
      path: 'page.page',
      state: 'active',
      pageRevision: 'sha256:p',
      renderRevision: 'sha256:r',
      metadata: { shortCode: 'A8AA', path: 'page.page', state: 'active' },
      data: {
        elements: [
          { elementId: 'figure', elementType: 'shape', name: '淡入', bounds: [10, 10, 50, 50] },
        ],
        timeline: animation,
        notes: 'Keep this Chinese note 中文。',
      },
    } as PageSnapshot;
    const before = JSON.stringify(page);
    const onChange = vi.fn();
    const render = () =>
      renderToStaticMarkup(
        <AnimationPanel
          page={page}
          disabled={false}
          onChange={onChange}
          onPreview={() => {}}
          onTransitionChange={onChange}
        />,
      );
    const zh = render();
    await setUiLocale('en');
    const en = render();
    expect(zh).toContain('Slide动画步骤');
    expect(en).toContain('Add effect');
    expect(en).toContain('>淡入</span>');
    expect(en).not.toContain('>添加效果');
    expect(JSON.stringify(page)).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
  });
});
