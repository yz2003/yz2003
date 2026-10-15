# Robot Dog 3D

A Three.js (r128) model of the white quadruped robot from the product renders, built entirely from code (no mesh files).

Open `index.html` in a browser. It loads Three.js and OrbitControls from a CDN.

- Drag to orbit a full 360°, scroll or pinch to zoom, right-drag or two-finger drag to pan.
- **Pose**: Stand, Sit, or Trot (a trot in place with diagonal leg pairs).
- **View**: jump to front, side, rear, top or 3/4 views. Auto-rotate spins the turntable.

## How it is built

- Body shells (main block, chamfered rear deck, tapering neck, head) are lofts through rounded-trapezoid sections.
- Actuators are lathed cylinders: a hip roll motor along the body and a hip pitch motor across it at each corner.
- Thighs are thick, slightly bowed sweeps that are broad over the hip and round at the knee. Calves are machined-looking sweeps with a bend toward the foot, a lattice linkage at the knee and a rubber boot at the end.
- Each leg is driven by two-link inverse kinematics with the knees bending backward, so the poses only set body height, pitch and foot positions.
- The visor, side port panel and turntable are drawn on canvas textures.
