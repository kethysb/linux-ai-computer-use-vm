# ==============================================================================
# 🌐 Download e Configuração do noVNC Web Viewer
# ==============================================================================
$targetDir = "$PSScriptRoot\..\viewer\noVNC"

if (Test-Path "$targetDir\vnc.html") {
    Write-Host "noVNC ja esta instalado em '$targetDir'." -ForegroundColor Green
    exit 0
}

Write-Host "Baixando noVNC oficial do GitHub..." -ForegroundColor Cyan
$zipUrl = "https://github.com/novnc/noVNC/archive/refs/heads/master.zip"
$zipPath = "$env:TEMP\novnc_master.zip"

Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

Write-Host "Extraindo noVNC..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\novnc_temp" -Force

if (-not (Test-Path "$PSScriptRoot\..\viewer")) {
    New-Item -ItemType Directory -Path "$PSScriptRoot\..\viewer" -Force | Out-Null
}

Move-Item -Path "$env:TEMP\novnc_temp\noVNC-master" -Destination $targetDir -Force
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\novnc_temp" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "noVNC configurado com sucesso em: $targetDir" -ForegroundColor Green
