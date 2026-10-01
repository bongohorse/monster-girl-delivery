/** Proposed schematic controls, isolated from the game's delivery tuning. */
export interface ArrowValues {
  size: number;
  blinkHz: number;
  warningSeconds: number;
  scrollSpeed: number;
}
export const controlPreview = {
  ideaId: 'delivery-arrow-study',
  versionId: 'delivery-arrow-controls-v0',
  variantId: 'preview',
  defaults: { size: 32, blinkHz: 1, warningSeconds: 3, scrollSpeed: 180 } as ArrowValues,
  controls: [
    { id: 'size', label: 'Pfeilgröße', unit: 'px', min: 16, max: 64, step: 2 },
    { id: 'blinkHz', label: 'Blinkrate', unit: 'Hz', min: 0.5, max: 4, step: 0.5 },
    { id: 'warningSeconds', label: 'Vorwarnzeit', unit: 's', min: 0.5, max: 6, step: 0.5 },
    {
      id: 'scrollSpeed',
      label: 'Scrollgeschwindigkeit',
      unit: 'px/s',
      min: 60,
      max: 300,
      step: 20,
    },
  ] as const,
};
export function validArrowValues(value: unknown): value is ArrowValues {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== controlPreview.controls.length) return false;
  return controlPreview.controls.every((control) => {
    const number = record[control.id];
    return (
      typeof number === 'number' &&
      Number.isFinite(number) &&
      number >= control.min &&
      number <= control.max &&
      Math.abs(
        (number - control.min) / control.step - Math.round((number - control.min) / control.step),
      ) < 1e-8
    );
  });
}
export function arrowSample(values: ArrowValues, seconds: number) {
  return {
    recipientX: 440 - values.scrollSpeed * seconds,
    size: values.size,
    visible: seconds <= values.warningSeconds,
    opacity: (seconds * values.blinkHz) % 1 < 0.5 ? 1 : 0.3,
  };
}
