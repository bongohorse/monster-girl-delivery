import { catalog } from '../../../src/catalog';
import { mountPrototype } from '../../../src/prototypeLoader';

let dispose: (() => void) | undefined;
async function render() {
  dispose?.();
  const mounted = await mountPrototype('pickup-ring-v1', catalog, () => {
    void render();
  });
  dispose = mounted.dispose;
  const root = document.getElementById('pilot');
  root?.querySelector('section')?.remove();
  root?.append(mounted.element);
}
void render();
