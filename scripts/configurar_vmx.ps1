# ==============================================================================
# 🎯 Injetor de VNC Nativo no Arquivo .VMX do VMware Workstation
# ==============================================================================
param(
    [Parameter(Mandatory=$false)]
    [string]$VmxPath
)

if (-not $VmxPath) {
    $VmxPath = Read-Host "Informe o caminho completo do arquivo .vmx (ex: C:\VMs\Linux.vmx)"
}

if (-not (Test-Path $VmxPath)) {
    Write-Host "Erro: Arquivo .vmx nao encontrado em '$VmxPath'." -ForegroundColor Red
    exit 1
}

# Fazer backup preventivo
$backup = "$VmxPath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $VmxPath -Destination $backup
Write-Host "Backup criado em: $backup" -ForegroundColor Yellow

$content = Get-Content -Path $VmxPath -Raw

# Remove linhas antigas de VNC caso existam
$content = $content -replace "(?m)^RemoteDisplay\.vnc\..*`r?`n", ""

# Adiciona a configuração oficial de VNC Hypervisor
$vncBlock = @"

# --- VNC Hypervisor para Agentes de IA e Web Viewer ---
RemoteDisplay.vnc.enabled = "TRUE"
RemoteDisplay.vnc.port = "5957"
RemoteDisplay.vnc.ip = "127.0.0.1"
RemoteDisplay.vnc.keyMap = "us"
"@

$content += $vncBlock
Set-Content -Path $VmxPath -Value $content -Encoding utf8

Write-Host "Sucesso: VNC ativado na porta 5957 para 127.0.0.1!" -ForegroundColor Green
Write-Host "Agora a VM pode ser controlada visualmente pelo Antigravity e pelo navegador." -ForegroundColor Cyan
