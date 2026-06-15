$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

function Run-Native($File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$File $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Run-Step($Name, [scriptblock]$Command) {
    Write-Host ""
    Write-Host "==> $Name"
    & $Command
}

Run-Step "Backend composer validate" {
    Push-Location "$root\backend"
    Run-Native "composer" @("validate", "--strict")
    Pop-Location
}

Run-Step "Backend dependency audit" {
    Push-Location "$root\backend"
    Run-Native "composer" @("audit")
    Pop-Location
}

Run-Step "Backend testing migrations" {
    Push-Location "$root\backend"
    Run-Native "php" @("artisan", "config:clear")
    Run-Native "php" @("artisan", "route:clear")
    Run-Native "php" @("artisan", "migrate:fresh", "--env=testing", "--force")
    Pop-Location
}

Run-Step "Backend tests" {
    Push-Location "$root\backend"
    $env:APP_ENV = "testing"
    Run-Native "php" @("artisan", "test")
    Remove-Item Env:\APP_ENV -ErrorAction SilentlyContinue
    Pop-Location
}

Run-Step "Backend deploy cache checks" {
    Push-Location "$root\backend"
    Run-Native "php" @("artisan", "config:clear")
    Run-Native "php" @("artisan", "route:clear")
    Run-Native "php" @("artisan", "schedule:list", "--env=testing")
    Run-Native "php" @("artisan", "route:cache")
    Run-Native "php" @("artisan", "config:cache")
    Run-Native "php" @("artisan", "config:clear")
    Run-Native "php" @("artisan", "route:clear")
    Pop-Location
}

Run-Step "Admin frontend install, lint, build, audit" {
    Push-Location "$root\frontend\admin-app"
    Run-Native "npm" @("ci")
    Run-Native "npm" @("run", "lint")
    Run-Native "npm" @("run", "build")
    Run-Native "npm" @("audit", "--audit-level=moderate")
    Pop-Location
}

Run-Step "User frontend install, lint, build, audit" {
    Push-Location "$root\frontend\user-app"
    Run-Native "npm" @("ci")
    Run-Native "npm" @("run", "lint")
    Run-Native "npm" @("run", "build")
    Run-Native "npm" @("audit", "--audit-level=moderate")
    Pop-Location
}

Write-Host ""
Write-Host "Predeploy check completed."
