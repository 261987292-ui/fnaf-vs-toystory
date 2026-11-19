(function () {
  "use strict";

  const canvas = document.getElementById("arena");
  const notice = document.getElementById("notice");
  const healthNode = document.getElementById("health");
  const shieldNode = document.getElementById("shield");
  const weaponNode = document.getElementById("weapon-name");
  const ammoNode = document.getElementById("ammo");
  const missionNode = document.getElementById("mission");
  const missionText = document.getElementById("mission-text");
  const enemyAlert = document.getElementById("enemy-alert");
  const radar = document.getElementById("radar");
  const rctx = radar.getContext("2d");

  const TILE = 3.2;
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  const walls = [];
  const enemies = [];
  const projectiles = [];
  const particles = [];
  const fuseBoxes = [];
  const capsules = [];
  const remotePlayers = new Map();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10131f);
  scene.fog = new THREE.FogExp2(0x10131f, 0.006);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 120);
  const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = false;
  scene.add(new THREE.AmbientLight(0xe9efff, 0.48));
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x24243a, 0.38));

  const player = {
    id: "local-" + Math.random().toString(36).slice(2,8),
    x: TILE,
    z: TILE,
    y: 1.65,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    radius: 0.58,
    health: 100,
    shield: 100,
    stamina: 100,
    verticalVelocity: 0,
    grounded: true,
    character: "freddy",
    team: "fnaf",
    ammo: 24,
    reserve: 72,
    kills: 0
  };

  function canOccupy(x, z, radius) {
    if (x < TILE * 0.5 || z < TILE * 0.5 || x > (map[0].length - 1.5) * TILE ||
        z > (map.length - 1.5) * TILE) return false;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const cx = Math.max(w.x - w.half, Math.min(x, w.x + w.half));
      const cz = Math.max(w.z - w.half, Math.min(z, w.z + w.half));
      if (Math.hypot(x-cx, z-cz) < radius) return false;
    }
    return true;
  }

  function makeCanvasTexture(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
  }

  const floorTexture = makeCanvasTexture(128,128,function(ctx,w,h) {
    ctx.fillStyle="#3a251c";
    ctx.fillRect(0,0,w,h);
    const s=w/8;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      ctx.fillStyle=(x+y)%2?"#d4b58b":"#2c2c32";
      ctx.fillRect(x*s,y*s,s,s);
    }
  });
  floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;
  floorTexture.repeat.set(12,12);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(map[0].length*TILE,map.length*TILE),
    new THREE.MeshStandardMaterial({map:floorTexture,roughness:0.82})
  );
  floor.rotation.x=-Math.PI/2;
  floor.position.set((map[0].length-1)*TILE/2,0,(map.length-1)*TILE/2);
  scene.add(floor);

  const wallTexture = makeCanvasTexture(128,128,function(ctx,w,h){
    ctx.fillStyle="#8d4e4e";ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#e6cfa8";
    for(let y=0;y<h;y+=32){ctx.fillRect(0,y,w,16);ctx.fillStyle="#8d4e4e";ctx.fillRect(0,y+16,w,16);ctx.fillStyle="#e6cfa8";}
  });
  const wallMat = new THREE.MeshStandardMaterial({map:wallTexture,roughness:0.78});
  for(let r=0;r<map.length;r++){
    for(let c=0;c<map[r].length;c++){
      if(map[r][c]===1){
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(TILE,3.2,TILE),wallMat);
        mesh.position.set(c*TILE,1.6,r*TILE);
        scene.add(mesh);
        walls.push({x:c*TILE,z:r*TILE,half:TILE/2,height:3.2,mesh:mesh});
      }
    }
  }

  function addLight(x,z,color,intensity){
    const fixture=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:color}));
    fixture.position.set(x,3.04,z);scene.add(fixture);
    const light=new THREE.PointLight(color,intensity,8.5,2);
    light.position.set(x,3,z);scene.add(light);
  }
  [[2,2],[5,2],[8,2],[11,2],[2,5],[6,5],[10,5],[2,8],[5,8],[8,8],[11,8],[6,10]].forEach(function(p){addLight(p[0]*TILE,p[1]*TILE,0xffd19a,.65);});
  scene.add(new THREE.PointLight(0x73baff,.95,14,2)).position.set(6*TILE,4,6*TILE);

  function addStage(){
    const stage=new THREE.Mesh(new THREE.BoxGeometry(5.2,.35,2.2),new THREE.MeshStandardMaterial({color:0x8b1d1d,roughness:.55}));
    stage.position.set(6*TILE,.18,5*TILE);scene.add(stage);
    for(let i=-1;i<=1;i++){
      const curtain=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.8,.18),new THREE.MeshStandardMaterial({color:i===0?0x6a1515:0x3c1010,roughness:.8}));
      curtain.position.set((6+i*1.7)*TILE,1.58,4.05*TILE);scene.add(curtain);
    }
  }
  addStage();

  function addFuse(x,z){
    const group=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(.74,.95,.30),new THREE.MeshStandardMaterial({color:0x26364a,emissive:0x102030}));
    box.position.y=.65;group.add(box);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:0x69e4ff}));
    lamp.position.set(0,1.02,.17);lamp.name="fuseLamp";group.add(lamp);
    group.position.set(x,0,z);scene.add(group);
    fuseBoxes.push({group:group,active:true,health:3});
  }
  addFuse(3*TILE,6*TILE);addFuse(9*TILE,3*TILE);addFuse(10*TILE,9*TILE);

  function addTrap(x,z){
    const group=new THREE.Group();
    const mat=new THREE.MeshBasicMaterial({color:0x4eeaff,transparent:true,opacity:.52,wireframe:true});
    for(let i=-1;i<=1;i++){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.06,1.7,2.4),mat);
      rail.position.set(i*.32,.85,0);group.add(rail);
    }
    group.position.set(x,0,z);scene.add(group);
    return {group:group,active:true,cooldown:0};
  }
  const traps=[addTrap(5*TILE,6*TILE),addTrap(8*TILE,8*TILE)];

  function addCapsule(x,z){
    const group=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.55,4,8),new THREE.MeshStandardMaterial({color:0x65a9ff,emissive:0x173466,roughness:.35}));
    body.position.y=.85;group.add(body);
    const light=new THREE.PointLight(0x69e4ff,.9,4);light.position.y=.9;group.add(light);
    group.position.set(x,0,z);scene.add(group);capsules.push({group:group,active:true});
  }
  addCapsule(2*TILE,9*TILE);addCapsule(11*TILE,6*TILE);addCapsule(6*TILE,9*TILE);addCapsule(11*TILE,10*TILE);

  let selectedCharacter="freddy";
  let model=CharacterFactory.create(selectedCharacter);
  model.position.set(player.x,0,player.z);
  scene.add(model);

  function spawnEnemies(){
    const data=[
      ["freddy",7*TILE,3*TILE],["bonnie",3*TILE,8*TILE],["chica",10*TILE,7*TILE],
      ["foxy",11*TILE,2*TILE],["alien",2*TILE,10*TILE]
    ];
    data.forEach(function(d){
      const g=CharacterFactory.create(d[0]);
      g.position.set(d[1],0,d[2]);
      g.scale.multiplyScalar(d[0]==="freddy"?1.2:1);
      scene.add(g);
      enemies.push({name:d[0],x:d[1],z:d[2],targetX:d[1],targetZ:d[2],group:g,health:d[0]==="freddy"?180:85});
    });
  }
  spawnEnemies();

  const weapons=[
    {id:"melee",name:"PUÑETAZO",ammo:null,cooldown:.38},
    {id:"blaster",name:"BLÁSTER",ammo:24,cooldown:.18},
    {id:"rifle",name:"RÁFAGA",ammo:60,cooldown:.08},
    {id:"rpg",name:"RPG",ammo:3,cooldown:1.1}
  ];
  let weaponIndex=0,weaponCooldown=0,canShoot=true,ammo=24,magazine=24,reserve=72;
  let xrayEnergy=100,xrayActive=false,xrayTimer=0;
  let mission=1,fuseDestroyed=0,capsuleTaken=0,finalKills=0;
  let isGameOver=false;
  let audioContext=null,wallOsc=null,wallGain=null;

  function initAudio(){
    if(audioContext)return;
    audioContext=new (window.AudioContext||window.webkitAudioContext)();
  }
  function shotTone(){
    initAudio();if(!audioContext)return;
    const o=audioContext.createOscillator(),g=audioContext.createGain();
    o.type="sawtooth";o.frequency.setValueAtTime(180,audioContext.currentTime);
    o.frequency.exponentialRampToValueAtTime(55,audioContext.currentTime+.09);
    g.gain.setValueAtTime(.18,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.1);
    o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.1);
  }
  function wallTone(){
    initAudio();if(!audioContext||wallOsc)return;
    wallOsc=audioContext.createOscillator();wallGain=audioContext.createGain();
    wallOsc.type="square";wallOsc.frequency.value=55;
    wallGain.gain.value=.025;wallOsc.connect(wallGain);wallGain.connect(audioContext.destination);wallOsc.start();
  }
  function stopWallTone(){
    if(wallOsc){wallOsc.stop();wallOsc=null;wallGain=null;}
  }
  function noticeText(text){
    notice.textContent=text;notice.classList.add("visible");
    clearTimeout(noticeText.timer);noticeText.timer=setTimeout(function(){notice.classList.remove("visible");},2200);
  }

  const controls=Object.create(null),keys=Object.create(null);
  let controlMode=localStorage.getItem("fnaf-vs-toystory-control")||"joystick";
  let joystickVector={x:0,y:0},joystickPointer=null;
  const controlToggle=document.getElementById("control-toggle");
  const joystickBase=document.getElementById("joystick-base");
  const joystickStick=document.getElementById("joystick-stick");
  const dpad=document.getElementById("dpad");

  function applyControlMode(){
    const joy=controlMode==="joystick";
    joystickBase.style.display=joy?"block":"none";
    dpad.classList.toggle("visible",!joy);
    controlToggle.textContent=joy?"CONTROL: JOYSTICK":"CONTROL: FLECHAS";
    localStorage.setItem("fnaf-vs-toystory-control",controlMode);
  }
  controlToggle.addEventListener("pointerdown",function(e){e.preventDefault();});
  controlToggle.addEventListener("click",function(){controlMode=controlMode==="joystick"?"arrows":"joystick";applyControlMode();});
  applyControlMode();

  function updateJoystick(e){
    const rect=joystickBase.getBoundingClientRect();
    let dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);
    const max=44,d=Math.hypot(dx,dy);
    if(d>max){dx=dx/d*max;dy=dy/d*max;}
    joystickVector.x=dx/max;joystickVector.y=dy/max;
    joystickStick.style.transform="translate("+dx+"px,"+dy+"px)";
  }
  joystickBase.addEventListener("pointerdown",function(e){initAudio();e.preventDefault();joystickPointer=e.pointerId;joystickBase.setPointerCapture&&joystickBase.setPointerCapture(e.pointerId);updateJoystick(e);});
  joystickBase.addEventListener("pointermove",function(e){if(joystickPointer===e.pointerId){e.preventDefault();updateJoystick(e);}});
  ["pointerup","pointercancel","pointerleave"].forEach(function(t){joystickBase.addEventListener(t,function(e){if(joystickPointer===e.pointerId){joystickPointer=null;joystickVector={x:0,y:0};joystickStick.style.transform="translate(0px,0px)";}});});

  document.querySelectorAll("[data-dir]").forEach(function(button){
    const dir=button.dataset.dir;
    button.addEventListener("pointerdown",function(e){e.preventDefault();button.setPointerCapture&&button.setPointerCapture(e.pointerId);controls[dir]=true;});
    ["pointerup","pointercancel","pointerleave"].forEach(function(t){button.addEventListener(t,function(){controls[dir]=false;});});
  });

  window.addEventListener("keydown",function(e){keys[e.code]=true;});
  window.addEventListener("keyup",function(e){keys[e.code]=false;});
  window.addEventListener("contextmenu",function(e){e.preventDefault();});

  let lookPointer=null,lastLook={x:0,y:0};
  canvas.addEventListener("pointerdown",function(e){
    const rect=document.querySelector(".move-pad").getBoundingClientRect();
    if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)return;
    if(e.clientX>innerWidth-210&&e.clientY>innerHeight-210)return;
    lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove",function(e){
    if(lookPointer!==e.pointerId)return;
    player.targetYaw+=(e.clientX-lastLook.x)*.004;
    player.pitch=THREE.MathUtils.clamp(player.pitch-(e.clientY-lastLook.y)*.003,-.65,.65);
    lastLook={x:e.clientX,y:e.clientY};
  });
  ["pointerup","pointercancel"].forEach(function(t){canvas.addEventListener(t,function(e){if(lookPointer===e.pointerId)lookPointer=null;});});

  function reload(){
    if(reserve<=0||ammo===24)return;
    const n=Math.min(24-ammo,reserve);ammo+=n;reserve-=n;
    ammoNode.textContent=ammo+"/"+reserve;noticeText("Cargador recargado");
  }
  function toggleWeapon(){
    weaponIndex=(weaponIndex+1)%weapons.length;
    weaponNode.textContent=weapons[weaponIndex].name;
    ammoNode.textContent=weapons[weaponIndex].ammo===null?"∞":ammo+"/"+reserve;
  }

  document.getElementById("weapon").addEventListener("pointerdown",function(e){e.preventDefault();toggleWeapon();});
  document.getElementById("reload").addEventListener("pointerdown",function(e){e.preventDefault();reload();});
  document.getElementById("xray").addEventListener("pointerdown",function(e){
    e.preventDefault();initAudio();
    if(xrayEnergy<25)return;
    xrayActive=!xrayActive;if(xrayActive)xrayTimer=6;
  });
  document.querySelector("#sprint").addEventListener("pointerdown",function(e){e.preventDefault();controls.sprint=true;});
  ["pointerup","pointercancel","pointerleave"].forEach(function(t){document.getElementById("sprint").addEventListener(t,function(){controls.sprint=false;});});
  document.querySelector("#jump").addEventListener("pointerdown",function(e){e.preventDefault();if(player.grounded){player.verticalVelocity=5.2;player.grounded=false;}});

  function createTracer(origin,direction,color){
    const geom=new THREE.BufferGeometry().setFromPoints([origin,origin.clone().add(direction.clone().multiplyScalar(18))]);
    const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:color}));
    scene.add(line);projectiles.push({line:line,life:.12});
  }
  function explode(position){
    for(let i=0;i<18;i++){
      const p=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.08),new THREE.MeshBasicMaterial({color:i%2?0xffb52d:0xff3218}));
      p.position.copy(position);scene.add(p);
      particles.push({mesh:p,vel:new THREE.Vector3((Math.random()-.5)*8,Math.random()*6,(Math.random()-.5)*8),life:.55});
    }
  }

  function fire(){
    if(!canShoot||weaponCooldown>0)return;
    const weapon=weapons[weaponIndex];
    if(weapon.id==="melee"){
      canShoot=false;setTimeout(function(){canShoot=true;},weapon.cooldown*1000);
      meleeAttack();return;
    }
    if(weapon.id==="rpg"&&ammo<=0)return;
    if(weapon.ammo!==null){if(ammo<=0){noticeText("Sin munición");reload();return;}ammo--;ammoNode.textContent=ammo+"/"+reserve;}
    weaponCooldown=weapon.cooldown;canShoot=false;setTimeout(function(){canShoot=true;},weapon.cooldown*1000);
    shotTone();
    const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize();
    const origin=camera.position.clone().add(dir.clone().multiplyScalar(.8));
    createTracer(origin,dir,weapon.id==="rpg"?0xff7733:0x69e4ff);
    const ray=new THREE.Raycaster(camera.position,dir,0,weapon.id==="rifle"?28:18);
    const targets=enemies.map(function(e){return e.group;});
    const fuseTargets=fuseBoxes.filter(function(f){return f.active;}).map(function(f){return f.group;});
    const fuseHits=ray.intersectObjects(fuseTargets,true);
    if(fuseHits.length){
      let fuse=null;
      for(let i=0;i<fuseBoxes.length;i++){
        if(fuseBoxes[i].group===fuseHits[0].object||fuseBoxes[i].group.children.indexOf(fuseHits[0].object)>=0||fuseHits[0].object.parent===fuseBoxes[i].group){fuse=fuseBoxes[i];break;}
      }
      if(fuse){
        fuse.health-=weapon.id==="rpg"?3:1;
        if(fuse.health<=0){fuse.active=false;fuse.group.visible=false;fuseDestroyed++;explode(fuseHits[0].point);noticeText("Caja eléctrica destruida "+fuseDestroyed+"/3");}
      }
    }
    const hits=ray.intersectObjects(targets,true);
    let damaged=false;
    if(hits.length){
      const hit=hits[0];
      let enemy=null;
      for(let i=0;i<enemies.length;i++)if(enemies[i].group===hit.object||enemies[i].group.children.indexOf(hit.object)>=0||hit.object.parent===enemies[i].group){enemy=enemies[i];break;}
      if(!enemy)for(let i=0;i<enemies.length;i++)if(hit.object.parent&&hit.object.parent.parent===enemies[i].group){enemy=enemies[i];break;}
      if(enemy){
        const damage=weapon.id==="rpg"?120:weapon.id==="rifle"?18:26;
        enemy.health-=damage;damaged=true;
        if(enemy.health<=0){scene.remove(enemy.group);enemies.splice(enemies.indexOf(enemy),1);player.kills++;explode(hit.point);}
      }
    }
    if(weapon.id==="rpg"){
      const pos=origin.clone().add(dir.clone().multiplyScalar(12));explode(pos);
      enemies.forEach(function(e){if(e.group.position.distanceTo(pos)<5){e.health-=90;if(e.health<=0){scene.remove(e.group);e.health=0;}}});
      enemies.splice(0,enemies.length,...enemies.filter(function(e){return e.health>0;}));
    }
  }
  function meleeAttack(){
    shotTone();
    enemies.forEach(function(e){
      const d=Math.hypot(e.x-player.x,e.z-player.z);
      if(d<2.1){e.health-=35;const dx=e.x-player.x,dz=e.z-player.z,l=Math.hypot(dx,dz)||1,nx=e.x+dx/l*1.4,nz=e.z+dz/l*1.4;if(canOccupy(nx,nz,.62)){e.x=nx;e.z=nz;}}
    });
  }
  document.getElementById("shoot").addEventListener("pointerdown",function(e){e.preventDefault();initAudio();fire();});
  document.querySelector('[data-action="reload"]').style.display="none";

  function updateRadar(){
    rctx.clearRect(0,0,150,150);
    rctx.strokeStyle="#69e4ff";rctx.globalAlpha=.45;rctx.beginPath();rctx.arc(75,75,68,0,Math.PI*2);rctx.stroke();
    rctx.fillStyle="#dfffff";rctx.beginPath();rctx.arc(75,75,3,0,Math.PI*2);rctx.fill();
    rctx.fillStyle="#ff5a5a";rctx.globalAlpha=1;
    enemies.forEach(function(e){
      const dx=(e.x-player.x)*2,dz=(e.z-player.z)*2;
      if(Math.abs(dx)<60&&Math.abs(dz)<60){rctx.beginPath();rctx.arc(75+dx,75+dz,3,0,Math.PI*2);rctx.fill();}
    });
  }

  function setMissionText(){
    if(mission===1)missionText.textContent="Sabotaje eléctrico "+fuseDestroyed+"/3";
    if(mission===2)missionText.textContent="Rescate Pizza Planeta "+capsuleTaken+"/4";
    if(mission===3)missionText.textContent="Duelo final - bajas "+finalKills;
  }

  function updateXray(dt){
    if(xrayActive){xrayTimer-=dt;if(xrayTimer<=0)xrayActive=false;}
    if(!xrayActive)xrayEnergy=Math.min(100,xrayEnergy+9*dt);
    walls.forEach(function(w){
      w.mesh.material.transparent=xrayActive;
      w.mesh.material.opacity=xrayActive?.22:1;
      w.mesh.material.depthWrite=!xrayActive;
    });
  }

  function updateEnemies(dt){
    enemies.forEach(function(e){
      const dist=Math.hypot(e.x-player.x,e.z-player.z);
      enemyAlert.textContent=dist<10?e.name.toUpperCase()+" EN CONTRA": "";
      if(dist<1.45)dist;
      if(dist>1.45){
        const dx=player.x-e.x,dz=player.z-e.z,l=Math.hypot(dx,dz)||1;
        const speed=(e.name==="foxy"?2.7:1.55)*dt;
        const nx=e.x+(dx/l)*speed,nz=e.z+(dz/l)*speed;
        if(canOccupy(nx,e.z,.58))e.x=nx;
        if(canOccupy(e.x,nz,.58))e.z=nz;
      }
      e.group.position.set(e.x,0,e.z);
      e.group.rotation.y=Math.atan2(player.x-e.x,player.z-e.z);
      const parts=e.group.userData.parts;
      if(parts){
        const swing=Math.sin(performance.now()*0.008)*.32;
        if(parts.leftArm)parts.leftArm.rotation.x=swing;
        if(parts.rightArm)parts.rightArm.rotation.x=-swing;
        if(parts.leftLeg)parts.leftLeg.rotation.x=-swing;
        if(parts.rightLeg)parts.rightLeg.rotation.x=swing;
        if(parts.eyes)parts.eyes.forEach(function(eye){eye.material.color.setHex(dist<8?0xff1717:eye.userData.normalColor||0x58d9ff);});
      }
      if(dist<1.1){
        player.shield=Math.max(0,player.shield-10*dt);
        if(player.shield<=0)player.health=Math.max(0,player.health-7*dt);
      }
    });
  }

  function updateTraps(dt){
    let near=false;
    traps.forEach(function(trap){
      if(trap.cooldown>0)trap.cooldown-=dt;
      if(!trap.active)return;
      trap.group.position.y=Math.sin(performance.now()*0.02)*.03;
      const dx=player.x-trap.group.position.x,dz=player.z-trap.group.position.z;
      if(Math.hypot(dx,dz)<1.05&&trap.cooldown<=0){
        near=true;trap.cooldown=.8;
        player.shield=Math.max(0,player.shield-12);
        if(player.shield<=0)player.health=Math.max(0,player.health-10);
        player.x-=Math.sign(dx||1)*.35;player.z-=Math.sign(dz||1)*.35;
      }
    });
    if(near)wallTone();else stopWallTone();
  }

  function updateMission(){
    fuseBoxes.forEach(function(f){
      if(!f.active)return;
      if(Math.hypot(player.x-f.group.position.x,player.z-f.group.position.z)<1.5){
        enemyAlert.textContent="Fusible cercano";
      }
    });
    capsules.forEach(function(c){
      if(!c.active)return;
      if(Math.hypot(player.x-c.group.position.x,player.z-c.group.position.z)<1.0){
        c.active=false;scene.remove(c.group);capsuleTaken++;noticeText("Cápsula recuperada");
      }
    });
    if(mission===1&&fuseDestroyed>=3){mission=2;noticeText("Misión 2: Rescate de La Garra");missionNode.textContent="2";}
    if(mission===2&&capsuleTaken>=4){mission=3;noticeText("Misión 3: Duelo final");missionNode.textContent="3";}
  }

  let selectedMode="mission";
  async function loadConfig(){
    const response=await fetch("/api/estado").catch(function(){return null;});
    if(response&&response.ok){} ;
  }
  async function syncPvp(){
    if(selectedMode!=="pvp")return;
    const payload={room:"arena-1",id:player.id,character:player.character,team:player.team,x:player.x,z:player.z,yaw:player.yaw,weapon:weapons[weaponIndex].name,kills:player.kills,health:player.health};
    try{
      const post=await fetch("/api/pvp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!post.ok)return;
      const data=await post.json();
      Object.keys(data.players||{}).forEach(function(id){
        if(id===player.id)return;
        const p=data.players[id];
        let remote=remotePlayers.get(id);
        if(!remote){remote=CharacterFactory.create(p.character||"buzz");scene.add(remote);remotePlayers.set(id,remote);}
        remote.position.set(p.x,0,p.z);
        remote.rotation.y=p.yaw||0;
      });
      remotePlayers.forEach(function(remote,id){if(!data.players[id]){scene.remove(remote);remotePlayers.delete(id);}});
    }catch(error){}
  }
  setInterval(syncPvp,1200);

  const clock=new THREE.Clock();
  let elapsed=0;
  function animate(){
    if(isGameOver)return;
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.08);elapsed+=dt;
    weaponCooldown=Math.max(0,weaponCooldown-dt);

    player.yaw += (player.targetYaw-player.yaw)*Math.min(1,12*dt);
    if(!player.grounded){
      player.verticalVelocity-=11*dt;player.y+=player.verticalVelocity*dt;
      if(player.y<=1.65){player.y=1.65;player.verticalVelocity=0;player.grounded=true;}
    }

    const forward=(keys.KeyW||keys.ArrowUp||controls.forward?1:0)-(keys.KeyS||keys.ArrowDown||controls.back?1:0);
    const lateral=(keys.KeyD||keys.ArrowRight||controls.right?1:0)-(keys.KeyA||keys.ArrowLeft||controls.left?1:0);
    let f=forward,l=lateral;
    if(controlMode==="joystick"){f=THREE.MathUtils.clamp(f-joystickVector.y,-1,1);l=THREE.MathUtils.clamp(l+joystickVector.x,-1,1);if(Math.abs(joystickVector.x)>.12)player.targetYaw-=joystickVector.x*.018;}
    const sprint=keys.ShiftLeft||keys.ShiftRight||controls.sprint;
    const moving=Math.abs(f)+Math.abs(l)>.08;
    if(sprint&&moving&&player.stamina>2)player.stamina=Math.max(0,player.stamina-28*dt);else player.stamina=Math.min(100,player.stamina+16*dt);
    const speed=(sprint&&player.stamina>2?6.2:3.9)*dt;
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
    const dx=(fx*f+rx*l)*speed,dz=(fz*f+rz*l)*speed;
    if(canOccupy(player.x+dx,player.z,player.radius))player.x+=dx;
    if(canOccupy(player.x,player.z+dz,player.radius))player.z+=dz;
    camera.position.set(player.x,player.y,player.z);
    camera.rotation.order="YXZ";camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;

    updateEnemies(dt);updateTraps(dt);updateMission();updateXray(dt);updateRadar();
    healthNode.textContent=Math.ceil(player.health);shieldNode.textContent=Math.ceil(player.shield);

    for(let i=projectiles.length-1;i>=0;i--){projectiles[i].life-=dt;if(projectiles[i].life<=0){scene.remove(projectiles[i].line);projectiles.splice(i,1);}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.vel.y-=9*dt;p.mesh.position.addScaledVector(p.vel,dt);p.life-=dt;if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}}

    xrayEnergy=xrayActive?Math.max(0,xrayEnergy-100/6*dt):Math.min(100,xrayEnergy+9*dt);
    setMissionText();
    renderer.render(scene,camera);
  }

  document.getElementById("start-button").addEventListener("click",function(){
    initAudio();
    const select=document.getElementById("character-select");
    selectedCharacter=select.value;
    player.character=selectedCharacter;
    player.team=["buzz","woody","alien","jessie","bullseye"].indexOf(selectedCharacter)>=0?"toy":"fnaf";
    selectedMode=document.getElementById("mode-select").value;
    scene.remove(model);model=CharacterFactory.create(selectedCharacter);model.position.set(player.x,0,player.z);scene.add(model);
    document.getElementById("start-screen").classList.add("hidden");
    noticeText(selectedMode==="pvp"?"Batalla PvP / Arena":"Misiones Historia");
    loadConfig();
  });

  window.addEventListener("resize",function(){
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  });

  animate();
})();
