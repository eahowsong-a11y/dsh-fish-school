#!/usr/bin/env pwsh
# update-local.ps1
# Fish School 本地更新脚本
# 使用：.\update-local.ps1 或 .\update-local.ps1 -Version "1.4.0"

param([string]$Version = "latest")

$ErrorActionPreference = "Stop"

$profileDir = "$env:USERPROFILE\.dsh\profiles\desktop"
$tgzFile = "C:\harper\fish.tgz"
$repo = "eahowsong-a11y/dsh-fish-school"

Write-Host "🐟 Fish School Update" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# 检查前置条件
if (-not (Test-Path $profileDir)) {
    Write-Host "❌ Profile not found: $profileDir" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm not found" -ForegroundColor Red
    exit 1
}

# 获取版本信息
Write-Host "🔍 Fetching releases..."
try {
    $releases = Invoke-RestMethod "https://api.github.com/repos/$repo/releases" -TimeoutSec 10
    if ($Version -eq "latest") {
        $rel = $releases[0]
        $Version = $rel.tag_name -replace '^v', ''
    } else {
        $rel = $releases | Where-Object { $_.tag_name -eq "v$Version" }
        if (-not $rel) {
            Write-Host "❌ Version not found" -ForegroundColor Red
            exit 1
        }
    }
    
    $asset = $rel.assets | Where-Object { $_.name -like "fish-*.tgz" }
    if (-not $asset) {
        Write-Host "❌ No tarball found" -ForegroundColor Red
        exit 1
    }
    
    $url = $asset.browser_download_url
}
catch {
    Write-Host "❌ Failed to fetch: $_" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Version: v$Version" -ForegroundColor Green
Write-Host ""

# 下载
Write-Host "⬇️  Downloading..."
try {
    Invoke-WebRequest $url -OutFile $tgzFile -TimeoutSec 30 -ErrorAction Stop
    Write-Host "✅ Downloaded" -ForegroundColor Green
}
catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    exit 1
}

# 验证
$magic = [System.IO.File]::ReadAllBytes($tgzFile)[0..1]
if ($magic[0] -ne 0x1f -or $magic[1] -ne 0x8b) {
    Write-Host "❌ Invalid tarball" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Verified" -ForegroundColor Green
Write-Host ""

# 安装
Write-Host "📦 Installing..."
Push-Location $profileDir
& pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "✅ Update complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next: Refresh DSH (Ctrl+R) or restart plugin" -ForegroundColor Yellow
