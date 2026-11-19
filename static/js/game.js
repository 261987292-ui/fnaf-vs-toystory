(function () {
  "use strict";

  window.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  var canvas = document.getElementById("arena");
  var menuStatus = document.getElementById("menu-status");
  var startButton = document.getElementById("start-button");
  var startScreen = document.getElementById("start-screen");
  var notice = document.getElementById("notice");

  function setMenuStatus(message) {
    if (menuStatus) menuStatus.textContent = message;
  }

  window.onerror = function (message, source, line) {
    setMenuStatus("Error: " + message + " (" + line + ")");
  };

  var scene, camera, renderer, clock;
  var initialized = false;
  var started = false;
  var rctx = document.getElementById("radar").getContext("2d");
  var TILE = 3.2;
  var map = [
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
  var walls = [], enemies = [], fuseBoxes = [], capsules = [], projectiles = [];
  var remotePlayers = new Map();
  var selectedCharacter = "freddy";
  var selectedMode = "mission";
  var localModel = null;
  var controlMode = localStorage.getItem("fnaf-control") || "joystick";
  var joystickVector = {x:0,y:0};
  var player = {
    id:"local-"+Math.random().toString(36).slice(2,8),
    x:TILE,z:TILE,y:1.65,yaw:0,pitch:0,targetYaw:0,radius:.58,
    health:100,shield:100,stamina:100,verticalVelocity:0,grounded:true,
    character:"freddy",team:"fnaf",kills:0
  };
  var keys = Object.create(null), controls = Object.create(null);
  var weaponIndex = 0, magazine = 24, reserve = 72;
  var weaponCooldown = 0, canShoot = true;
  var xrayActive = false, xrayEnergy = 100;
  var mission = 1, destroyedFuses = 0, rescuedCapsules = 0;
  var audioContext = null;
  var flashlightOn = true;

  var weapons = [
    {id:"melee",name:"PUÑETAZO",ammo:null,cooldown:.38},
    {id:"blaster",name:"BLÁSTER",ammo:24,cooldown:.18},
    {id:"rifle",name:"RÁFAGA",ammo:60,cooldown:.08},
    {id:"rpg",name:"RPG",ammo:3,cooldown:1.1}
  ];

  function showNotice(text) {
    notice.textContent = text;
    notice.classList.add("visible");
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(function(){notice.classList.remove("visible");},2200);
  }

  function initAudio() {
    if (!audioContext) {
      var Context = window.AudioContext || window.webkitAudioContext;
      if (Context) audioContext = new Context();
    }
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
  }

  function shotTone() {
    initAudio();
    if (!audioContext) return;
    var osc=audioContext.createOscillator(),gain=audioContext.createGain();
    osc.type="square";osc.frequency.setValueAtTime(150,audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55,audioContext.currentTime+.08);
    gain.gain.setValueAtTime(.12,audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.09);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.1);
  }

  function canOccupy(x,z,radius) {
    if (x < TILE*.5 || z < TILE*.5 || x > (map[0].length-1.5)*TILE || z > (map.length-1.5)*TILE) return false;
    for (var i=0;i<walls.length;i++) {
      var w=walls[i];
      var cx=Math.max(w.x-w.half,Math.min(x,w.x+w.half));
      var cz=Math.max(w.z-w.half,Math.min(z,w.z+w.half));
      if (Math.hypot(x-cx,z-cz)<radius) return false;
    }
    return true;
  }

  function createTexture(painter) {
    var c=document.createElement("canvas");c.width=c.height=128;
    painter(c.getContext("2d"),128);
    var texture=new THREE.CanvasTexture(c);
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    return texture;
  }

  function createScene() {
    try {
      scene=new THREE.Scene();
      scene.background=new THREE.Color(0x10131f);
      scene.fog=new THREE.FogExp2(0x10131f,.006);
      camera=new THREE.PerspectiveCamera(68,window.innerWidth/window.innerHeight,.05,120);
      try {
        renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"high-performance"});
      } catch (highError) {
        renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:false,powerPreference:"low-power"});
        setMenuStatus("Modo ligero WebGL activado");
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
      renderer.setSize(window.innerWidth,window.innerHeight);
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=.95;
      renderer.shadowMap.enabled=false;
      clock=new THREE.Clock();

      scene.add(new THREE.AmbientLight(0xe9efff,.48));
      scene.add(new THREE.HemisphereLight(0xffeedd,0x24243a,.38));

      var floorTexture=createTexture(function(ctx,s){
        ctx.fillStyle="#3a251c";ctx.fillRect(0,0,s,s);
        var cell=s/8;
        for(var y=0;y<8;y++)for(var x=0;x<8;x++){
          ctx.fillStyle=(x+y)%2?"#d4b58b":"#2c2c32";ctx.fillRect(x*cell,y*cell,cell,cell);
        }
      });
      floorTexture.repeat.set(12,12);
      var floor=new THREE.Mesh(new THREE.PlaneGeometry(map[0].length*TILE,map.length*TILE),
        new THREE.MeshStandardMaterial({map:floorTexture,roughness:.82}));
      floor.rotation.x=-Math.PI/2;
      floor.position.set((map[0].length-1)*TILE/2,0,(map.length-1)*TILE/2);
      scene.add(floor);

      var wallTexture=createTexture(function(ctx,s){
        ctx.fillStyle="#8d4e4e";ctx.fillRect(0,0,s,s);
        ctx.fillStyle="#e6cfa8";
        for(var y=0;y<s;y+=32){ctx.fillRect(0,y,s,16);ctx.fillStyle="#8d4e4e";ctx.fillRect(0,y+16,s,16);ctx.fillStyle="#e6cfa8";}
      });
      var wallMaterial=new THREE.MeshStandardMaterial({map:wallTexture,roughness:.78});
      for(var r=0;r<map.length;r++){
        for(var c=0;c<map[r].length;c++){
          if(map[r][c]===1){
            var wall=new THREE.Mesh(new THREE.BoxGeometry(TILE,3.2,TILE),wallMaterial);
            wall.position.set(c*TILE,1.6,r*TILE);scene.add(wall);
            walls.push({x:c*TILE,z:r*TILE,half:TILE/2,mesh:wall});
          }
        }
      }

      [[2,2],[5,2],[8,2],[11,2],[2,5],[6,5],[10,5],[2,8],[5,8],[8,8],[11,8],[6,10]].forEach(function(p){
        var fixture=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshBasicMaterial({color:0xffd19a}));
        fixture.position.set(p[0]*TILE,3.04,p[1]*TILE);scene.add(fixture);
        var light=new THREE.PointLight(0xffd19a,.65,8.5,2);
        light.position.set(p[0]*TILE,3,p[1]*TILE);scene.add(light);
      });

      var stage=new THREE.Mesh(new THREE.BoxGeometry(5.2,.35,2.2),new THREE.MeshStandardMaterial({color:0x8b1d1d,roughness:.55}));
      stage.position.set(6*TILE,.18,5*TILE);scene.add(stage);

      function addFuse(x,z){
        var group=new THREE.Group();
        var box=new THREE.Mesh(new THREE.BoxGeometry(.74,.95,.30),new THREE.MeshStandardMaterial({color:0x26364a,emissive:0x102030}));
        box.position.y=.65;group.add(box);
        var lamp=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:0x69e4ff}));
        lamp.position.set(0,1.02,.17);lamp.name="fuseLamp";group.add(lamp);
        group.position.set(x,0,z);scene.add(group);fuseBoxes.push({group:group,health:3,active:true});
      }
      addFuse(3*TILE,6*TILE);addFuse(9*TILE,3*TILE);addFuse(10*TILE,9*TILE);

      function addCapsule(x,z){
        var group=new THREE.Group();
        var body=createCapsuleMesh(.38,.55,new THREE.MeshStandardMaterial({color:0x65a9ff,emissive:0x173466,roughness:.35}));
        body.position.y=.85;group.add(body);
        var light=new THREE.PointLight(0x69e4ff,.9,4);light.position.y=.9;group.add(light);
        group.position.set(x,0,z);scene.add(group);capsules.push({group:group,active:true});
      }
      addCapsule(2*TILE,9*TILE);addCapsule(11*TILE,6*TILE);addCapsule(6*TILE,9*TILE);addCapsule(11*TILE,10*TILE);

      var spawnNames=[["freddy",7*TILE,3*TILE],["bonnie",3*TILE,8*TILE],["chica",10*TILE,7*TILE],["foxy",11*TILE,2*TILE],["buzz",2*TILE,10*TILE]];
      for(var e=0;e<spawnNames.length;e++){
        var data=spawnNames[e],group;
        if(window.CharacterFactory) group=CharacterFactory.create(data[0]); else continue;
        group.position.set(data[1],0,data[2]);group.scale.multiplyScalar(1);
        scene.add(group);enemies.push({name:data[0],x:data[1],z:data[2],targetX:data[1],targetZ:data[2],group:group,health:100});
      }

      localModel=CharacterFactory.create(selectedCharacter);
      localModel.position.set(player.x,0,player.z);scene.add(localModel);
      initialized=true;
      setMenuStatus("Motor 3D listo");
      return true;
    } catch (error) {
      setMenuStatus("No se pudo iniciar WebGL: "+error.message);
      return false;
    }
  }

  function setupControls() {
    var controlToggle=document.getElementById("control-toggle");
    var joystickBase=document.getElementById("joystick-base");
    var joystickStick=document.getElementById("joystick-stick");
    var dpad=document.getElementById("dpad");

    function applyMode(){
      var joy=controlMode==="joystick";
      joystickBase.style.display=joy?"block":"none";
      dpad.classList.toggle("visible",!joy);
      controlToggle.textContent=joy?"CONTROL: JOYSTICK":"CONTROL: FLECHAS";
      localStorage.setItem("fnaf-control",controlMode);
    }
    controlToggle.addEventListener("click",function(){controlMode=controlMode==="joystick"?"arrows":"joystick";applyMode();});
    applyMode();

    var joyPointer=null;
    function updateJoystick(event){
      var rect=joystickBase.getBoundingClientRect();
      var dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2),max=44,d=Math.hypot(dx,dy);
      if(d>max){dx=dx/d*max;dy=dy/d*max;}
      joystickVector.x=dx/max;joystickVector.y=dy/max;
      joystickStick.style.transform="translate("+dx+"px,"+dy+"px)";
    }
    joystickBase.addEventListener("pointerdown",function(event){initAudio();event.preventDefault();joyPointer=event.pointerId;joystickBase.setPointerCapture&&joystickBase.setPointerCapture(event.pointerId);updateJoystick(event);});
    joystickBase.addEventListener("pointermove",function(event){if(joyPointer===event.pointerId){event.preventDefault();updateJoystick(event);}});
    ["pointerup","pointercancel","pointerleave"].forEach(function(type){
      joystickBase.addEventListener(type,function(event){if(joyPointer!==event.pointerId)return;joyPointer=null;joystickVector={x:0,y:0};joystickStick.style.transform="translate(0,0)";});
    });

    document.querySelectorAll("[data-dir]").forEach(function(button){
      var dir=button.dataset.dir;
      function release(){controls[dir]=false;button.classList.remove("active");}
      button.addEventListener("pointerdown",function(event){initAudio();event.preventDefault();controls[dir]=true;button.classList.add("active");});
      ["pointerup","pointercancel","pointerleave"].forEach(function(type){button.addEventListener(type,release);});
    });

    window.addEventListener("keydown",function(event){keys[event.code]=true;});
    window.addEventListener("keyup",function(event){keys[event.code]=false;});

    var lookPointer=null,lastLook={x:0,y:0};
    canvas.addEventListener("pointerdown",function(event){
      if(event.clientX<210&&event.clientY>window.innerHeight-210)return;
      if(event.clientX>window.innerWidth-210&&event.clientY>window.innerHeight-210)return;
      lookPointer=event.pointerId;lastLook={x:event.clientX,y:event.clientY};canvas.setPointerCapture&&canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove",function(event){
      if(lookPointer!==event.pointerId)return;
      player.targetYaw+=(event.clientX-lastLook.x)*.004;
      player.pitch=THREE.MathUtils.clamp(player.pitch-(event.clientY-lastLook.y)*.003,-.65,.65);
      lastLook={x:event.clientX,y:event.clientY};
    });
    ["pointerup","pointercancel"].forEach(function(type){canvas.addEventListener(type,function(event){if(lookPointer===event.pointerId)lookPointer=null;});});

    document.getElementById("sprint").addEventListener("pointerdown",function(event){event.preventDefault();controls.sprint=true;});
    ["pointerup","pointercancel","pointerleave"].forEach(function(type){document.getElementById("sprint").addEventListener(type,function(){controls.sprint=false;});});
    document.getElementById("jump").addEventListener("pointerdown",function(event){event.preventDefault();if(player.grounded){player.verticalVelocity=5.2;player.grounded=false;}});

    document.getElementById("xray").addEventListener("pointerdown",function(event){
      event.preventDefault();if(xrayEnergy>=25&&!xrayActive){xrayActive=true;setTimeout(function(){xrayActive=false;},6000);}
    });
  }

  function reload(){if(reserve<=0||magazine===24)return;var n=Math.min(24-magazine,reserve);magazine+=n;reserve-=n;document.getElementById("ammo").textContent=magazine+"/"+reserve;showNotice("Cargador recargado");}
  function changeWeapon(){weaponIndex=(weaponIndex+1)%weapons.length;document.getElementById("weapon-name").textContent=weapons[weaponIndex].name;}

  function meleeAttack(){
    shotTone();
    enemies.forEach(function(enemy){
      var d=Math.hypot(enemy.x-player.x,enemy.z-player.z);
      if(d<2.1){enemy.health-=35;var dx=enemy.x-player.x,dz=enemy.z-player.z,l=Math.hypot(dx,dz)||1,nx=enemy.x+dx/l*1.3,nz=enemy.z+dz/l*1.3;if(canOccupy(nx,nz,.58)){enemy.x=nx;enemy.z=nz;}}
    });
  }

  function fire(){
    if(!canShoot||weaponCooldown>0)return;
    var weapon=weapons[weaponIndex];
    if(weapon.id==="melee"){canShoot=false;setTimeout(function(){canShoot=true;},weapon.cooldown*1000);meleeAttack();return;}
    if(magazine<=0){showNotice("Sin munición");reload();return;}
    magazine--;document.getElementById("ammo").textContent=magazine+"/"+reserve;
    weaponCooldown=weapon.cooldown;canShoot=false;setTimeout(function(){canShoot=true;},weapon.cooldown*1000);
    shotTone();

    var dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize();
    var ray=new THREE.Raycaster(camera.position,dir,0,weapon.id==="rifle"?28:18);
    var hits=ray.intersectObjects(enemies.map(function(enemy){return enemy.group;}),true);
    if(hits.length){
      var hit=hits[0];
      for(var i=0;i<enemies.length;i++){
        var enemy=enemies[i];
        if(hit.object===enemy.group||enemy.group.children.indexOf(hit.object)>=0||hit.object.parent===enemy.group){
          enemy.health-=weapon.id==="rpg"?120:weapon.id==="rifle"?18:26;
          if(enemy.health<=0){scene.remove(enemy.group);enemies.splice(i,1);player.kills++;}
          break;
        }
      }
    }
  }

  function setupActions(){
    document.getElementById("weapon").addEventListener("pointerdown",function(event){event.preventDefault();changeWeapon();});
    document.getElementById("reload").addEventListener("pointerdown",function(event){event.preventDefault();reload();});
    document.getElementById("shoot").addEventListener("pointerdown",function(event){event.preventDefault();initAudio();fire();});
    document.getElementById("melee").addEventListener("pointerdown",function(event){event.preventDefault();initAudio();meleeAttack();});
  }

  function updateRadar(){
    var ctx=rctx;ctx.clearRect(0,0,150,150);
    ctx.strokeStyle="#69e4ff";ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(75,75,68,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle="#dfffff";ctx.beginPath();ctx.arc(75,75,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ff5a5a";
    enemies.forEach(function(enemy){
      var dx=(enemy.x-player.x)*2,dz=(enemy.z-player.z)*2;
      if(Math.abs(dx)<60&&Math.abs(dz)<60){ctx.beginPath();ctx.arc(75+dx,75+dz,3,0,Math.PI*2);ctx.fill();}
    });
  }

  function animate(){
    if(!initialized||!started)return;
    requestAnimationFrame(animate);
    var dt=Math.min(clock.getDelta(),.08);
    weaponCooldown=Math.max(0,weaponCooldown-dt);
    player.yaw+=(player.targetYaw-player.yaw)*Math.min(1,12*dt);
    if(!player.grounded){player.verticalVelocity-=11*dt;player.y+=player.verticalVelocity*dt;if(player.y<=1.65){player.y=1.65;player.verticalVelocity=0;player.grounded=true;}}

    var forward=(keys.KeyW||keys.ArrowUp||controls.forward?1:0)-(keys.KeyS||keys.ArrowDown||controls.back?1:0);
    var lateral=(keys.KeyD||keys.ArrowRight||controls.right?1:0)-(keys.KeyA||keys.ArrowLeft||controls.left?1:0);
    var f=forward,l=lateral;
    if(controlMode==="joystick"){f=THREE.MathUtils.clamp(f-joystickVector.y,-1,1);l=THREE.MathUtils.clamp(l+joystickVector.x,-1,1);if(Math.abs(joystickVector.x)>.12)player.targetYaw-=joystickVector.x*.018;}
    var sprint=keys.ShiftLeft||keys.ShiftRight||controls.sprint;
    if(sprint&&player.stamina>2)player.stamina=Math.max(0,player.stamina-28*dt);else player.stamina=Math.min(100,player.stamina+16*dt);
    var speed=(sprint&&player.stamina>2?6.2:3.9)*dt;
    var fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
    var dx=(fx*f+rx*l)*speed,dz=(fz*f+rz*l)*speed;
    if(canOccupy(player.x+dx,player.z,player.radius))player.x+=dx;
    if(canOccupy(player.x,player.z+dz,player.radius))player.z+=dz;
    camera.position.set(player.x,player.y,player.z);
    camera.rotation.order="YXZ";camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;

    if(localModel)localModel.position.set(player.x,0,player.z);
    enemies.forEach(function(enemy){
      var dist=Math.hypot(enemy.x-player.x,enemy.z-player.z);
      if(dist<1.45)return;
      var ex=player.x-enemy.x,ez=player.z-enemy.z,len=Math.hypot(ex,ez)||1,speedEnemy=(enemy.name==="foxy"?2.7:1.55)*dt;
      var nx=enemy.x+ex/len*speedEnemy,nz=enemy.z+ez/len*speedEnemy;
      if(dist>1.45&&canOccupy(nx,enemy.z,.58))enemy.x=nx;
      if(dist>1.45&&canOccupy(enemy.x,nz,.58))enemy.z=nz;
      enemy.group.position.set(enemy.x,0,enemy.z);
      enemy.group.rotation.y=Math.atan2(player.x-enemy.x,player.z-enemy.z);
    });

    capsules.forEach(function(capsule){
      if(capsule.active&&Math.hypot(player.x-capsule.group.position.x,player.z-capsule.group.position.z)<1){
        capsule.active=false;scene.remove(capsule.group);rescuedCapsules++;showNotice("Cápsula recuperada "+rescuedCapsules+"/4");
      }
    });

    fuseBoxes.forEach(function(fuse){
      if(fuse.active&&Math.hypot(player.x-fuse.group.position.x,player.z-fuse.group.position.z)<1.5){document.getElementById("enemy-alert").textContent="Fusible cercano";} 
    });

    if(xrayActive){
      xrayEnergy=Math.max(0,xrayEnergy-100/6*dt);
      walls.forEach(function(w){w.mesh.material.transparent=true;w.mesh.material.opacity=.22;w.mesh.material.depthWrite=false;});
      if(xrayEnergy<=0)xrayActive=false;
    } else {
      xrayEnergy=Math.min(100,xrayEnergy+9*dt);
      walls.forEach(function(w){w.mesh.material.transparent=false;w.mesh.material.opacity=1;w.mesh.material.depthWrite=true;});
    }

    for(var i=projectiles.length-1;i>=0;i--){var p=projectiles[i];p.life-=dt;if(p.life<=0){scene.remove(p.line);projectiles.splice(i,1);}}
    document.getElementById("health").textContent=Math.ceil(player.health);
    document.getElementById("shield").textContent=Math.ceil(player.shield);
    document.getElementById("mission").textContent=mission;
    document.getElementById("mission-text").textContent=mission===1?"Sabotaje eléctrico "+destroyedFuses+"/3":mission===2?"Rescate Pizza Planeta "+rescuedCapsules+"/4":"Duelo final";
    updateRadar();
    renderer.render(scene,camera);
  }

  async function syncPvp(){
    if(!started||selectedMode!=="pvp")return;
    try{
      var response=await fetch("/api/pvp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:"arena-1",id:player.id,character:player.character,team:player.team,x:player.x,z:player.z,yaw:player.yaw,weapon:weapons[weaponIndex].name,kills:player.kills,health:player.health})});
      if(!response.ok)return;
      var data=await response.json();
      Object.keys(data.players||{}).forEach(function(id){
        if(id===player.id)return;
        var p=data.players[id],remote=remotePlayers.get(id);
        if(!remote){remote=CharacterFactory.create(p.character||"buzz");scene.add(remote);remotePlayers.set(id,remote);}
        remote.position.set(p.x,0,p.z);remote.rotation.y=p.yaw||0;
      });
    }catch(error){showNotice("PvP desconectado");}
  }

  function startGame(){
    if(started)return;
    started=true;
    setMenuStatus("Preparando escena...");
    var selected=document.getElementById("character-select");
    var mode=document.getElementById("mode-select");
    selectedCharacter=selected?selected.value:"freddy";
    selectedMode=mode?mode.value:"mission";
    player.character=selectedCharacter;
    player.team=["buzz","woody","alien","jessie","bullseye"].indexOf(selectedCharacter)>=0?"toy":"fnaf";
    initAudio();
    if(!createScene()){
      started=false;
      return;
    }
    setupControls();
    setupActions();
    startScreen.classList.add("hidden");
    showNotice(selectedMode==="pvp"?"Batalla PvP iniciada":"Misiones iniciadas");
    requestAnimationFrame(animate);
    setInterval(syncPvp,1500);
  }

  if(startButton){
    startButton.addEventListener("click",startGame);
    startButton.addEventListener("pointerup",function(event){
      event.preventDefault();
      startGame();
    });
  }

  setMenuStatus(window.CharacterFactory?"Motor 3D listo":"Cargando motor 3D...");
  window.addEventListener("resize",function(){
    if(!camera||!renderer)return;
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });
})();
