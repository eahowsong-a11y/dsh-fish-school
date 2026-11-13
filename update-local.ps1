#!/usr/bin/env pwsh
# update-local.ps1
# Fish School 更新脚本（两种模式）
#
#   标准模式（默认）：下载 release 的 tgz → pnpm install → 需要重启 DSH
#     .\update-local.ps1
#     .\update-local.ps1 -Version "1.4.0"
#
#   热更新模式：把 tgz 里的文件直接覆盖进已安装目录 → 只需在设置里重载插件，不用重启 DSH
#     .\update-local.ps1 -Hot
#
# 说明：标准模式会改变包所在目录，DSH 会报 "package-moved" 并要求重启；
#       热更新模式保持目录不变，因此可以只重载插件。数据目录不受影响。

param(
    [string]$Version = "latest",
    [switch]$Hot
)

$ErrorActionPreference = "Stop"

$profileDir = "$env:USERPROFILE\.dsh\profiles\desktop"
$pluginDir = Join-Path $profileDir "node_modules\@local\fish-school"
$tgzFile = "C:\harper\fish.tgz"
$repo = "eahowsong-a11y/dsh-fish-school"

Write-Host "🐟 Fish School Update ($(if ($Hot) { 'hot' } else { 'standard' }))" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if (-not (Test-Path $profileDir)) {
    Write-Host "❌ Profile not found: $profileDir" -ForegroundColor Red
    exit 1
}

# pnpm 只在标准模式需要
if (-not $Hot -and -not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm not found in PATH" -ForegroundColor Red
    exit 1
}

# ---------- 定位要下载的包 ----------
$downloadUrl = $null
if ($Version -eq "latest") {
    Write-Host "🔍 Resolving latest release..."
    try {
        $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -TimeoutSec 15
        $Version = $rel.tag_name -replace '^v', ''
        $asset = $rel.assets | Where-Object { $_.name -like "fish-*.tgz" } | Select-Object -First 1
        if ($asset) { $downloadUrl = $asset.browser_download_url }
    } catch {
        Write-Host "⚠️  Cannot reach GitHub releases: $_" -ForegroundColor Yellow
    }
} else {
    try {
        $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/tags/v$Version" -TimeoutSec 15
        $asset = $rel.assets | Where-Object { $_.name -like "fish-*.tgz" } | Select-Object -First 1
        if ($asset) { $downloadUrl = $asset.browser_download_url }
    } catch {
        Write-Host "⚠️  Cannot reach GitHub release v${Version}: $_" -ForegroundColor Yellow
    }
}

# 没有 release 时，回退到本地仓库自行打包
if (-not $downloadUrl) {
    $localRepo = "C:\harper\dsh-fish-school"
    if (Test-Path (Join-Path $localRepo "build-and-pack.ps1")) {
        Write-Host "📦 No release asset; building from $localRepo" -ForegroundColor Yellow
        Push-Location $localRepo
        try {
            & pwsh -NoProfile -File "build-and-pack.ps1" | Out-Null
            $built = Get-ChildItem "dist\fish-*.tgz" | Sort-Object LastWriteTime -Desc | Select-Object -First 1
            if (-not $built) { throw "build produced no tarball" }
            Copy-Item $built.FullName $tgzFile -Force
            $Version = ($built.BaseName -replace '^fish-', '')
        } finally { Pop-Location }
        Write-Host "✅ Using local build v$Version" -ForegroundColor Green
    } else {
        Write-Host "❌ No release asset and no local repo to build from" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⬇️  Downloading v$Version ..."
    Invoke-WebRequest $downloadUrl -OutFile $tgzFile -TimeoutSec 60
    Write-Host "✅ Downloaded $(Split-Path $tgzFile -Leaf)" -ForegroundColor Green
}

# ---------- 校验 ----------
$magic = [System.IO.File]::ReadAllBytes($tgzFile)[0..1]
if ($magic[0] -ne 0x1f -or $magic[1] -ne 0x8b) {
    Write-Host "❌ $tgzFile is not a valid gzip tarball" -ForegroundColor Red
    exit 1
}

# ---------- 热更新：直接覆盖已安装目录 ----------
if ($Hot) {
    if (-not (Test-Path $pluginDir)) {
        Write-Host "❌ Plugin not installed yet: $pluginDir" -ForegroundColor Red
        Write-Host "   Run the standard mode once first."
        exit 1
    }

    $stage = Join-Path $env:TEMP "fish-school-hot-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    New-Item $stage -ItemType Directory -Force > $null
    try {
        & tar -xzf $tgzFile -C $stage
        if ($LASTEXITCODE -ne 0) { throw "tar failed" }
        $src = Join-Path $stage "package"
        if (-not (Test-Path $src)) { throw "tarball has no package/ directory" }

        Write-Host "📁 Overwriting $pluginDir ..."
        Copy-Item (Join-Path $src "*") $pluginDir -Recurse -Force

        $newVersion = (Get-Content (Join-Path $pluginDir "package.json") -Raw | ConvertFrom-Json).version
        Write-Host "✅ In place: v$newVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Hot update failed: $_" -ForegroundColor Red
        exit 1
    }
    finally { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }

    Write-Host ""
    Write-Host "👉 不需要重启 DSH。请在 设置 → 插件 里对 fish-school 关闭再打开（或刷新页面）。" -ForegroundColor Yellow
    exit 0
}

# ---------- 标准模式：pnpm install ----------
Write-Host "📦 pnpm install ..."
Push-Location $profileDir
try {
    & pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "pnpm install exited $LASTEXITCODE" }
} catch {
    Write-Host "❌ Install failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally { Pop-Location }

if (Test-Path (Join-Path $pluginDir "package.json")) {
    $installed = (Get-Content (Join-Path $pluginDir "package.json") -Raw | ConvertFrom-Json).version
    Write-Host "✅ Installed: v$installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "⚠️  必须重启 DeepSeek Harness 才会生效。" -ForegroundColor Yellow
Write-Host "   DSH 会提示 restart-required (package-moved)：包的解压目录换了，进程内无法热替换。"
Write-Host "   仅刷新页面不够。想免重启请改用热更新模式：.\update-local.ps1 -Hot"
