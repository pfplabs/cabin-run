# Cockpit camera integration

Branch: `feat/cockpit-cameras`. Based on cabin preview `8bf7e14`.

Press C or the existing camera button to cycle Chase → Orbit → Cockpit → Cabin → Chase. The label now names the active view. Vehicle switching retains the existing reset-to-chase behavior. Keyboard and touch driving controls are unchanged; cockpit deliberately locks orbit/zoom so input cannot move the eye through the vehicle shell.

## Model and physics contract

- `JeepRoot` and `PlaneRoot` remain the gameplay transform roots (Y-up, -Z forward).
- Model authors can add `JeepCockpitCamera` / `PlaneCockpitCamera` Object3D anchors anywhere below their corresponding root. Local -Z is the viewing direction; local +Y is camera up. Authored position and rotation take precedence.
- Existing GLBs get runtime anchors at jeep `[-0.5, 1.96, -0.25]` and plane `[-0.28, 2.4, -0.5]`. No GLB or Blender source changes are required by this commit.
- Camera applies the anchor's full world position/quaternion after the gameplay vehicle transform each frame. No separate pitch/bank formulas, terrain push-out, chase lag, scene traversal or vector allocation occur in the cockpit frame path.
- Near plane is 0.04 m seated and restored to the camera's original value outside. Only the active vehicle's cloned glazing materials use light alpha transparency while seated, restored on exit/switch. No geometry or lights are added.
- In `game.js`, instantiate CockpitCamera after `applyHeroMaterials` and root lookup. Preserve the three-argument `applyCockpit(camera,state,active)` hook. Keep cameraRig.update after vehicle.position/rotation updates. Flight-physics changes need no other adaptation.

## Verification

Chrome on Mac: both parked cockpit views visually inspected, clear forward view, C switching through cabin/chase and back, vehicle switch, pause. Screenshots are in ignored `artifacts/cockpit/{truck,plane}.png`. Local preview: http://localhost:4193/?qa=1 (server must remain running).

Automated tests cover full pitch/yaw/roll and parent transforms, authored nested-anchor precedence, glass isolation/restoration, cockpit near-plane restoration, bypassing exterior collision, clearing active drag capture, pause/resume, and existing touch/orbit/zoom behavior.

Limitations: current models have simple interior geometry (no new instrument panel or working gauges). Fixed forward cockpit view; no cockpit head-look. Future replacement vehicle geometry should supply tuned anchors and be visually rechecked. Live airborne/mobile-device QA and combined-build performance profiling remain for the integrator; no claim of a measured FPS gain.
