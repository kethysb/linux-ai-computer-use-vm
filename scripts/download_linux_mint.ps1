# ==============================================================================
# 🐧 Download Automático da ISO Oficial do Linux Mint 22.3 Cinnamon
# ==============================================================================
$url = "https://mirrors.edge.kernel.org/linuxmint/iso/stable/22.3/linuxmint-22.3-cinnamon-64bit.iso"
$destPath = "$PSScriptRoot\..\linuxmint-22.3-cinnamon-64bit.iso"

Write-Host "Iniciando download do Linux Mint 22.3 Cinnamon..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host "Destino: $destPath" -ForegroundColor Gray

if (Test-Path $destPath) {
    Write-Host "Aviso: A ISO ja existe no destino. Download dispensado." -ForegroundColor Green
    exit 0
}

# Usa BITS para download rápido e com barra de progresso
Start-BitsTransfer -Source $url -Destination $destPath -DisplayName "Baixando Linux Mint ISO"

if (Test-Path $destPath) {
    Write-Host "Download concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro: O arquivo nao foi baixado corretamente." -ForegroundColor Red
}
