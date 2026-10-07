# SME Hero agent (office simulator sample)

The SMEHero.ai mascot rebuilt as a voxel character for a Three.js office simulator.

- `smehero-character.js`: the reusable character rig. It has no dependencies other than Three.js (r128+).
- `index.html`: a demo HR desk with the agent, its HUD tag and controls.

Open `index.html` in a browser (it loads Three.js from a CDN).

## Using the character in your simulator

```js
const hero = SMEHero.create(THREE);
scene.add(hero.root);
hero.setState('work');   // 'work' | 'idle' | 'walk' | 'thumbs'

// each frame
hero.update(deltaSeconds, elapsedSeconds);
```

- The rig stands on `y = 0`, faces `+z` and is about 2.35 units tall.
- For `work` (seated typing), lower `hero.root` by `SMEHero.SEAT_DROP` over a chair seat whose top is at `y = 0.42`.
- `hero.setFolder(bool)` shows or hides the red folder. `hero.setEyeColor(hex)` recolors the visor eyes, for example to show an agent's status.
- `hero.meshes` lists every mesh, for raycasting clicks.
- Palette overrides: `SMEHero.create(THREE, { palette: { suit: 0x2a2f45 } })`.
