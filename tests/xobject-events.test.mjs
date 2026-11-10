import assert from "node:assert/strict";
import test from "node:test";
import {
  XObject,
  _XEventManager,
  getXEventManager,
  setXEventManager,
} from "../dist/xpell-core.es.js";

function readCurrentEventManager() {
  try {
    return getXEventManager();
  } catch {
    return undefined;
  }
}

function restoreEventManager(xem) {
  setXEventManager(xem ?? new _XEventManager());
}

test("XObject mounts with omitted, undefined, or null event maps", async () => {
  const previousXem = readCurrentEventManager();
  setXEventManager(new _XEventManager());

  try {
    const omitted = new XObject({ _id: "event-map-omitted" });
    const undefinedMaps = new XObject({
      _id: "event-map-undefined",
      _on: undefined,
      _once: undefined,
    });
    const nullMaps = new XObject({
      _id: "event-map-null",
      _on: null,
      _once: null,
    });

    await omitted.onMount();
    await undefinedMaps.onMount();
    await nullMaps.onMount();

    assert.deepEqual(omitted._on, {});
    assert.deepEqual(omitted._once, {});
    assert.deepEqual(undefinedMaps._on, {});
    assert.deepEqual(undefinedMaps._once, {});
    assert.deepEqual(nullMaps._on, {});
    assert.deepEqual(nullMaps._once, {});
  } finally {
    restoreEventManager(previousXem);
  }
});

test("XObject preserves valid _on and _once handlers while normalizing only nullish maps", async () => {
  const previousXem = readCurrentEventManager();
  const xem = new _XEventManager();
  setXEventManager(xem);

  try {
    let onCount = 0;
    let onceCount = 0;
    const onEvent = "xobject-events-on";
    const onceEvent = "xobject-events-once";

    const obj = new XObject({
      _id: "event-map-valid",
      _on: {
        [onEvent]: () => {
          onCount += 1;
        },
      },
      _once: {
        [onceEvent]: () => {
          onceCount += 1;
        },
      },
    });

    await obj.onMount();
    await xem.fire(onEvent);
    await xem.fire(onEvent);
    await xem.fire(onceEvent);
    await xem.fire(onceEvent);

    assert.equal(onCount, 2);
    assert.equal(onceCount, 1);
  } finally {
    restoreEventManager(previousXem);
  }
});

test("XObject rejects malformed non-null event maps", async () => {
  const previousXem = readCurrentEventManager();
  setXEventManager(new _XEventManager());

  try {
    const stringMap = new XObject({
      _id: "event-map-string",
      _on: "click",
    });
    const arrayMap = new XObject({
      _id: "event-map-array",
      _once: [],
    });

    await assert.rejects(
      stringMap.onMount(),
      /_on event map must be an object when defined/,
    );
    await assert.rejects(
      arrayMap.onMount(),
      /_once event map must be an object when defined/,
    );
  } finally {
    restoreEventManager(previousXem);
  }
});
