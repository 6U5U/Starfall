import assert from 'node:assert/strict';
import {createFlight,step,guidance} from './dist/physics.js';
for(const level of ['calm','gusts']){const s=createFlight(level);s.status='flying';while(s.status==='flying'&&s.time<120)step(s,guidance(s),1/120);assert.equal(s.status,'landed');assert.ok(s.fuel>0);console.log('PASS: guided landing in '+level);}
const fall=createFlight();fall.status='flying';while(fall.status==='flying')step(fall,{turn:0,throttle:0},1/120);assert.equal(fall.status,'crashed');console.log('PASS: unpowered crash');
const empty=createFlight();empty.status='flying';empty.fuel=0;step(empty,{turn:0,throttle:1},1);assert.equal(empty.throttle,0);assert.equal(empty.fuel,0);console.log('PASS: empty tank cannot generate thrust');
const ready=createFlight();step(ready,{turn:1,throttle:1},1);assert.deepEqual(ready,createFlight());console.log('PASS: ready state remains stationary');
const offpad=createFlight();Object.assign(offpad,{status:'flying',y:.001,x:100,vy:-1,angle:0});step(offpad,{turn:0,throttle:0},1/120);assert.equal(offpad.status,'crashed');console.log('PASS: off-pad touchdown rejected');
