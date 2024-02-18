/**
 * Minimal Unit Test Harness
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2014, Google Inc.
 */
function setOrCreate(id, style, innerHTML) {
  let el = document.querySelector('#' + id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  el.setAttribute('style', style);
  el.innerHTML = innerHTML;
}
export function assert(cond, err) { if (!cond) { throw err || 'Undefined error'; } }
export function assertEquals(a, b, err) { assert(a === b, err || (a + '!=' + b)); }
export function assertThrows(fn, err) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  assert(threw, err || 'Code did not throw');
}
export function runTests(spec) {
  let prevResult = Promise.resolve(true);
  for (let testName in spec['tests']) {
    setOrCreate(testName, 'color:#F90', 'RUNNING: ' + testName);
    try {
      prevResult = prevResult.then(() => {
        if (spec['setUp']) spec['setUp']();
        const thisResult = spec['tests'][testName]() || Promise.resolve(true);
        return thisResult.then(() => {
          if (spec['tearDown']) spec['tearDown']();
          setOrCreate(testName, 'color:#090', 'PASS: ' + testName);
        });
      }).catch(err => setOrCreate(testName, 'color:#900', 'FAIL: ' + testName + ': ' + err));
    } catch (err) {
      setOrCreate(testName, 'color:#900', 'FAIL: ' + testName + ': ' + err);
    }
  }
}
