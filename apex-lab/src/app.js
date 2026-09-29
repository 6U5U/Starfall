import { simulateLap, monteCarloStrategy, setupSweep } from "./sim.js";

const $ = s => document.querySelector(s);
const controls = {
  downforce: $("#downforce"), brakeBias: $("#brakeBias"), fuel: $("#fuel"),
  tireAge: $("#tireAge"), compound: $("#compound"), pitLap: $("#pitLap"),
  endCompound: $("#endCompound")
};
let baseline = null;

function resizeCanvas(canvas, height = null) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const h = height ?? rect.height;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return { ctx, w: rect.width, h };
}

function setup() {
  return {
    downforce:+controls.downforce.value,
    brakeBias:+controls.brakeBias.value,
    fuel:+controls.fuel.value,
    tireAge:+controls.tireAge.value,
    compound:controls.compound.value
  };
}

function fmtTime(sec) {
  const m = Math.floor(sec/60), s = sec - m*60;
  return `${m}:${s.toFixed(3).padStart(6,"0")}`;
}
function fmtRace(sec){return `${Math.floor(sec/60)}:${(sec%60).toFixed(1).padStart(4,"0")}`;}

function drawTrack(lap) {
  const c=$("#trackCanvas"), {ctx,w,h}=resizeCanvas(c);
  ctx.clearRect(0,0,w,h);
  const pts=lap.telemetry, xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const pad=38, sx=(w-pad*2)/(maxX-minX), sy=(h-pad*2)/(maxY-minY), scale=Math.min(sx,sy);
  const tx=x=>pad+(x-minX)*scale+(w-pad*2-(maxX-minX)*scale)/2;
  const ty=y=>h-pad-(y-minY)*scale-(h-pad*2-(maxY-minY)*scale)/2;
  ctx.lineCap="round";
  ctx.lineWidth=17;
  ctx.strokeStyle="#112532";
  ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.y)):ctx.moveTo(tx(p.x),ty(p.y))); ctx.closePath();ctx.stroke();
  const minV=Math.min(...pts.map(p=>p.speed)), maxV=Math.max(...pts.map(p=>p.speed));
  ctx.lineWidth=8;
  for(let i=0;i<pts.length;i++){
    const a=pts[i], b=pts[(i+1)%pts.length], t=(a.speed-minV)/(maxV-minV);
    const hue=185-150*t;
    ctx.strokeStyle=`hsl(${hue} 90% ${50+18*t}%)`;
    ctx.beginPath();ctx.moveTo(tx(a.x),ty(a.y));ctx.lineTo(tx(b.x),ty(b.y));ctx.stroke();
  }
  const p=pts[0];ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(tx(p.x),ty(p.y),5,0,Math.PI*2);ctx.fill();
}

function drawLine(canvas, points, xKey, yKey, accent="#71ead0", formatter=x=>x.toFixed(0)) {
  const {ctx,w,h}=resizeCanvas(canvas), pad={l:42,r:16,t:18,b:30};
  ctx.clearRect(0,0,w,h);
  const xs=points.map(p=>p[xKey]),ys=points.map(p=>p[yKey]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const ySpan=Math.max(maxY-minY,1e-6);
  ctx.strokeStyle="#18303e";ctx.fillStyle="#7690a0";ctx.font="10px system-ui";ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=pad.t+(h-pad.t-pad.b)*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=maxY-ySpan*i/3;ctx.fillText(formatter(val),4,y+3);}
  const X=x=>pad.l+(x-minX)/(maxX-minX||1)*(w-pad.l-pad.r);
  const Y=y=>pad.t+(maxY-y)/ySpan*(h-pad.t-pad.b);
  ctx.strokeStyle=accent;ctx.lineWidth=2.4;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(X(p[xKey]),Y(p[yKey])):ctx.moveTo(X(p[xKey]),Y(p[yKey])));ctx.stroke();
}

