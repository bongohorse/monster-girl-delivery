import { describe, expect, it, vi } from 'vitest';
import { Preloader } from '../../../src/game/scenes/Preloader';

vi.mock('phaser', () => ({
  Loader: { Events: { PROGRESS: 'progress' } },
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const createResizableObject = () => {
  const gameObject = {
    setDisplaySize: vi.fn(),
    setOrigin: vi.fn(),
    setPosition: vi.fn(),
    setSize: vi.fn(),
    setStrokeStyle: vi.fn(),
  };
  gameObject.setDisplaySize.mockReturnValue(gameObject);
  gameObject.setOrigin.mockReturnValue(gameObject);
  gameObject.setPosition.mockReturnValue(gameObject);
  gameObject.setSize.mockReturnValue(gameObject);
  gameObject.setStrokeStyle.mockReturnValue(gameObject);
  return gameObject;
};

const createPreloaderHarness = () => {
  const preloader = new Preloader();
  const background = createResizableObject();
  const frame = createResizableObject();
  const fill = createResizableObject();
  const addImage = vi.fn(() => background);
  const addRectangle = vi.fn().mockReturnValueOnce(frame).mockReturnValueOnce(fill);
  const loadOn = vi.fn();
  const loadOff = vi.fn();
  const scaleOn = vi.fn();
  const scaleOff = vi.fn();
  const sceneOnce = vi.fn();
  const cameraResize = vi.fn();

  Reflect.set(preloader, 'add', { image: addImage, rectangle: addRectangle });
  Reflect.set(preloader, 'load', { on: loadOn, off: loadOff });
  Reflect.set(preloader, 'scale', {
    width: 390,
    height: 844,
    on: scaleOn,
    off: scaleOff,
  });
  Reflect.set(preloader, 'events', { once: sceneOnce });
  Reflect.set(preloader, 'cameras', { resize: cameraResize });
  Reflect.set(preloader, 'scene', { start: vi.fn() });

  preloader.init();

  return {
    addImage,
    addRectangle,
    background,
    cameraResize,
    fill,
    frame,
    loadOff,
    loadOn,
    preloader,
    scaleOff,
    scaleOn,
    sceneOnce,
  };
};

const getHandler = (preloader: Preloader, name: string): ((...args: unknown[]) => void) => {
  const handler: unknown = Reflect.get(preloader, name);
  expect(handler).toBeTypeOf('function');
  if (typeof handler !== 'function') {
    throw new TypeError(`Preloader ${name} is unavailable.`);
  }
  return handler as (...args: unknown[]) => void;
};

describe('Preloader scene responsive layout', () => {
  it('creates the loading presentation and registers one listener per event', () => {
    const { addImage, addRectangle, loadOn, preloader, scaleOn, sceneOnce } =
      createPreloaderHarness();
    const handleProgress = getHandler(preloader, 'handleProgress');
    const handleResize = getHandler(preloader, 'handleResize');
    const handleShutdown = getHandler(preloader, 'handleShutdown');

    expect(addImage).toHaveBeenCalledWith(195, 422, 'background');
    expect(addRectangle).toHaveBeenNthCalledWith(1, 195, 422, 334, 32);
    expect(addRectangle).toHaveBeenNthCalledWith(2, 32, 422, 4, 28, 0xffffff);
    expect(loadOn).toHaveBeenCalledOnce();
    expect(loadOn).toHaveBeenCalledWith('progress', handleProgress);
    expect(scaleOn).toHaveBeenCalledOnce();
    expect(scaleOn).toHaveBeenCalledWith('resize', handleResize);
    expect(sceneOnce).toHaveBeenCalledOnce();
    expect(sceneOnce).toHaveBeenCalledWith('shutdown', handleShutdown);
  });

  it('preserves progress while relaying out repeated resize events', () => {
    const { background, cameraResize, fill, frame, preloader, scaleOn } = createPreloaderHarness();
    const handleProgress = getHandler(preloader, 'handleProgress');
    const handleResize = getHandler(preloader, 'handleResize');

    handleProgress(0.5);
    handleResize({ width: 844, height: 390 });
    handleResize({ width: 320, height: 568 });

    expect(cameraResize).toHaveBeenCalledTimes(2);
    expect(cameraResize).toHaveBeenNthCalledWith(1, 844, 390);
    expect(cameraResize).toHaveBeenLastCalledWith(320, 568);
    expect(background.setPosition).toHaveBeenLastCalledWith(160, 284);
    expect(background.setDisplaySize).toHaveBeenLastCalledWith(320, 568);
    expect(frame.setPosition).toHaveBeenLastCalledWith(160, 284);
    expect(frame.setSize).toHaveBeenLastCalledWith(264, 32);
    expect(fill.setPosition).toHaveBeenLastCalledWith(32, 284);
    expect(fill.setSize).toHaveBeenLastCalledWith(128, 28);
    expect(Reflect.get(preloader, 'loadProgress')).toBe(0.5);
    expect(scaleOn).toHaveBeenCalledOnce();
  });

  it('removes external listeners exactly once on shutdown', () => {
    const { loadOff, preloader, scaleOff } = createPreloaderHarness();
    const handleProgress = getHandler(preloader, 'handleProgress');
    const handleResize = getHandler(preloader, 'handleResize');
    const handleShutdown = getHandler(preloader, 'handleShutdown');

    handleShutdown();
    handleShutdown();

    expect(loadOff).toHaveBeenCalledOnce();
    expect(loadOff).toHaveBeenCalledWith('progress', handleProgress);
    expect(scaleOff).toHaveBeenCalledOnce();
    expect(scaleOff).toHaveBeenCalledWith('resize', handleResize);
    expect(Reflect.get(preloader, 'background')).toBeUndefined();
    expect(Reflect.get(preloader, 'loadingBarFrame')).toBeUndefined();
    expect(Reflect.get(preloader, 'loadingBarFill')).toBeUndefined();
  });
});
