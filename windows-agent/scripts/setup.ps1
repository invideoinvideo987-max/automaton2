# Automaton Agent - Windows Setup Script
# Run as Administrator for full setup

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     AUTOMATON - Sovereign AI Agent       ║" -ForegroundColor Cyan
Write-Host "  ║         Windows Setup Script             ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Node.js not found. Installing via winget..." -ForegroundColor Red
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
}

# Check GitHub CLI
Write-Host "[2/5] Checking GitHub CLI..." -ForegroundColor Yellow
$ghVersion = gh --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ GitHub CLI not found. Installing..." -ForegroundColor Red
    winget install GitHub.cli --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "  ✓ GitHub CLI installed" -ForegroundColor Green
}

# Check Copilot extension
Write-Host "[3/5] Checking Copilot CLI extension..." -ForegroundColor Yellow
$copilotVersion = gh copilot --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Installing Copilot CLI extension..." -ForegroundColor Yellow
    gh extension install github/gh-copilot
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Copilot CLI extension installed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Could not install Copilot extension. You may need to authenticate first: gh auth login" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✓ Copilot CLI ready" -ForegroundColor Green
}

# Install dependencies
Write-Host "[4/5] Installing dependencies..." -ForegroundColor Yellow
Push-Location $PSScriptRoot\..
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Dependency installation failed" -ForegroundColor Red
    exit 1
}
Pop-Location

# Create data directory
Write-Host "[5/5] Setting up data directory..." -ForegroundColor Yellow
$dataDir = "$env:LOCALAPPDATA\Automaton"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "  ✓ Created $dataDir" -ForegroundColor Green
} else {
    Write-Host "  ✓ Data directory exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete! Run .\scripts\start.ps1 to launch" -ForegroundColor Green
Write-Host "  ════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
