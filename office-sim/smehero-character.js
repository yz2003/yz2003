/*
 * SME Hero — voxel agent character for a Three.js office simulator (r128+).
 *
 *   var hero = SMEHero.create(THREE);
 *   scene.add(hero.root);
 *   hero.setState('work');            // 'work' | 'idle' | 'walk' | 'thumbs'
 *   // every frame:
 *   hero.update(deltaSeconds, elapsedSeconds);
 *
 * The rig stands on y = 0 with its feet between x = ±0.12 and faces +z.
 * It is about 2.35 units tall. Moving the character around the office
 * (desk seat, walk paths) is left to the scene: position and rotate hero.root.
 * For the 'work' pose, lower hero.root by SMEHero.SEAT_DROP so the hips land
 * on a chair seat whose top is at y = 0.42.
 */
(function (global) {
  'use strict';

  var PALETTE = {
    silver: 0xc3c9d3,
    silverDark: 0x8e96a3,
    suit: 0x1e2744,
    suitDark: 0x141a30,
    shirt: 0xf1f2f4,
    tie: 0x14161c,
    visor: 0x0a1024,
    eye: 0x8fd8ff,
    neck: 0x3a3f4a,
    folder: 0x7d2128,
    pages: 0xebe4d2
  };

  // Joint target rotations per state, in radians [x, y, z]. Missing joints rest at 0.
  var POSES = {
    idle: {
      shL: [-0.05, 0, 0.08], shR: [-0.05, 0, -0.08],
      elL: [-0.55, 0, 0], elR: [-0.15, 0, 0]
    },
    work: {
      hipL: [-1.52, 0, 0.04], hipR: [-1.52, 0, -0.04],
      kneeL: [1.52, 0, 0], kneeR: [1.52, 0, 0],
      shL: [-0.95, 0, 0.06], shR: [-0.95, 0, -0.06],
      elL: [-0.6, 0, 0], elR: [-0.6, 0, 0],
      handL: [0.3, 0, 0], handR: [0.3, 0, 0],
      head: [0.14, 0, 0]
    },
    walk: {
      elL: [-0.35, 0, 0], elR: [-0.35, 0, 0]
    },
    thumbs: {
      shR: [-0.25, 0, -1.25], elR: [0, 0, -1.8],
      shL: [-0.15, 0, 0.1], elL: [-0.7, 0, 0],
      head: [0.04, 0, -0.1],
      thumbR: 1
    }
  };

  var JOINTS = ['hipL', 'hipR', 'kneeL', 'kneeR', 'shL', 'shR', 'elL', 'elR', 'handL', 'handR', 'torso', 'head'];

  function create(THREE, opts) {
    opts = opts || {};
    var P = Object.assign({}, PALETTE, opts.palette || {});

    function std(color, rough, metal) {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: rough == null ? 0.8 : rough,
        metalness: metal || 0,
        flatShading: true
      });
    }

    var M = {
      silver: std(P.silver, 0.38, 0.25),
      silverDark: std(P.silverDark, 0.45, 0.25),
      suit: std(P.suit, 0.85),
      suitDark: std(P.suitDark, 0.85),
      shirt: std(P.shirt, 0.9),
      tie: std(P.tie, 0.6),
      visor: new THREE.MeshStandardMaterial({
        color: P.visor, roughness: 0.15, metalness: 0.4,
        emissive: 0x0b1d4a, emissiveIntensity: 0.6
      }),
      eye: new THREE.MeshBasicMaterial({ color: P.eye }),
      glow: new THREE.MeshBasicMaterial({
        color: 0x2f7dff, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false
      }),
      neck: std(P.neck, 0.7),
      folder: std(P.folder, 0.7),
      pages: std(P.pages, 0.95)
    };

    var geoCache = {};
    var meshes = [];

    function box(parent, w, h, d, mat, x, y, z) {
      var key = w + '|' + h + '|' + d;
      var g = geoCache[key] || (geoCache[key] = new THREE.BoxGeometry(w, h, d));
      var m = new THREE.Mesh(g, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      meshes.push(m);
      return m;
    }

    function group(parent, x, y, z) {
      var g = new THREE.Group();
      g.position.set(x || 0, y || 0, z || 0);
      parent.add(g);
      return g;
    }

    // Three overlapping boxes give a stepped, voxel-style rounded box.
    function roundedBox(parent, w, h, d, r, mat, x, y, z) {
      var g = group(parent, x, y, z);
      box(g, w, h - 2 * r, d - 2 * r, mat);
      box(g, w - 2 * r, h, d - 2 * r, mat);
      box(g, w - 2 * r, h - 2 * r, d, mat);
      return g;
    }

    var root = new THREE.Group();
    root.name = 'SMEHero';
    var body = group(root);
    var hips = group(body, 0, 0.88, 0);
    var J = {};

    // Legs: side +1 is the character's left (+x), -1 its right.
    function leg(side) {
      var hip = group(hips, 0.12 * side, 0, 0);
      box(hip, 0.19, 0.42, 0.21, M.suit, 0, -0.2, 0);
      var knee = group(hip, 0, -0.4, 0);
      box(knee, 0.18, 0.38, 0.2, M.suit, 0, -0.19, 0);
      box(knee, 0.21, 0.11, 0.32, M.silver, 0, -0.425, 0.05);
      return { hip: hip, knee: knee };
    }
    var lL = leg(1), lR = leg(-1);
    J.hipL = lL.hip; J.kneeL = lL.knee;
    J.hipR = lR.hip; J.kneeR = lR.knee;

    // Torso: navy jacket, white shirt V, black tie, lapels, pocket square.
    var torso = group(hips);
    J.torso = torso;
    box(torso, 0.62, 0.62, 0.36, M.suit, 0, 0.29, 0);
    box(torso, 0.64, 0.1, 0.38, M.suit, 0, 0, 0);
    box(torso, 0.18, 0.2, 0.02, M.shirt, 0, 0.5, 0.181);
    box(torso, 0.1, 0.1, 0.02, M.shirt, 0, 0.36, 0.181);
    box(torso, 0.24, 0.05, 0.22, M.shirt, 0, 0.6, 0);
    box(torso, 0.07, 0.05, 0.03, M.tie, 0, 0.57, 0.19);
    box(torso, 0.055, 0.24, 0.025, M.tie, 0, 0.43, 0.19);
    box(torso, 0.04, 0.04, 0.025, M.tie, 0, 0.3, 0.19);
    box(torso, 0.08, 0.3, 0.03, M.suitDark, 0.11, 0.45, 0.186).rotation.z = -0.32;
    box(torso, 0.08, 0.3, 0.03, M.suitDark, -0.11, 0.45, 0.186).rotation.z = 0.32;
    box(torso, 0.07, 0.035, 0.02, M.shirt, 0.2, 0.47, 0.186);
    box(torso, 0.035, 0.035, 0.02, M.tie, 0, 0.2, 0.188);
    box(torso, 0.035, 0.035, 0.02, M.tie, 0, 0.1, 0.188);
    box(torso, 0.2, 0.1, 0.2, M.neck, 0, 0.64, 0);

    // Head: big rounded silver dome, dark visor, ear pods.
    var head = group(torso, 0, 0.68, 0);
    J.head = head;
    var HW = 0.86, HH = 0.78, HD = 0.8, hy = 0.4;
    roundedBox(head, HW, HH, HD, 0.12, M.silver, 0, hy, 0);
    [1, -1].forEach(function (s) {
      box(head, 0.06, 0.26, 0.26, M.silverDark, s * (HW / 2 + 0.03), hy - 0.03, 0);
      box(head, 0.03, 0.14, 0.14, M.silver, s * (HW / 2 + 0.07), hy - 0.03, 0);
    });

    var visor = group(head, 0, hy - 0.04, HD / 2 + 0.005);
    box(visor, 0.64, 0.3, 0.03, M.visor);
    box(visor, 0.56, 0.38, 0.03, M.visor);
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.22), M.glow);
    glow.position.set(0, 0.03, 0.017);
    visor.add(glow);

    // Speech-bubble pointer: a stepped tail off the lower edge of the head, on its left (+x) side.
    [[0.17, 0.42, -0.24], [0.13, 0.51, -0.31], [0.09, 0.58, -0.37], [0.055, 0.635, -0.415]].forEach(function (t) {
      box(head, t[0], t[0], t[0] * 1.7, M.silver, t[1], hy + t[2], 0.06);
    });

    // Eyes read "^ |" from the front: a chevron on the viewer's left, a bar on the right.
    var eyes = group(visor, 0, 0.03, 0.02);
    var px = 0.036;
    var EYE_SHAPES = {
      chevron: [[-2, -1], [-1, 0], [0, 1], [1, 0], [2, -1]],
      bar: [[0, -1], [0, 0], [0, 1]]
    };
    [[-0.15, 'chevron'], [0.15, 'bar']].forEach(function (e) {
      var eye = group(eyes, e[0], 0, 0);
      EYE_SHAPES[e[1]].forEach(function (p) {
        var m = box(eye, px, px, 0.012, M.eye, p[0] * px, p[1] * px, 0);
        m.castShadow = false;
      });
    });

    // "SMEHero.ai" logo on the forehead.
    if (typeof document !== 'undefined') {
      var c = document.createElement('canvas');
      c.width = 512; c.height = 80;
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'middle';
      ctx.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
      var brand = 'SMEHero', tld = '.ai';
      var bw = ctx.measureText(brand).width;
      ctx.font = '500 56px system-ui, -apple-system, Segoe UI, sans-serif';
      var x0 = (512 - bw - ctx.measureText(tld).width) / 2;
      ctx.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillStyle = '#3c4350';
      ctx.fillText(brand, x0, 42);
      ctx.font = '500 56px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillStyle = '#5d6573';
      ctx.fillText(tld, x0 + bw, 42);
      var tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      var label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.078),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      label.position.set(0, hy + 0.215, HD / 2 + 0.003);
      head.add(label);
    }

    // Arms with elbows, white cuffs and silver fists. Thumbs fold out for a thumbs-up.
    function arm(side) {
      var sh = group(torso, 0.4 * side, 0.52, 0);
      box(sh, 0.2, 0.14, 0.2, M.suit, 0, 0, 0);
      box(sh, 0.17, 0.27, 0.17, M.suit, 0, -0.13, 0);
      var el = group(sh, 0, -0.25, 0);
      box(el, 0.16, 0.2, 0.16, M.suit, 0, -0.09, 0);
      box(el, 0.165, 0.035, 0.165, M.shirt, 0, -0.195, 0);
      var hand = group(el, 0, -0.21, 0);
      box(hand, 0.16, 0.14, 0.15, M.silver, 0, -0.07, 0);
      var thumb = box(hand, 0.05, 0.09, 0.055, M.silver);
      return {
        sh: sh, el: el, hand: hand, thumb: thumb,
        tucked: new THREE.Vector3(-side * 0.085, -0.06, 0.035),
        raised: new THREE.Vector3(-side * 0.035, -0.185, 0.03)
      };
    }
    var aL = arm(1), aR = arm(-1);
    J.shL = aL.sh; J.elL = aL.el; J.handL = aL.hand;
    J.shR = aR.sh; J.elR = aR.el; J.handR = aR.hand;
    aL.thumb.position.copy(aL.tucked);
    aR.thumb.position.copy(aR.tucked);

    // Red folder carried in the left hand.
    var folder = group(aL.hand, 0.04, -0.1, 0.02);
    box(folder, 0.015, 0.38, 0.3, M.folder, 0.025, 0, 0);
    box(folder, 0.015, 0.38, 0.3, M.folder, -0.025, 0, 0);
    box(folder, 0.065, 0.38, 0.015, M.folder, 0, 0, -0.143);
    box(folder, 0.04, 0.35, 0.27, M.pages, 0, 0, 0.005);

    // --- animation -------------------------------------------------------
    var state = opts.state || 'idle';
    var cur = {};
    JOINTS.forEach(function (n) { cur[n] = [0, 0, 0]; });
    var thumbs = { L: 0, R: 0 };
    var bob = 0;
    var nextBlink = 2.5, blinkUntil = 0;

    function target(t) {
      var base = POSES[state] || POSES.idle;
      var out = {};
      JOINTS.forEach(function (n) { out[n] = (base[n] || [0, 0, 0]).slice(); });
      out.thumbL = base.thumbL || 0;
      out.thumbR = base.thumbR || 0;
      out.bob = 0;

      if (state === 'idle') {
        out.head[1] += Math.sin(t * 0.6) * 0.35;
        out.head[0] += Math.sin(t * 0.9) * 0.03;
        out.torso[0] += Math.sin(t * 1.6) * 0.015;
      } else if (state === 'work') {
        out.elL[0] += Math.sin(t * 16) * 0.08;
        out.elR[0] += Math.sin(t * 16 + 2) * 0.08;
        out.handL[0] += Math.sin(t * 16 + 1) * 0.05;
        out.handR[0] += Math.sin(t * 16 + 3) * 0.05;
        out.head[1] += Math.sin(t * 0.5) * 0.12;
      } else if (state === 'walk') {
        var ph = t * 7.5, s = Math.sin(ph), c = Math.cos(ph);
        out.hipL[0] = s * 0.6;
        out.hipR[0] = -s * 0.6;
        out.kneeL[0] = Math.max(0, -c) * 0.8;
        out.kneeR[0] = Math.max(0, c) * 0.8;
        out.shL[0] = -s * 0.5;
        out.shR[0] = s * 0.5;
        out.torso[1] = s * 0.06;
        out.head[1] = -s * 0.05;
        out.bob = Math.abs(c) * 0.045;
      } else if (state === 'thumbs') {
        out.elR[2] += Math.sin(t * 5) * 0.06;
        out.head[2] += Math.sin(t * 2) * 0.04;
        out.bob = Math.abs(Math.sin(t * 2.5)) * 0.02;
      }
      return out;
    }

    function update(dt, t) {
      var tg = target(t);
      var k = 1 - Math.exp(-dt * 10);
      JOINTS.forEach(function (n) {
        var c = cur[n], g = tg[n];
        for (var i = 0; i < 3; i++) c[i] += (g[i] - c[i]) * k;
        J[n].rotation.set(c[0], c[1], c[2]);
      });
      thumbs.L += (tg.thumbL - thumbs.L) * k;
      thumbs.R += (tg.thumbR - thumbs.R) * k;
      aL.thumb.position.lerpVectors(aL.tucked, aL.raised, thumbs.L);
      aR.thumb.position.lerpVectors(aR.tucked, aR.raised, thumbs.R);
      bob += (tg.bob - bob) * k;
      body.position.y = bob;

      if (t > nextBlink) {
        blinkUntil = t + 0.13;
        nextBlink = t + 2.5 + Math.random() * 3;
      }
      eyes.scale.y = t < blinkUntil ? 0.15 : 1;
      glow.material.opacity = 0.26 + Math.sin(t * 2.2) * 0.06;
    }

    return {
      root: root,
      joints: J,
      meshes: meshes,
      update: update,
      setState: function (s) { if (POSES[s]) state = s; },
      getState: function () { return state; },
      setFolder: function (v) { folder.visible = !!v; },
      setEyeColor: function (hex) { M.eye.color.set(hex); }
    };
  }

  global.SMEHero = { create: create, POSES: POSES, SEAT_DROP: 0.38 };
})(typeof window !== 'undefined' ? window : this);
