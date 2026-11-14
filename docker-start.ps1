# Generate a random port between 10000 and 60000 if HOST_PORT is not already set in environment or .env
$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*HOST_PORT\s*=\s*(.+)$") {
            $env:HOST_PORT = $matches[1].Trim()
        }
    }
}

if (-not $env:HOST_PORT) {
    # Generate random port
    $randomPort = Get-Random -Minimum 10000 -Maximum 60000
    $env:HOST_PORT = $randomPort
    Add-Content -Path $envFile -Value "`nHOST_PORT=$randomPort"
    Write-Host "Assigned random HOST_PORT: $randomPort" -ForegroundColor Cyan
} else {
    Write-Host "Using configured HOST_PORT: $env:HOST_PORT" -ForegroundColor Cyan
}

Write-Host "Building and starting Docker containers with Cloudflare Tunnel..." -ForegroundColor Green
docker compose up -d --build

Write-Host "`nWaiting for Cloudflare Tunnel to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n=== CLOUDFLARE TUNNEL STATUS & URL ===" -ForegroundColor Magenta
docker compose logs tunnel | Select-String -Pattern "https://.*\.trycloudflare\.com" | Select-Object -Last 1
docker compose ps
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host "Local Access: http://localhost:$env:HOST_PORT" -ForegroundColor Green