function drawHistogram(values) {
  const c=$("#histChart"), {ctx,w,h}=resizeCanvas(c), pad=24, bins=30;
  const min=Math.min(...values),max=Math.max(...values),step=(max-min)/bins||1,counts=Array(bins).fill(0);
  values.forEach(v=>counts[Math.min(bins-1,Math.floor((v-min)/step))]++);
  const top=Math.max(...counts);
  ctx.clearRect(0,0,w,h);
  for(let i=0;i<bins;i++){
    const bw=(w-pad*2)/bins, bh=(h-pad*2)*(counts[i]/top);
    const g=ctx.createLinearGradient(0,h-pad-bh,0,h-pad);g.addColorStop(0,"#78ecd1");g.addColorStop(1,"#244d5a");
    ctx.fillStyle=g;ctx.fillRect(pad+i*bw+1,h-pad-bh,Math.max(1,bw-2),bh);
  }
  ctx.fillStyle="#7790a1";ctx.font="10px system-ui";ctx.fillText(fmtRace(min),pad,h-7);ctx.fillText(fmtRace(max),w-pad-38,h-7);
}

function updateLabels(){
  $("#downforceOut").textContent=controls.downforce.value;
  $("#brakeBiasOut").textContent=`${(+controls.brakeBias.value).toFixed(1)}%`;
  $("#fuelOut").textContent=`${controls.fuel.value} kg`;
  $("#tireAgeOut").textContent=`${controls.tireAge.value} laps`;
  $("#pitLapOut").textContent=controls.pitLap.value;
}

function render(runMonteCarlo=false){
  updateLabels();
  const cfg=setup(), lap=simulateLap(cfg);
  if(baseline===null) baseline=lap.lapTime;
  $("#lapTime").textContent=fmtTime(lap.lapTime);
  const delta=lap.lapTime-baseline, d=$("#lapDelta");
  d.textContent=`${delta>=0?"+":""}${delta.toFixed(3)} s vs initial baseline`;
  d.className=`delta ${delta<=0?"good":"bad"}`;
  $("#maxSpeed").textContent=`${lap.maxSpeed.toFixed(0)} km/h`;
  $("#avgSpeed").textContent=`${lap.avgSpeed.toFixed(0)} km/h`;
  $("#peakG").textContent=`${lap.peakG.toFixed(2)} g`;
  $("#tireTemp").textContent=`${lap.tireTemp.toFixed(1)} °C`;
  $("#sectors").textContent=lap.sectorTimes.map(x=>x.toFixed(2)).join(" / ");
  drawTrack(lap);
  drawLine($("#speedChart"),lap.telemetry,"distance","speed","#69e9d0",x=>x.toFixed(0));
  const sweep=setupSweep(cfg,"downforce",20,100,42);
  drawLine($("#sweepChart"),sweep,"x","y","#ffb55d",x=>x.toFixed(1));

  if(runMonteCarlo){
    const mc=monteCarloStrategy({
      laps:28,pitLap:+controls.pitLap.value,startCompound:cfg.compound,
      endCompound:controls.endCompound.value,setup:{...cfg,fuel:96,tireAge:0},
      safetyCarChance:.10
    },500,17);
    drawHistogram(mc.totals);
    $("#mcMean").textContent=fmtRace(mc.mean);
    $("#mcSigma").textContent=`${mc.sigma.toFixed(2)} s`;
    $("#mcP10").textContent=fmtRace(mc.p10);
    $("#mcP90").textContent=fmtRace(mc.p90);
    const spread=mc.p90-mc.p10;
    $("#strategyNote").textContent=`The central 80% of outcomes span ${spread.toFixed(1)} s. A setup that gains a few tenths per lap can still lose the race if its tire curve or pit timing increases variance enough.`;
  }
}

Object.values(controls).forEach(el=>el.addEventListener("input",()=>render(false)));
$("#rerun").addEventListener("click",()=>render(true));
addEventListener("resize",()=>render(false));
render(true);
