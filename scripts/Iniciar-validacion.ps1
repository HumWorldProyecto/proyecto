param([ValidateSet('Consulta', 'Gestion')][string]$CopiarClave)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repo '.env.validacion'

if ($CopiarClave) {
  if (-not (Test-Path -LiteralPath $envFile)) { throw 'Inicia la validación antes de copiar una clave.' }
  $variable = if ($CopiarClave -eq 'Consulta') { 'HUMWORLD_VALIDATION_READ_KEY' } else { 'HUMWORLD_VALIDATION_WRITE_KEY' }
  $entry = Get-Content -LiteralPath $envFile | Where-Object { $_.StartsWith("$variable=") } | Select-Object -First 1
  if (-not $entry) { throw 'No se encontró la clave de validación.' }
  Set-Clipboard -Value ($entry.Substring($variable.Length + 1))
  Write-Host "Clave de $CopiarClave copiada al portapapeles."
  exit 0
}

if (-not (Test-Path -LiteralPath $envFile)) {
  $variables = 'HUMWORLD_VALIDATION_DB_PASSWORD', 'HUMWORLD_VALIDATION_READ_KEY', 'HUMWORLD_VALIDATION_WRITE_KEY'
  $values = foreach ($variable in $variables) {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    "$variable=$([BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant())"
  }
  Set-Content -LiteralPath $envFile -Value $values -Encoding ascii
}

docker compose --env-file $envFile -f (Join-Path $repo 'compose.validacion.yml') up -d --build
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el entorno. Revisa el estado de Docker.' }
Write-Host 'Web: http://127.0.0.1:54176/'
Write-Host 'Swagger: http://127.0.0.1:53016/api/docs'
