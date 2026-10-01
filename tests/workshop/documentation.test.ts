import { describe, expect, it } from 'vitest';
import { catalog } from '../../workshop/src/catalog';
import { resolveRoute } from '../../workshop/src/navigation';
import { sourceHref } from '../../workshop/src/ui';

describe('Workshop documentation links', () => {
  it('binds a source to its own checked revision and preserves special path characters', () => {
    expect(
      sourceHref({
        id: 'historical',
        kind: 'doc',
        path: 'docs/Review #1.md',
        revision: '8f33d40ded0684ccd55248fdbb4f4332abdb005c',
      }),
    ).toBe(
      'https://github.com/bongohorse/monster-girl-delivery/blob/8f33d40ded0684ccd55248fdbb4f4332abdb005c/docs/Review%20%231.md',
    );
  });

  it('opens all delivery-group elements and their authored relationships through public routes', () => {
    for (const id of ['parcel', 'delivery-recipient', 'delivery-arrow', 'parcel-delivery']) {
      const route = resolveRoute(`#/element/${id}`, catalog);
      expect(route.kind).toBe('element');
      if (route.kind !== 'element') throw new Error('Delivery element missing');
      for (const relatedId of route.element.relatedElementIds) {
        expect(resolveRoute(`#/element/${relatedId}`, catalog).kind).toBe('element');
      }
      for (const section of route.element.detailSections) {
        for (const fact of section.facts) {
          expect(fact.sourceIds.length, fact.label).toBeGreaterThan(0);
          for (const sourceId of fact.sourceIds) {
            expect(
              route.element.sources.some((source) => source.id === sourceId),
              `${id}: ${fact.label} (${sourceId})`,
            ).toBe(true);
          }
        }
      }
    }
  });
});
