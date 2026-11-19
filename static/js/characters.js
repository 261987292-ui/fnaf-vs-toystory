(function (global) {
  "use strict";

  function mat(color, roughness) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness == null ? 0.62 : roughness,
      metalness: 0.03
    });
  }

  function block(group, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function sphere(group, radius, position, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  function baseBody(name, bodyColor, accentColor) {
    const g = new THREE.Group();
    g.name = name;
    g.userData.parts = {};
    block(g, [1.12, 1.38, 0.72], [0, 1.62, 0], mat(bodyColor));
    block(g, [0.90, 0.78, 0.82], [0, 2.64, 0], mat(bodyColor));
    g.userData.parts.leftArm = block(g, [0.34, 1.24, 0.34], [-0.74, 1.62, 0], mat(accentColor));
    g.userData.parts.rightArm = block(g, [0.34, 1.24, 0.34], [0.74, 1.62, 0], mat(accentColor));
    g.userData.parts.leftLeg = block(g, [0.40, 1.05, 0.42], [-0.34, 0.52, 0], mat(accentColor));
    g.userData.parts.rightLeg = block(g, [0.40, 1.05, 0.42], [0.34, 0.52, 0], mat(accentColor));
    g.userData.parts.head = g.children[1];
    g.userData.parts.eyes = [];
    [-0.24, 0.24].forEach(function (x) {
      const eye = sphere(g, 0.09, [x, 2.69, 0.43], new THREE.MeshBasicMaterial({color:0x58d9ff}));
      g.userData.parts.eyes.push(eye);
    });
    g.scale.setScalar(0.72);
    return g;
  }

  function freddy() {
    const g = baseBody("Freddy", 0x5b3822, 0x3a2417);
    block(g, [0.62, 0.42, 0.16], [0, 2.47, 0.43], mat(0x8b6548));
    block(g, [0.48, 0.12, 0.18], [0, 1.94, 0.40], mat(0x111111));
    block(g, [0.82, 0.13, 0.82], [0, 3.22, 0], mat(0x151515));
    block(g, [0.52, 0.48, 0.52], [0, 3.04, 0], mat(0x151515));
    [-0.38,0.38].forEach(function (x) {
      sphere(g, 0.13, [x,3.38,0], mat(0x5b3822));
    });
    const mic = block(g, [0.10,0.58,0.10], [0.84,1.05,0.35], mat(0x9ba3a8,0.25));
    g.userData.special = "toreador";
    g.userData.skillName = "Marcha del Toreador";
    g.userData.parts.weapon = mic;
    return g;
  }

  function buzz() {
    const g = baseBody("Buzz", 0xf1eee2, 0x73b62d);
    block(g, [0.48,0.58,0.12], [0,2.38,0.43], mat(0x75b9d1));
    block(g, [0.74,0.10,0.12], [0,1.70,0.42], mat(0x7a4ac3));
    block(g, [0.46,0.14,0.10], [0.96,1.55,0.42], mat(0x92ef22));
    [-1,1].forEach(function (side) {
      block(g, [0.10,1.18,0.54], [side*0.72,2.10,-0.18], mat(0xe7e7e2));
    });
    const laser = block(g, [0.18,0.18,0.50], [0.82,1.55,0.52], new THREE.MeshBasicMaterial({color:0x69ff79}));
    g.userData.special = "helmet";
    g.userData.skillName = "Alas y láser";
    g.userData.parts.weapon = laser;
    return g;
  }

  function woody() {
    const g = baseBody("Woody", 0xead9a7, 0x8bd3e6);
    block(g, [0.90,0.68,0.18], [0,1.70,0.40], mat(0x4c3324));
    block(g, [0.34,0.10,0.12], [0,2.36,0.43], mat(0xf0c36b));
    block(g, [0.95,0.12,0.95], [0,3.15,0], mat(0xd69a42));
    block(g, [0.58,0.44,0.58], [0,3.02,0], mat(0xd69a42));
    const star = block(g, [0.22,0.22,0.06], [0.46,1.72,0.51], mat(0xe6c84c));
    g.userData.special = "lasso";
    g.userData.skillName = "Cuerda del Sheriff";
    g.userData.parts.weapon = star;
    return g;
  }

  function alien() {
    const g = baseBody("Alien", 0x70d06b, 0x4e79b8);
    block(g, [0.78,0.12,0.74], [0,2.98,0], mat(0x55a7d7));
    [-0.28,0,0.28].forEach(function (x) {
      sphere(g, 0.075, [x,2.72,0.43], new THREE.MeshBasicMaterial({color:0x2ce5ff}));
    });
    const claw = block(g, [0.10,0.58,0.10], [0.86,1.12,0.30], mat(0x77ffaf));
    g.userData.special = "claw";
    g.userData.skillName = "La Garra";
    g.userData.parts.weapon = claw;
    return g;
  }

  function jessie() {
    const g = baseBody("Jessie", 0xf1e4a3, 0x4f2a1e);
    block(g, [0.96,0.12,0.96], [0,3.12,0], mat(0xbf2525));
    block(g, [0.58,0.42,0.58], [0,3.00,0], mat(0xd59b54));
    block(g, [0.55,0.10,0.10], [0,1.75,0.43], mat(0xe7dfb4));
    [-0.25,0.25].forEach(function (x) {
      block(g, [0.12,0.74,0.12], [x,3.18,0.12], mat(0xa52c20));
    });
    g.userData.special = "speed";
    g.userData.skillName = "Velocidad vaquera";
    return g;
  }

  function bullseye() {
    const g = new THREE.Group();
    g.name = "Bullseye";
    g.userData.parts = {};
    block(g, [1.45,0.70,0.58], [0,1.15,0], mat(0x8a5a35));
    block(g, [0.58,0.62,0.62], [0.78,1.68,0], mat(0x6f472a));
    [-0.50,0.50].forEach(function (x) {
      g.userData.parts.leftLeg = block(g, [0.24,0.82,0.24], [x,0.42,-0.18], mat(0x9a744d));
      g.userData.parts.rightLeg = block(g, [0.24,0.82,0.24], [x,0.42,0.18], mat(0x9a744d));
    });
    block(g, [0.76,0.12,0.72], [0,1.62,0], mat(0x263b70));
    g.userData.special = "charge";
    g.userData.skillName = "Embestida";
    g.scale.setScalar(0.72);
    return g;
  }

  const factories = {freddy, buzz, woody, alien, jessie, bullseye,
    bonnie:function(){const g=baseBody("Bonnie",0x6658a4,0x4d407d);block(g,[0.18,1.18,0.18],[0.30,3.40,0],mat(0x6658a4));block(g,[0.18,1.18,0.18],[-0.30,3.40,0],mat(0x6658a4));block(g,[0.44,0.12,0.14],[0,1.92,0.40],mat(0xd34a4a));g.userData.special="guitar";return g;},
    chica:function(){const g=baseBody("Chica",0xf2c94c,0xe49a32);block(g,[0.74,0.58,0.08],[0,1.58,0.40],mat(0xfff5dc));g.userData.special="cupcake";return g;},
    foxy:function(){const g=baseBody("Foxy",0xa83232,0x70201f);block(g,[0.32,0.32,0.32],[0.40,2.74,0.42],mat(0x171717));g.userData.special="hook";return g;}
  };

  global.CharacterFactory = {
    create: function (name) {
      const factory = factories[name] || freddy;
      return factory();
    },
    names: Object.keys(factories)
  };
})(window);
