import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { XpellEngine, XModule, _xu } from '../dist/xpell-core.es.js';

function manualEngine() {
  const pending = []; let cancelled = 0;
  const schedule = cb => { pending.push(cb); };
  schedule._cancel = () => { cancelled++; };
  return { engine: new XpellEngine({ _schedule_frame: schedule }), pending, cancellations: () => cancelled };
}

test('one owned Core run starts once, stops idempotently and fences cancelled callbacks', () => {
  const { engine, pending, cancellations } = manualEngine(); const owner = {};
  assert.equal(engine.start(owner), true); assert.equal(engine._frame_number, 1);
  assert.equal(engine.start(owner), false); engine.onFrame();
  assert.equal(pending.length, 1); assert.equal(engine._frame_number, 1);
  const old = pending.shift();
  assert.equal(engine.stop(), false); assert.equal(engine.stop({}), false);
  assert.equal(engine.isRunning(), true);
  assert.equal(engine.stop(owner), true); assert.equal(engine.stop(owner), false);
  assert.equal(cancellations(), 1); old(); engine.onFrame();
  assert.equal(engine._frame_number, 1);
  assert.throws(() => engine.execute({ _module: 'xd', _op: 'get', _params: { key: 'test' } }), e => e._code === 'E_X_RUNTIME_STOPPED');
});

test('a callback from an old Core generation cannot resume a restarted engine', () => {
  const { engine, pending } = manualEngine();
  engine.start(); const old = pending.shift(); engine.stop(); engine.start();
  const frame = engine._frame_number; old();
  assert.equal(engine._frame_number, frame); assert.equal(pending.length, 1);
  pending.shift()(); assert.equal(engine._frame_number, frame + 1);
  engine.stop();
});

test('legacy void-returning schedulers remain usable and their callbacks are fenced', () => {
  let callback;
  const engine = new XpellEngine({ _schedule_frame: cb => { callback = cb; } });
  engine.start(); engine.stop(); callback();
  assert.equal(engine._frame_number, 1);
});

test('the default scheduler cancels both immediate and paced pending frames', async () => {
  for (const fps of [undefined, 10]) {
    let calls = 0; const schedule = _xu.createDefaultScheduler(fps);
    schedule(() => calls++); schedule._cancel();
    await delay(fps ? 120 : 10); assert.equal(calls, 0);
  }
});

test('stopping inside a frame prevents later modules and another scheduled pass', async () => {
  const { engine, pending } = manualEngine(); const owner = {}; let later = 0;
  class Stopper extends XModule {
    constructor() { super({ _name: 'stopper' }); }
    onFrame() { engine.stop(owner); }
  }
  class Later extends XModule {
    constructor() { super({ _name: 'later' }); }
    onFrame() { later++; }
  }
  await engine.loadModuleAsync(new Stopper()); await engine.loadModuleAsync(new Later());
  engine.start(owner); assert.equal(later, 0); assert.equal(pending.length, 0);
});

test('a synchronous first-frame failure releases its Core run', async () => {
  const { engine } = manualEngine();
  class Failing extends XModule {
    constructor() { super({ _name: 'failing' }); }
    onFrame() { throw new Error('injected frame failure'); }
  }
  await engine.loadModuleAsync(new Failing());
  assert.throws(() => engine.start({}), /injected frame failure/);
  assert.equal(engine.isRunning(), false);
});
