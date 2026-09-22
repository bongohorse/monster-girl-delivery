# MGD Android PWA shell

## Purpose

MGD can be installed from a supporting Android Chromium browser as a standalone/fullscreen Progressive Web App while continuing to use the same Phaser/Vite web build.

This is the lightweight packaging step before the dedicated Capacitor Android container in #407.

## Installability contract

The production web build publishes `manifest.webmanifest` with:

- app name `Monster Girl Delivery` and short name `MGD`;
- stable relative `id`, `start_url`, and `scope` so sub-path deployments keep working;
- requested `fullscreen` display with `standalone` fallback;
- landscape orientation intent;
- opaque 192x192 and 512x512 PNG icons;
- matching `#121426` theme/background colors.

The page links the manifest directly from `index.html`.

## Deliberate no-service-worker policy

MGD does **not** register a service worker in this gate.

A service worker is not required for Chromium PWA installation, and omitting it is intentional because performance acceptance currently depends on knowing that the browser is running the exact requested commit. Silent offline/runtime caching could otherwise keep an older gameplay or benchmark build alive after deployment.

If offline support is introduced later, it must include an explicit cache/version authority and a documented benchmark bypass/invalidation path before it is enabled for performance evidence.

## Hosted test build

The production web build is deployed from `main` through GitHub Actions to GitHub Pages. This provides an HTTPS test target without requiring a Codespace or local development server.

Expected project URL:

`https://bongohorse.github.io/monster-girl-delivery/`

The Pages workflow builds the normal Vite production output and deploys only `dist/`. Pull requests build the same artifact but do not deploy it.

If the repository has not used GitHub Pages before, repository Settings → Pages may need the publishing source set to **GitHub Actions** once before the first deployment can succeed.

## Android install smoke

On the HTTPS-hosted production build:

1. open MGD in Android Chrome/Chromium;
2. use the browser's **Install app** / **Add to Home screen** action when offered;
3. launch MGD from its installed launcher icon;
4. confirm there is no ordinary browser URL/navigation bar;
5. confirm landscape sizing, safe areas, touch input, boot screen, gameplay and retry still work;
6. for performance evidence, record whether the run came from ordinary browser Chrome or the installed PWA shell.

The installed display mode may be constrained by the host browser/OS. The manifest requests fullscreen first and falls back to standalone rather than requiring browser chrome.

## Development and benchmarks

Normal browser development remains supported. The PWA manifest does not change gameplay, simulation, collision, RNG, or timing authority.

Do not compare benchmark captures from different runtime shells as if they were the same environment. Use browser-vs-browser or installed-PWA-vs-installed-PWA BEFORE/AFTER pairs on the same device.
