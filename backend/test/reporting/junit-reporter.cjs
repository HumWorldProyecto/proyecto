const fs = require('node:fs');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

function xml(value) {
  return stripVTControlCharacters(String(value ?? ''))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/gu, '')
    .replace(/[&<>"']/gu, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    })[character]);
}

function seconds(milliseconds) {
  return (Math.max(0, milliseconds ?? 0) / 1000).toFixed(3);
}

function renderJUnit(results, rootDir) {
  const totals = { tests: 0, failures: 0, errors: 0, skipped: 0 };
  const suites = results.testResults.map((suite) => {
    const file = path.relative(rootDir, suite.testFilePath).replace(/\\/gu, '/');
    const counts = { tests: 0, failures: 0, errors: 0, skipped: 0 };
    const cases = suite.testResults.map((test) => {
      counts.tests += 1;
      let detail = '';
      if (test.status === 'failed') {
        counts.failures += 1;
        detail = `<failure message="${xml(test.title)}">${xml(test.failureMessages.join('\n'))}</failure>`;
      } else if (['pending', 'todo', 'skipped', 'disabled'].includes(test.status)) {
        counts.skipped += 1;
        detail = '<skipped/>';
      }
      return `<testcase name="${xml(test.fullName)}" classname="${xml(test.ancestorTitles.join('.'))}" file="${xml(file)}" time="${seconds(test.duration)}">${detail}</testcase>`;
    });
    // Un error de carga/configuración no debe convertirse en una suite vacía verde.
    if (suite.testExecError || (cases.length === 0 && suite.failureMessage)) {
      counts.tests += 1;
      counts.errors += 1;
      cases.push(`<testcase name="Error de ejecución de suite" file="${xml(file)}" time="0.000"><error message="Error de ejecución">${xml(suite.failureMessage ?? suite.testExecError.message)}</error></testcase>`);
    }
    for (const key of Object.keys(totals)) totals[key] += counts[key];
    const attributes = Object.entries(counts).map(([key, value]) => `${key}="${value}"`).join(' ');
    const elapsed = (suite.perfStats?.end ?? 0) - (suite.perfStats?.start ?? 0);
    return `<testsuite name="${xml(file)}" ${attributes} time="${seconds(elapsed)}">\n${cases.join('\n')}\n</testsuite>`;
  });
  const attributes = Object.entries(totals).map(([key, value]) => `${key}="${value}"`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites ${attributes}>\n${suites.join('\n')}\n</testsuites>\n`;
}

class JUnitReporter {
  constructor(globalConfig, options = {}) {
    this.rootDir = globalConfig.rootDir;
    this.outputFile = path.resolve(this.rootDir, options.outputFile ?? 'reports/junit.xml');
  }

  onRunComplete(_contexts, results) {
    this.error = undefined;
    try {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      fs.writeFileSync(this.outputFile, renderJUnit(results, this.rootDir), 'utf8');
    } catch (error) {
      this.error = new Error(`No se pudo generar JUnit: ${error.message}`, { cause: error });
    }
  }

  getLastError() { return this.error; }
}

module.exports = JUnitReporter;
module.exports.renderJUnit = renderJUnit;
