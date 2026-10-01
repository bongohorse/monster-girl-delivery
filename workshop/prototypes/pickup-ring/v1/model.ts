/** Independent pickup-feedback study, with no delivery model or gameplay imports. */
export const pickupRing = {
  ideaId: 'pickup-ring-study',
  versionId: 'pickup-ring-v1',
  duration: 2,
  defaults: { radius: 24, duration: 1 },
  variants: [
    { id: 'ring', name: 'Ring' },
    { id: 'disc', name: 'Scheibe' },
  ],
  controls: [
    { id: 'radius', label: 'Endradius', unit: 'px', min: 8, max: 48, step: 2 },
    { id: 'duration', label: 'Effektdauer', unit: 's', min: 0.2, max: 2, step: 0.1 },
  ],
} as const;
export function validValues(value: unknown): value is { radius: number; duration: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    Object.keys(r).length === 2 &&
    pickupRing.controls.every((c) => {
      const v = r[c.id];
      return (
        typeof v === 'number' &&
        Number.isFinite(v) &&
        v >= c.min &&
        v <= c.max &&
        Math.abs((v - c.min) / c.step - Math.round((v - c.min) / c.step)) < 1e-8
      );
    })
  );
}
export function effectAt(seconds: number, values: { radius: number; duration: number }) {
  const progress = Math.min(1, Math.max(0, seconds / values.duration));
  return { radius: values.radius * progress, opacity: 1 - progress };
}
