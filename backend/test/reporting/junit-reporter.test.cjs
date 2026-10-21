const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JUnitReporter = require('./junit-reporter.cjs');
const { renderJUnit } = JUnitReporter;

function result(statuses = ['passed']) {
  return { testResults: [{
    testFilePath: path.resolve('test/p11/example.spec.ts'), perfStats: { start: 100, end: 1100 },
    testResults: statuses.map((status) => ({
      status, title: 'a < b & "c"', fullName: `Caso ${status}`, ancestorTitles: ['P11'],
      duration: 125, failureMessages: ['\u001b[31mExpected: <404> & received "200"\u001b[39m\u0001'],
    })),
  }] };
}

test('cuenta aprobadas/fallidas/pendientes/todo y conserva detalle XML escapado', () => {
  const output = renderJUnit(result(['passed', 'failed', 'pending', 'todo']), process.cwd());
  assert.match(output, /<testsuites tests="4" failures="1" errors="0" skipped="2">/);
  assert.match(output, /Expected: &lt;404&gt; &amp; received &quot;200&quot;/);
  assert.match(output, /time="0.125"/);
  assert.match(output, /file="test\/p11\/example.spec.ts"/);
  assert.equal((output.match(/<testcase /gu) ?? []).length, 4);
  assert.equal((output.match(/<skipped\//gu) ?? []).length, 2);
  assert.doesNotMatch(output, /\u001b|\u0001/);
});

test('representa un fallo al cargar suite como error visible', () => {
  const input = result([]);
  input.testResults[0].testExecError = new Error('No se pudo cargar <módulo>');
  const output = renderJUnit(input, process.cwd());
  assert.match(output, /tests="1" failures="0" errors="1" skipped="0"/);
  assert.match(output, /<error .*No se pudo cargar &lt;módulo&gt;/);
});

test('genera el archivo y expone errores de escritura mediante getLastError', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'humworld-p11-junit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const reporter = new JUnitReporter({ rootDir: dir });
  reporter.onRunComplete(new Set(), result());
  assert.equal(reporter.getLastError(), undefined);
  assert.match(fs.readFileSync(path.join(dir, 'reports/junit.xml'), 'utf8'), /<testsuites tests="1" failures="0"/);
  const invalid = new JUnitReporter({ rootDir: dir }, { outputFile: 'reports' });
  invalid.onRunComplete(new Set(), result());
  assert.ok(invalid.getLastError() instanceof Error);
  assert.match(invalid.getLastError().message, /No se pudo generar JUnit/);
});
