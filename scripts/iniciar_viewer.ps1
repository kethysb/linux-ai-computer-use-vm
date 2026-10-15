# ==============================================================================
# 🚀 Iniciar Visualizador no Navegador (noVNC + Bridge)
# ==============================================================================
$bridgeScript = "$PSScriptRoot\..\viewer\bridge-linux.mjs"
$viewerUrl = "http://127.0.0.1:5994/vnc.html?autoconnect=1&resize=scale&path=websockify"

# Verifica se a porta 5994 já está aberta
$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 5994 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $portOpen) {
    Write-Host "Iniciando a ponte WebSocket noVNC (bridge-linux.mjs)..." -ForegroundColor Cyan
    Start-Process node -ArgumentList "`"$bridgeScript`"" -WindowStyle Hidden
    Start-Sleep -Seconds 1
} else {
    Write-Host "A ponte do visualizador ja esta em execucao." -ForegroundColor Yellow
}

Write-Host "Abrindo visualizador no navegador: $viewerUrl" -ForegroundColor Green
Start-Process $viewerUrl
