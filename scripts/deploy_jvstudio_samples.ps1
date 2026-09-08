param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,

    [Parameter(Mandatory = $true)]
    [string]$UserName,

    [ValidateRange(1, 65535)]
    [int]$Port = 22,

    [string]$RemoteRoot = "/opt/containers/josicovila-com/data/jvstudio-instruments",

    [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$libraryRoot = Join-Path $repositoryRoot "apps/jvstudio/public/instruments"
$catalogPath = Join-Path $libraryRoot "catalog.json"
$catalog = Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json

$sampleCount = 0
$sampleBytes = [int64]0

foreach ($manifestEntry in $catalog.manifests) {
    $manifestPath = Join-Path $libraryRoot $manifestEntry
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $manifestDirectory = Split-Path -Parent $manifestPath
    foreach ($sample in $manifest.samples) {
        $samplePath = Join-Path $manifestDirectory $sample.file
        if (-not (Test-Path -LiteralPath $samplePath -PathType Leaf)) {
            throw "Missing sample declared by $manifestEntry`: $($sample.file)"
        }

        $file = Get-Item -LiteralPath $samplePath
        if ($file.Length -ne [int64]$sample.bytes) {
            throw "Byte-size mismatch for $($sample.file)"
        }

        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $samplePath).Hash.ToLowerInvariant()
        if ($actualHash -ne $sample.sha256.ToLowerInvariant()) {
            throw "SHA-256 mismatch for $($sample.file)"
        }

        $sampleCount += 1
        $sampleBytes += $file.Length
    }

}

$archiveName = "jvstudio-samples-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')).tar"
$archivePath = Join-Path ([IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$destination = "$UserName@$HostName"

try {
    Write-Host "Verified $sampleCount samples ($([Math]::Round($sampleBytes / 1MB, 2)) MiB)."
    if ($ValidateOnly) { return }

    & tar -C $libraryRoot -cf $archivePath .
    if ($LASTEXITCODE -ne 0) { throw "Could not create the sample archive." }

    & scp -P $Port $archivePath "${destination}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw "SCP transfer failed." }

    $remoteCommand = "set -e; mkdir -p '$RemoteRoot'; tar -xf '$remoteArchive' -C '$RemoteRoot'; rm -f '$remoteArchive'"
    & ssh -p $Port $destination $remoteCommand
    if ($LASTEXITCODE -ne 0) { throw "Remote extraction failed." }

    Write-Host "JV Studio instrument library deployed to ${destination}:$RemoteRoot"
}
finally {
    Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
}
