(function (global) {
  "use strict";

  var ctx=null, master=null, musicTimer=null, enabled=true;

  function ensure() {
    if (!ctx) {
      var Context=window.AudioContext||window.webkitAudioContext;
      if (!Context) return false;
      ctx=new Context();
      master=ctx.createGain();
      master.gain.value=.32;
      master.connect(ctx.destination);
    }
    if (ctx.state==="suspended") ctx.resume();
    return true;
  }

  function tone(freq,duration,type,volume,startDelay) {
    if (!ensure()||!enabled) return;
    var now=ctx.currentTime+(startDelay||0);
    var osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type||"triangle";osc.frequency.setValueAtTime(freq,now);
    gain.gain.setValueAtTime(volume||.08,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+duration);
  }

  function noise(duration,volume,lowpass) {
    if (!ensure()||!enabled) return;
    var length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    var buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
    for(var i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;filter.type="lowpass";filter.frequency.value=lowpass||1800;
    gain.gain.value=volume||.1;
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start();
  }

  function startMusic(battle) {
    if (!ensure()||musicTimer) return;
    var notes=[392,392,440,392,523,494,392,392,440,392,587,523];
    var index=0;
    musicTimer=setInterval(function(){
      if (!enabled) return;
      var note=notes[index%notes.length];
      tone(note,battle ? .32 : .28,"triangle",battle ? .026 : .018);
      if(index%4===0)tone(note/2,.45,"sine",battle ? .018 : .012,.06);
      index++;
    },battle?460:680);
  }

  global.GameAudio={
    unlock:function(){ensure();},
    setEnabled:function(value){enabled=!!value;if(!enabled&&master)master.gain.value=0;if(enabled&&master)master.gain.value=.32;},
    isEnabled:function(){return enabled;},
    startMusic:startMusic,
    stopMusic:function(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}},
    melee:function(){noise(.16,.24,420);tone(70,.18,"sine",.22);},
    laser:function(){if(!ensure()||!enabled)return;var o=ctx.createOscillator(),g=ctx.createGain();o.type="sawtooth";o.frequency.setValueAtTime(1100,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(180,ctx.currentTime+.12);g.gain.setValueAtTime(.13,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.13);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+.14);},
    rifle:function(){noise(.07,.17,2600);tone(130,.05,"square",.05);},
    rpg:function(){tone(95,.55,"sawtooth",.18);noise(.75,.38,900);setTimeout(function(){tone(48,1.1,"sine",.28);},140);},
    electric:function(){noise(.09,.07,3300);tone(220,.12,"square",.035);},
    xray:function(){if(!ensure()||!enabled)return;var o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(170,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(1700,ctx.currentTime+.65);g.gain.setValueAtTime(.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.68);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+.7);},
    proximity:function(){tone(58,.10,"sine",.045);}
  };

  ["pointerdown","click"].forEach(function(type){
    window.addEventListener(type,function(){ensure();},{once:true});
  });
})(window);
