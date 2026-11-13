#!/usr/bin/env pwsh
# build-and-pack.ps1
# Fish School 版本构建脚本
# 使用：pwsh build-and-pack.ps1
# 输出：dist/fish-VERSION.tgz（用于 GitHub Release）

param()

$ErrorActionPreference = "Stop"

Write-Host "🔨 Building Fish School..." -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# 读取版本
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$VERSION = $pkg.version
Write-Host "📦 Version: $VERSION" -ForegroundColor Green

# 验证语法
Write-Host "🔍 Syntax check..." -ForegroundColor Yellow
foreach ($file in @("index.js", "lib/network.js", "lib/store.js")) {
    $result = & node --check $file 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Syntax error in $file" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ All files OK" -ForegroundColor Green

# 清理旧包
Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
New-Item "dist" -ItemType Directory -Force > $null

# 打包
Write-Host "📦 Packing..." -ForegroundColor Yellow
& npm pack --pack-destination=dist/ 2>&1 | Out-Null

# 重命名为 fish-VERSION.tgz
$tgz_src = Get-Item "dist/local-fish-school-*.tgz" | Select-Object -First 1
if (-not $tgz_src) {
    Write-Host "❌ Pack failed" -ForegroundColor Red
    exit 1
}

$tgz_dst = (Resolve-Path "dist").Path + "\fish-$VERSION.tgz"
Rename-Item -Path $tgz_src.FullName -NewName $tgz_dst

# 验证
$size = (Get-Item $tgz_dst).Length
Write-Host "✅ Built: $(Split-Path $tgz_dst -Leaf) ($([math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green

# GitHub Actions 输出
if ($env:GITHUB_OUTPUT) {
    @"
VERSION=$VERSION
TGZ_FILE=$(Split-Path $tgz_dst -Leaf)
"@ | Add-Content $env:GITHUB_OUTPUT
}

Write-Host ""
Write-Host "📍 Output: $(Resolve-Path $tgz_dst)"
