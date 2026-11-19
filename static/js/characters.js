(function (global) {
  "use strict";

  global.createCapsuleMesh = function (radius, length, material) {
    var group = new THREE.Group();
    var cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 8, 4, false),
      material
    );
    var top = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
    var bottom = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
    top.position.y = length / 2;
    bottom.position.y = -length / 2;
    group.add(cylinder, top, bottom);
    return group;
  };

  if (!THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = function (radius, length, radialSegments) {
      return new THREE.CylinderGeometry(radius, radius, length, radialSegments || 8);
    };
  }

  function mat(color, roughness) {
    return new THREE.MeshStandardMaterial({color:color, roughness:roughness == null ? 0.65 : roughness, metalness:.04});
  }
  function block(parent,size,pos,material,cast) {
    var mesh=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),material);
    mesh.position.set(pos[0],pos[1],pos[2]);
    mesh.castShadow=cast !== false;
    parent.add(mesh);
    return mesh;
  }
  function sphere(parent,radius,pos,material) {
    var mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),material);
    mesh.position.set(pos[0],pos[1],pos[2]);
    mesh.castShadow=true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent,radiusTop,radiusBottom,height,pos,material) {
    var mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,10),material);
    mesh.position.set(pos[0],pos[1],pos[2]);
    mesh.castShadow=true;
    parent.add(mesh);
    return mesh;
  }
  function nameSprite(name) {
    var canvas=document.createElement("canvas");
    canvas.width=256;canvas.height=64;
    var ctx=canvas.getContext("2d");
    ctx.fillStyle="rgba(10,10,16,.78)";
    ctx.fillRect(4,8,248,48);
    ctx.strokeStyle="#eab866";ctx.strokeRect(5,9,246,46);
    ctx.fillStyle="#fff4dc";ctx.font="bold 26px monospace";ctx.textAlign="center";
    ctx.fillText(name,128,42);
    var texture=new THREE.CanvasTexture(canvas);
    var sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
    sprite.scale.set(1.8,.45,1);sprite.position.y=3.05;
    return sprite;
  }

  function humanoid(name,bodyColor,accentColor) {
    var g=new THREE.Group();g.name=name;
    g.userData.parts={};
    g.userData.parts.leftLeg=block(g,[.38,.82,.42],[-.32,.41,0],mat(accentColor));
    g.userData.parts.rightLeg=block(g,[.38,.82,.42],[.32,.41,0],mat(accentColor));
    block(g,[.42,.18,.48],[-.32,.06,.04],mat(0x17130f));
    block(g,[.42,.18,.48],[.32,.06,.04],mat(0x17130f));
    g.userData.parts.leftArm=block(g,[.30,1.05,.32],[-.74,1.42,0],mat(accentColor));
    g.userData.parts.rightArm=block(g,[.30,1.05,.32],[.74,1.42,0],mat(accentColor));
    block(g,[1.08,1.18,.68],[0,1.42,0],mat(bodyColor));
    var head=new THREE.Group();head.position.set(0,2.18,0);g.add(head);g.userData.parts.head=head;
    sphere(head,.48,[0,0,0],mat(bodyColor));
    [-.18,.18].forEach(function(x){var eye=sphere(head,.075,[x,.08,.43],new THREE.MeshBasicMaterial({color:0x4ddcff}));eye.userData.pupil=true;});
    g.userData.parts.eyes=head.children.filter(function(c){return c.userData.pupil;});
    g.userData.parts.jaw=block(head,[.62,.18,.22],[0,-.30,.34],mat(0xb98a63));
    g.add(nameSprite(name));
    g.userData.name=name;
    return g;
  }

  function freddy(){
    var g=humanoid("Freddy",0x65412a,0x38241b);
    g.userData.parts.head.scale.set(1.08,1.02,1);
    sphere(g.userData.parts.head,.16,[0,-.12,.50],mat(0xd9ad82));
    sphere(g.userData.parts.head,.09,[0,-.02,.64],mat(0x090909));
    [-.42,.42].forEach(function(x){sphere(g.userData.parts.head,.16,[x,.43,0],mat(0x65412a));});
    cylinder(g,.38,.38,.12,[0,.58,0],mat(0x151515));
    cylinder(g,.25,.25,.42,[0,.79,0],mat(0x151515));
    block(g,[.42,.11,.12],[0,1.92,.38],mat(0x111111));
    block(g.userData.parts.rightArm,[.10,.62,.10],[.10,-.12,.38],mat(0xaab8c1,.25));
    g.userData.special="toreador";g.userData.skillName="Marcha del Toreador";
    return g;
  }

  function buzz(){
    var g=humanoid("Buzz",0xecebe3,0x78ba35);
    block(g,[.62,.48,.14],[0,1.72,.36],mat(0x73b9d1));
    block(g,[.78,.10,.12],[0,1.38,.38],mat(0x6a3baa));
    [-.76,.76].forEach(function(x){
      var wing=block(g,[.12,1.05,.62],[x,1.82,-.28],mat(0xeeeae0));wing.rotation.z=x>0?-0.20:.20;
    });
    var helmet=sphere(g,.62,[0,2.18,.02],new THREE.MeshBasicMaterial({color:0x80aaff,transparent:true,opacity:.32,side:THREE.DoubleSide}));
    helmet.scale.z=.72;
    block(g.userData.parts.rightArm,[.22,.22,.52],[0,-.10,.38],new THREE.MeshBasicMaterial({color:0xff3148}));
    g.userData.special="helmet";g.userData.skillName="Alas y láser";
    return g;
  }

  function woody(){
    var g=humanoid("Woody",0xe7cf85,0x69acd0);
    block(g,[1.02,.12,1.02],[0,2.76,0],mat(0xc88b3d));
    cylinder(g,.48,.48,.38,[0,2.94,0],mat(0xc88b3d));
    block(g,[1.12,.52,.08],[0,1.45,.38],mat(0x50382c));
    block(g,[.28,.28,.10],[.48,1.48,.44],mat(0xe0b94c));
    block(g,[.58,.10,.12],[0,1.88,.40],mat(0xc83232));
    g.userData.special="lasso";g.userData.skillName="Cuerda del Sheriff";
    return g;
  }

  function alien(){
    var g=humanoid("Alien",0x69d66a,0x3f77ba);
    var head=g.userData.parts.head;
    [-.30,0,.30].forEach(function(x){sphere(head,.09,[x,.10,.44],new THREE.MeshBasicMaterial({color:0x7cfaff}));});
    cylinder(g,.045,.045,.58,[0,2.93,0],mat(0x69d66a));
    sphere(g,.09,[0,3.22,0],new THREE.MeshBasicMaterial({color:0x69d66a}));
    block(g,[.70,.12,.12],[0,1.48,.38],mat(0x6aabef));
    cylinder(g,.18,.18,.08,[0,1.70,.42],mat(0xf1c52f));
    g.userData.special="claw";g.userData.skillName="La Garra";
    return g;
  }

  function jessie(){
    var g=humanoid("Jessie",0xf1df9a,0x4b2c25);
    block(g,[1.02,.12,1.02],[0,2.72,0],mat(0xc52b27));
    cylinder(g,.48,.48,.36,[0,2.90,0],mat(0xd49a57));
    block(g,[.60,.52,.12],[0,1.55,.38],mat(0xf3eee0));
    block(g,[.20,.86,.12],[-.52,1.20,.38],mat(0x3b54b4));
    block(g,[.20,.86,.12],[.52,1.20,.38],mat(0x3b54b4));
    cylinder(g,.055,.055,1.05,[.46,2.10,-.38],mat(0xb52f25));
    g.userData.special="speed";g.userData.skillName="Velocidad vaquera";
    return g;
  }

  function bullseye(){
    var g=new THREE.Group();g.name="Bullseye";g.userData.parts={};
    block(g,[1.45,.74,.58],[0,1.08,0],mat(0x94623c));
    block(g,[.62,.56,.60],[.82,1.58,0],mat(0x7a4d2f));
    sphere(g,.38,[1.02,1.86,0],mat(0x94623c));
    sphere(g,.12,[1.18,1.90,.33],mat(0x29180f));
    [-.50,.50].forEach(function(x){
      [-.22,.22].forEach(function(z){
        var leg=block(g,[.24,.82,.24],[x,.41,z],mat(0x7a4d2f));if(z<0)g.userData.parts.leftLeg=leg;else g.userData.parts.rightLeg=leg;
        block(g,[.28,.16,.30],[x,.06,z],mat(0x151515));
      });
    });
    block(g,[.78,.12,.76],[0,1.48,0],mat(0x6e3b25));
    g.userData.parts.head=g.children[2];
    g.userData.parts.eyes=[];
    g.add(nameSprite("Bullseye"));
    g.userData.special="charge";g.userData.skillName="Embestida";
    g.scale.setScalar(.92);
    return g;
  }

  var factories={
    freddy:freddy,buzz:buzz,woody:woody,alien:alien,jessie:jessie,bullseye:bullseye,
    bonnie:function(){var g=humanoid("Bonnie",0x6658a4,0x4d407d);[-.27,.27].forEach(function(x){cylinder(g,.10,.10,.95,[x,2.85,0],mat(0x6658a4));});g.userData.special="guitar";return g;},
    chica:function(){var g=humanoid("Chica",0xf2c94c,0xe49a32);block(g,[.74,.58,.08],[0,1.58,.38],mat(0xfff5dc));g.userData.special="cupcake";return g;},
    foxy:function(){var g=humanoid("Foxy",0xa83232,0x70201f);sphere(g,.30,[.38,2.70,.42],mat(0x171717));g.userData.special="hook";return g;}
  };

  global.CharacterFactory={
    create:function(name){var factory=factories[name]||freddy;var model=factory();model.userData.animate=function(time){
      var p=model.userData.parts;if(!p)return;
      var swing=Math.sin(time*8)*.28;
      if(p.leftArm)p.leftArm.rotation.x=swing;
      if(p.rightArm)p.rightArm.rotation.x=-swing;
      if(p.leftLeg)p.leftLeg.rotation.x=-swing;
      if(p.rightLeg)p.rightLeg.rotation.x=swing;
      if(p.head)p.head.rotation.y=Math.sin(time*1.3)*.12;
    };return model;},
    names:Object.keys(factories)
  };
  global.createCharacterMesh=global.CharacterFactory.create;
})(window);
