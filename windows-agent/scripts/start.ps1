# Automaton Agent - Start Script (Windows)

Write-Host ""
Write-Host "  ⬡ AUTOMATON - Starting..." -ForegroundColor Cyan
Write-Host ""

Push-Location $PSScriptRoot\..

# Check if built
if (-not (Test-Path "dist")) {
    Write-Host "  Building TypeScript..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

# Start mode selection
$mode = $args[0]
if (-not $mode) { $mode = "ui" }

switch ($mode) {
    "ui" {
        Write-Host "  Starting with UI (Electron)..." -ForegroundColor Green
        npm run ui
    }
    "agent" {
        Write-Host "  Starting agent only (headless)..." -ForegroundColor Green
        npm run start:agent
    }
    "dev" {
        Write-Host "  Starting in dev mode..." -ForegroundColor Green
        npm run dev
    }
    default {
        Write-Host "  Usage: .\start.ps1 [ui|agent|dev]" -ForegroundColor Yellow
        Write-Host "    ui    - Launch with Electron UI (default)" -ForegroundColor Gray
        Write-Host "    agent - Run agent headless" -ForegroundColor Gray
        Write-Host "    dev   - Dev mode with hot reload" -ForegroundColor Gray
    }
}

Pop-Location
