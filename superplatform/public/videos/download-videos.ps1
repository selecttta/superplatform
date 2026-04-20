# SuperPlatform Hero Video Downloader
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File ".\public\videos\download-videos.ps1"

$outputDir = Join-Path $PSScriptRoot ""
$ProgressPreference = 'SilentlyContinue'

Write-Host "SuperPlatform - Hero Video Downloader" -ForegroundColor Cyan

$videos = @(
    @{ name="welcome";       urls=@("https://assets.mixkit.co/videos/preview/mixkit-group-of-people-walking-along-a-busy-street-1399-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-people-walking-in-a-busy-commercial-street-4419-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Showreel.mp4") },
    @{ name="transport";     urls=@("https://assets.mixkit.co/videos/preview/mixkit-man-getting-into-a-taxi-3138-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-city-traffic-at-night-1547-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-taxi-driving-in-the-city-3-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4") },
    @{ name="home-services"; urls=@("https://assets.mixkit.co/videos/preview/mixkit-plumber-fixing-the-sink-4291-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-worker-installing-floor-tiles-4451-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-carpenter-working-on-wood-4479-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4") },
    @{ name="beauty";        urls=@("https://assets.mixkit.co/videos/preview/mixkit-woman-dyeing-her-hair-at-the-hairdresser-3286-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-hairdresser-cutting-hair-of-client-4435-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-makeup-artist-applying-eyeshadow-on-a-model-4065-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4") },
    @{ name="health";        urls=@("https://assets.mixkit.co/videos/preview/mixkit-doctor-talking-to-a-patient-4289-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-doctor-doing-a-consultation-with-a-patient-4385-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-nurse-checking-the-vitals-of-a-patient-4383-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4") },
    @{ name="ecommerce";     urls=@("https://assets.mixkit.co/videos/preview/mixkit-woman-shopping-online-at-home-4047-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-delivery-man-dropping-off-a-package-at-a-home-31-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-woman-buying-online-with-a-credit-card-21-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4") },
    @{ name="real-estate";   urls=@("https://assets.mixkit.co/videos/preview/mixkit-real-estate-agent-showing-house-to-a-couple-4450-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-couple-looking-at-a-house-for-sale-4453-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-modern-house-with-pool-exterior-30-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4") },
    @{ name="rentals";       urls=@("https://assets.mixkit.co/videos/preview/mixkit-car-keys-being-handed-to-a-customer-4388-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-man-unlocking-a-car-4433-large.mp4","https://assets.mixkit.co/videos/preview/mixkit-driving-a-car-through-a-city-4370-large.mp4","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4") }
)

$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    "Referer"    = "https://mixkit.co/"
}

$ok = 0
foreach ($v in $videos) {
    $out = Join-Path $outputDir "$($v.name).mp4"
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 100000) {
        Write-Host "[SKIP] $($v.name).mp4 already exists" -ForegroundColor DarkGray
        $ok++; continue
    }
    Write-Host "[....] $($v.name).mp4" -ForegroundColor Yellow
    $done = $false
    foreach ($url in $v.urls) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $out -Headers $headers -TimeoutSec 60 -ErrorAction Stop
            $sz = (Get-Item $out).Length
            if ($sz -gt 50000) {
                Write-Host "[ OK ] $($v.name).mp4  ($([math]::Round($sz/1MB,2)) MB)" -ForegroundColor Green
                $done = $true; $ok++; break
            }
            Remove-Item $out -Force -ErrorAction SilentlyContinue
        } catch {
            Remove-Item $out -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $done) { Write-Host "[FAIL] $($v.name).mp4 - all sources failed" -ForegroundColor Red }
}

Write-Host ""
Write-Host "Done: $ok / $($videos.Count) videos downloaded to: $outputDir" -ForegroundColor Cyan
Write-Host "Restart your dev server (npm start) to see the videos." -ForegroundColor Cyan
