from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/game/scenes/Foundation.ts",
    "} from '../PrototypeFlightLayout';\n",
    "} from '../PrototypeFlightLayout';\nimport { getLogicalViewportFromBacking } from '../RenderResolution';\n",
)

replace_once(
    "src/game/scenes/Foundation.ts",
    """    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));\n\n    this.viewportService = new ViewportService(this.scale.width, this.scale.height, safeArea);\n""",
    """    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));\n    const renderViewport = getLogicalViewportFromBacking(\n      this.scale.width,\n      this.scale.height,\n      this.scale.zoom,\n    );\n    this.cameras.main.setZoom(renderViewport.renderScale);\n\n    this.viewportService = new ViewportService(\n      renderViewport.width,\n      renderViewport.height,\n      safeArea,\n    );\n""",
)

replace_once(
    "src/game/scenes/Foundation.ts",
    """    this.title = this.add\n      .text(0, 0, 'Monster Girl Delivery', {\n        color: '#ffffff',\n        fontFamily: 'Arial, sans-serif',\n        fontStyle: 'bold',\n      })\n      .setOrigin(0.5);\n""",
    """    this.title = this.add\n      .text(0, 0, 'Monster Girl Delivery', {\n        color: '#ffffff',\n        fontFamily: 'Arial, sans-serif',\n        fontStyle: 'bold',\n      })\n      .setResolution(renderViewport.renderScale)\n      .setOrigin(0.5);\n""",
)

replace_once(
    "src/game/scenes/Foundation.ts",
    """    this.instructions = this.add\n      .text(0, 0, RUNNING_INSTRUCTIONS, {\n        align: 'center',\n        color: '#b9c8ec',\n        fontFamily: 'Arial, sans-serif',\n        fontSize: '18px',\n        lineSpacing: 8,\n      })\n      .setOrigin(0.5);\n""",
    """    this.instructions = this.add\n      .text(0, 0, RUNNING_INSTRUCTIONS, {\n        align: 'center',\n        color: '#b9c8ec',\n        fontFamily: 'Arial, sans-serif',\n        fontSize: '18px',\n        lineSpacing: 8,\n      })\n      .setResolution(renderViewport.renderScale)\n      .setOrigin(0.5);\n""",
)

replace_once(
    "src/game/scenes/Foundation.ts",
    """    this.cameras.resize(gameSize.width, gameSize.height);\n    this.viewportService.resize(\n      gameSize.width,\n      gameSize.height,\n      readSafeAreaInsets(document.getElementById('safe-area-probe')),\n    );\n""",
    """    const renderViewport = getLogicalViewportFromBacking(\n      gameSize.width,\n      gameSize.height,\n      this.scale.zoom,\n    );\n    this.cameras.resize(gameSize.width, gameSize.height);\n    this.cameras.main.setZoom(renderViewport.renderScale);\n    this.title?.setResolution(renderViewport.renderScale);\n    this.instructions?.setResolution(renderViewport.renderScale);\n    this.viewportService.resize(\n      renderViewport.width,\n      renderViewport.height,\n      readSafeAreaInsets(document.getElementById('safe-area-probe')),\n    );\n""",
)

replace_once(
    "tests/game/scenes/FoundationDirectorMode.test.ts",
    """    setPosition() {\n      return this;\n    },\n    setText() {\n""",
    """    setPosition() {\n      return this;\n    },\n    setResolution() {\n      return this;\n    },\n    setText() {\n""",
)

replace_once(
    "tests/game/scenes/FoundationDirectorMode.test.ts",
    """    readonly cameras = {\n      main: { setBackgroundColor: () => undefined },\n      resize: () => undefined,\n    };\n""",
    """    readonly cameras = {\n      main: {\n        setBackgroundColor: () => undefined,\n        setZoom: () => undefined,\n      },\n      resize: () => undefined,\n    };\n""",
)

replace_once(
    "tests/game/scenes/FoundationDirectorMode.test.ts",
    """      on: () => undefined,\n      width: 800,\n    };\n""",
    """      on: () => undefined,\n      width: 800,\n      zoom: 1,\n    };\n""",
)

replace_once(
    "tests/game/scenes/Foundation.test.ts",
    """  const instructions = {\n    setPosition: vi.fn(),\n    setText: vi.fn(),\n    setWordWrapWidth: vi.fn(),\n  };\n""",
    """  const instructions = {\n    setPosition: vi.fn(),\n    setResolution: vi.fn(),\n    setText: vi.fn(),\n    setWordWrapWidth: vi.fn(),\n  };\n""",
)

replace_once(
    "tests/game/scenes/Foundation.test.ts",
    """  const scaleOff = vi.fn();\n  const cameraResize = vi.fn();\n""",
    """  const scaleOff = vi.fn();\n  const cameraResize = vi.fn();\n  const cameraSetZoom = vi.fn();\n""",
)

replace_once(
    "tests/game/scenes/Foundation.test.ts",
    """  Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 16 } });\n  Reflect.set(foundation, 'scale', { off: scaleOff });\n  Reflect.set(foundation, 'cameras', { resize: cameraResize });\n\n  return {\n    cameraResize,\n""",
    """  Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 16 } });\n  Reflect.set(foundation, 'scale', {\n    height: 800,\n    off: scaleOff,\n    width: 400,\n    zoom: 1,\n  });\n  Reflect.set(foundation, 'cameras', {\n    main: { setZoom: cameraSetZoom },\n    resize: cameraResize,\n  });\n\n  return {\n    cameraResize,\n    cameraSetZoom,\n""",
)

replace_once(
    "tests/game/scenes/Foundation.test.ts",
    """  it('flies into the added upper room and clamps on shrink without resetting the run', () => {\n""",
    """  it('keeps gameplay in CSS-pixel coordinates while the backing buffer runs at 2x', () => {\n    const { cameraResize, cameraSetZoom, foundation, playerPresentation, viewportService } =\n      createFoundationHarness();\n    vi.stubGlobal('document', { getElementById: vi.fn(() => null) });\n    const scale = Reflect.get(foundation, 'scale') as { zoom: number };\n    scale.zoom = 0.5;\n    Reflect.set(foundation, 'runState', {\n      phase: 'running',\n      motion: { distance: 123 },\n      flight: { positionY: 250, velocityY: 120 },\n    });\n    const handleResize = Reflect.get(foundation, 'handleResize') as (size: {\n      width: number;\n      height: number;\n    }) => void;\n\n    handleResize({ width: 1600, height: 1200 });\n\n    expect(cameraResize).toHaveBeenLastCalledWith(1600, 1200);\n    expect(cameraSetZoom).toHaveBeenLastCalledWith(2);\n    expect(viewportService.getSnapshot()).toMatchObject({\n      width: 800,\n      height: 600,\n      orientation: 'landscape',\n    });\n    expect(getRunMotionState(foundation)).toEqual({ distance: 123 });\n    expect(getFlightState(foundation)).toEqual({ positionY: 250, velocityY: 120 });\n    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(200, 460);\n  });\n\n  it('flies into the added upper room and clamps on shrink without resetting the run', () => {\n""",
)
