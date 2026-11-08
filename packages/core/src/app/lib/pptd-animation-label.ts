import type { AnimationStep } from '../../pptd/animation-model';
import { uiText as t } from './huandeng-locale';

/** Localize generated step names while preserving every authored label verbatim. */
export function animationStepLabel(step: AnimationStep, animation: unknown): string {
  let legacy = false;
  if (animation && typeof animation === 'object') {
    const value = animation as Record<string, unknown>;
    if (value.schemaVersion === 2 && Array.isArray(value.effects)) {
      const effect = value.effects.find((item) => item?.id === step.id);
      if (typeof effect?.label === 'string' && effect.label.trim()) return effect.label.trim();
    }
    legacy = value.schemaVersion === 1;
    if (legacy && Array.isArray(value.cues)) {
      const cue = value.cues.find((item) => `cue:${item?.id}` === step.id);
      if (typeof cue?.label === 'string' && cue.label) return cue.label;
    }
  }
  return legacy && step.id === 'timeline:end'
    ? t('动画结束')
    : t('步骤 {value0}', { value0: step.index + 1 });
}
