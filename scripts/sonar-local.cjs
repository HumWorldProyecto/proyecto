// Análisis de la instancia local del equipo. No crea/revisa/cierra issues o hotspots.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'reports/quality');
const token = process.env.SONAR_TOKEN;
const url = process.env.SONAR_HOST_URL || 'http://127.0.0.1:59000';
const container = process.env.SONAR_CONTAINER || 'humworld-quality-local';
const docker = process.env.DOCKER_EXE || (process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA, 'Programs/DockerDesktop/resources/bin/docker.exe') : 'docker');
const scrub = (text) => token ? text.split(token).join('[OMITIDO]') : text;
async function api(route) {
  const response = await fetch(url + route, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const error = new Error(`API Sonar ${route} (${response.status}): ${JSON.stringify(detail.errors ?? [])}`);
    error.httpStatus = response.status;
    throw error;
  }
  return response.json();
}
function coverage(source, destination, prefix) {
  const text = fs.readFileSync(path.join(root, source), 'utf8').replace(/^SF:(.+)$/gm, (_line, file) => {
    const normalized = file.replaceAll('\\', '/');
    const marker = `${prefix}/src/`; const index = normalized.indexOf(marker);
    return 'SF:' + (index >= 0 ? normalized.slice(index) : `${prefix}/${normalized}`);
  });
  fs.writeFileSync(path.join(output, destination), text);
}
async function main() {
  if (!token?.trim()) throw new Error('Define SONAR_TOKEN solo en el entorno local');
  if (!/^(http:\/\/(127\.0\.0\.1|localhost)(:\d+)?|https:\/\/[^/]+)$/.test(url)) throw new Error('Usa localhost o HTTPS');
  if (!/^[a-zA-Z0-9_.-]+$/.test(container)) throw new Error('Nombre de contenedor inválido');
  fs.mkdirSync(output, { recursive: true });
  coverage('backend/reports/coverage/lcov.info', 'backend-lcov.info', 'backend');
  coverage('frontend/coverage/lcov.info', 'frontend-lcov.info', 'frontend');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
  const args = ['run','--rm','--network',`container:${container}`,'-e','SONAR_TOKEN',
    '--mount',`type=bind,source=${root},target=/usr/src,readonly`,
    'sonarsource/sonar-scanner-cli@sha256:47956b669bf486bdad919e1cbd0533223515aa0b6d1d31763e5a3754942df6d7',
    '-Dsonar.host.url=http://127.0.0.1:9000','-Dsonar.working.directory=/tmp/humworld-scanner',`-Dsonar.scm.revision=${sha}`];
  let log = '';
  // El marcador local permite recuperar solo el informe de una tarea ya subida, sin alterar el gate.
  const reportOnly = process.argv.includes('--report-only') || fs.existsSync(path.join(output,'report-only.local'));
  if (reportOnly) log = fs.readFileSync(path.join(output,'scanner.log'),'utf8');
  else {
    const scanner = spawn(docker, args, { cwd: root, env: { ...process.env, SONAR_TOKEN: token }, windowsHide: true });
    scanner.stdout.on('data', chunk => { log += chunk; }); scanner.stderr.on('data', chunk => { log += chunk; });
    const exit = await new Promise((resolve, reject) => { scanner.on('error',reject);scanner.on('close',resolve); });
    fs.writeFileSync(path.join(output,'scanner.log'),scrub(log));
    if (exit !== 0) throw new Error('El scanner falló; consulta reports/quality/scanner.log sin credenciales');
  }
  const taskId = /api\/ce\/task\?id=([\w-]+)/.exec(log)?.[1];
  if (!taskId) throw new Error('No se obtuvo la tarea de análisis');
  let task;
  for (let attempt=0;attempt<180;attempt++) {
    task = (await api(`/api/ce/task?id=${taskId}`)).task;
    if (['SUCCESS','FAILED','CANCELED'].includes(task.status)) break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if (task.status !== 'SUCCESS') throw new Error('Sonar no completó el análisis');
  const gate = await api(`/api/qualitygates/project_status?analysisId=${task.analysisId}`);
  const measures = await api('/api/measures/component?component=humworld-equipo5&metricKeys=ncloc,coverage,duplicated_lines_density,violations,security_hotspots');
  const issues = await api('/api/issues/search?componentKeys=humworld-equipo5&resolved=false&ps=500');
  let hotspots;
  try { hotspots = await api('/api/hotspots/search?project=humworld-equipo5&ps=500'); }
  catch (error) {
    if (error.httpStatus !== 403) throw error;
    hotspots = { paging: { total: Number(measures.component.measures.find(item => item.metric === 'security_hotspots')?.value ?? 0) },
      access: 'El token de análisis no permite revisar hotspots; se requiere revisión humana con permiso apropiado.' };
  }
  const summary = { checkedAt: new Date().toISOString(), sha, serverVersion: (await api('/api/system/status')).version,
    gate: gate.projectStatus, measures: measures.component.measures, issueTotal: issues.paging.total,
    hotspotTotal: hotspots.paging.total, humanReviewSimulated: false,
    coverageThreshold: 80, criticalVulnerabilities: issues.issues.filter(issue => issue.type === 'VULNERABILITY' && ['CRITICAL','BLOCKER'].includes(issue.severity)).length };
  for (const [name,value] of Object.entries({summary,issues,hotspots})) {
    fs.writeFileSync(path.join(output,`${name}.json`), JSON.stringify(value,null,2));
  }
  console.log(JSON.stringify(summary));
  const measuredCoverage = Number(measures.component.measures.find(item => item.metric === 'coverage')?.value ?? 0);
  if (gate.projectStatus.status === 'ERROR' || measuredCoverage < 80 || summary.criticalVulnerabilities > 0) process.exitCode = 2;
}
main().catch(error=>{console.error(scrub(error.message));process.exitCode=1;});
