/** v2 owns its proposed defaults and motion. Never replace it with a later version's model. */
export interface PilotValues {
  size: number;
  blinkHz: number;
  warningSeconds: number;
  scrollSpeed: number;
}
export type VariantId = 'height-arrow' | 'tracking-arrow' | 'edge-beacon';
export const pilotV2 = {
  ideaId: 'delivery-arrow-study',
  versionId: 'delivery-arrow-v2',
  duration: 10,
  pickup: 2,
  handoff: 8,
  defaults: { size: 40, blinkHz: 1, warningSeconds: 4, scrollSpeed: 180 } as PilotValues,
  variants: [
    {
      id: 'height-arrow',
      name: 'Höhenpfeil',
      description: 'Weich pulsierender horizontaler Pfeil am rechten Rand auf Empfängerhöhe.',
    },
    {
      id: 'tracking-arrow',
      name: 'Folgender Pfeil',
      description:
        'Außerhalb der Szene horizontaler Wegweiser; über sichtbarem Empfänger nach unten gerichtet.',
    },
    {
      id: 'edge-beacon',
      name: 'Randmarker',
      description: 'Weich pulsierendes Höhenband mit Pfeil und Restzeit am rechten Szenenrand.',
    },
  ] as const,
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
export function isVariant(value: unknown): value is VariantId {
  return pilotV2.variants.some((variant) => variant.id === value);
}
export function validPilotValues(value: unknown): value is PilotValues {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === pilotV2.controls.length &&
    pilotV2.controls.every((control) => {
      const v = record[control.id];
      return (
        typeof v === 'number' &&
        Number.isFinite(v) &&
        v >= control.min &&
        v <= control.max &&
        Math.abs((v - control.min) / control.step - Math.round((v - control.min) / control.step)) <
          1e-8
      );
    })
  );
}
export function timeline(values: PilotValues) {
  return [
    { seconds: 0, name: 'Start' },
    { seconds: pilotV2.pickup, name: 'Paketaufnahme' },
    { seconds: pilotV2.handoff - values.warningSeconds, name: 'Vorwarnung' },
    { seconds: pilotV2.handoff, name: 'Übergabe' },
    { seconds: pilotV2.duration, name: 'Ende' },
  ];
}
export function sceneAt(seconds: number, values: PilotValues, variant: VariantId) {
  const time = Math.max(0, Math.min(pilotV2.duration, seconds));
  const recipientX = 160 + (pilotV2.handoff - time) * values.scrollSpeed;
  const cueVisible = time >= pilotV2.handoff - values.warningSeconds && time < pilotV2.handoff;
  const phase: 'approach' | 'carrying' | 'warning' | 'delivered' =
    time >= pilotV2.handoff
      ? 'delivered'
      : cueVisible
        ? 'warning'
        : time >= pilotV2.pickup
          ? 'carrying'
          : 'approach';
  return {
    seconds: time,
    phase,
    carrying: time >= pilotV2.pickup && time < pilotV2.handoff,
    parcelX: 160 + (pilotV2.pickup - time) * values.scrollSpeed,
    recipientX,
    groundOffset: (time * values.scrollSpeed) % 100,
    cueVisible,
    cueX: variant === 'tracking-arrow' ? Math.max(200, Math.min(744, recipientX)) : 744,
    cueY: variant === 'tracking-arrow' ? 60 : 105,
    cueRotation: variant === 'tracking-arrow' && recipientX <= 744 ? 90 : 0,
    cueOpacity: 0.65 + 0.35 * Math.cos(2 * Math.PI * time * values.blinkHz),
    remaining: Math.max(0, pilotV2.handoff - time),
  };
}
export function advancePlayhead(
  seconds: number,
  elapsed: number,
  speed: 0.5 | 1 | 2,
  loop: boolean,
) {
  const next = seconds + elapsed * speed;
  return loop
    ? { seconds: next % pilotV2.duration, ended: false }
    : { seconds: Math.min(pilotV2.duration, next), ended: next >= pilotV2.duration };
}
