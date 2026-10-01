import {
  controlPreview,
  validArrowValues,
} from '../prototypes/delivery-arrow/controls-v0/model.ts';
import {
  timeline as deliveryTimeline,
  isVariant as isV1,
  pilotV1,
  validPilotValues as validV1,
} from '../prototypes/delivery-arrow/v1/model.ts';
import {
  isVariant as isV2,
  pilotV2,
  validPilotValues as validV2,
} from '../prototypes/delivery-arrow/v2/model.ts';
import { pickupRing, validValues } from '../prototypes/pickup-ring/v1/model.ts';

export interface PrototypeDefinition {
  ideaId: string;
  versionId: string;
  entry: string | null;
  defaults: Record<string, number>;
  variants: readonly { readonly id: string; readonly name: string }[];
  controls: readonly {
    readonly id: string;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  validateValues(value: unknown): boolean;
  validateVariant(value: unknown): boolean;
  events(values: Record<string, number>): { name: string; seconds: number }[];
  handoff: {
    appearance: string;
    timeline: string[];
    lifecycle: string[];
    assumptions: string[];
    criteria: string[];
  };
}
function deliveryEvents(values: Record<string, number>) {
  if (!validV1(values)) throw new Error('Ungültige Lieferpfeilwerte');
  return deliveryTimeline(values);
}
const deliveryHandoff = {
  appearance:
    'Schematischer Lieferpfeil in #ffd08b; Empfängerhöhe und Pfeilkonzept aus der gewählten Studie übernehmen.',
  timeline: [
    '0 s Start',
    '2 s Paketaufnahme',
    '8 s Übergabe',
    '10 s Ende; Vorwarnung beginnt bei 8 s minus warningSeconds. Alle Zeiten sind Designvorschläge.',
  ],
  lifecycle: [
    'Cue an aktuelle Lieferroute/Empfänger anbinden; nach Übergabe oder Abbruch entfernen.',
    'Bei Pause/Background keine nachgeholte Simulationszeit; beim Despawn Listener/Renderer bereinigen.',
    'Reale Aufnahme/Übergabe, Pooling und Audio müssen in der beauftragten Spielintegration geprüft werden.',
  ],
  assumptions: [
    'Studie besitzt keine Kollisionen, Rewards oder echte Flugsteuerung.',
    'Pixel beziehen sich auf eine SVG-Szene von 800 × 260; Spielskalierung und TimeService-Anbindung sind offen.',
  ],
  criteria: [
    'Aktuelle Route korrekt markieren; Cue nur im beauftragten Warnfenster sichtbar.',
    'Pfeilgröße, Blink-/Pulsrate und Konzept mit der konkreten Auswahl vergleichen.',
    'Reale Trigger, Rewards, Lifecycle und Touch-Geräte separat prüfen.',
  ],
};
export const prototypes: Record<string, PrototypeDefinition> = {
  [controlPreview.versionId]: {
    ...controlPreview,
    defaults: { ...controlPreview.defaults },
    entry: null,
    variants: [{ id: controlPreview.variantId, name: 'Controls-Vorschau' }],
    validateValues: validArrowValues,
    validateVariant: (value) => value === controlPreview.variantId,
    events: deliveryEvents,
    handoff: deliveryHandoff,
  },
  [pilotV1.versionId]: {
    ...pilotV1,
    defaults: { ...pilotV1.defaults },
    entry: 'prototypes/delivery-arrow/v1/index.html',
    validateValues: validV1,
    validateVariant: isV1,
    events: deliveryEvents,
    handoff: deliveryHandoff,
  },
  [pilotV2.versionId]: {
    ...pilotV2,
    defaults: { ...pilotV2.defaults },
    entry: 'prototypes/delivery-arrow/v2/index.html',
    validateValues: validV2,
    validateVariant: isV2,
    events: deliveryEvents,
    handoff: {
      ...deliveryHandoff,
      appearance:
        'Weich pulsierender #ffd08b-Pfeil; folgendes Konzept zeigt außerhalb der Szene horizontal, über dem sichtbaren Empfänger nach unten.',
    },
  },
  [pickupRing.versionId]: {
    ...pickupRing,
    entry: 'prototypes/pickup-ring/v1/index.html',
    validateValues: validValues,
    validateVariant: (value) => pickupRing.variants.some((v) => v.id === value),
    events: (values) => [
      { name: 'Vorgeschlagener Pickup', seconds: 0 },
      { name: 'Effektende', seconds: values.duration },
    ],
    handoff: {
      appearance:
        'Türkisfarbener Ring oder Scheibe (#9fe7d9), von Radius 0 zum gewählten Endradius wachsend und ausblendend.',
      timeline: ['Start bei vorgeschlagenem Pickup-Ereignis, Effektende nach duration Sekunden.'],
      lifecycle: [
        'Nur bei bestätigtem Pickup spawnen, an Pickup-Ort darstellen und nach Effektende despawnen.',
        'Pause/Abbruch/Scene-Wechsel bereinigen; Pooling in der realen Integration prüfen.',
      ],
      assumptions: [
        'Freie Darstellung, kein Nachweis eines realen Spieltriggers.',
        'Maße gelten für die 300 × 160 SVG-Studie; reale Skalierung bleibt offen.',
      ],
      criteria: [
        'Genau einen Effekt pro realem Pickup zeigen.',
        'Farbe, Endradius und Dauer mit konkreten Werten vergleichen.',
        'Pause, Abbruch und Despawn ohne doppelte Effekte prüfen.',
      ],
    },
  },
};
export function definitionFor(versionId: string): PrototypeDefinition | undefined {
  return Object.keys(prototypes).includes(versionId) ? prototypes[versionId] : undefined;
}
export const comparisonIdeas = ['delivery-arrow-study'];
