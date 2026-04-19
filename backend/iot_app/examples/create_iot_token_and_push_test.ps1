param(
    [int]$DeviceId = 1,
    [string]$Label = "esp32-living-room",
    [string]$BackendBaseUrl = "http://localhost:8000",
    [double]$Value = 27.5,
    [string]$Unit = "C",
    [string]$Metric = "temperature"
)

Write-Host "Create token for device_id=$DeviceId ..."
$createBody = @{ device = $DeviceId; label = $Label } | ConvertTo-Json
$createResp = Invoke-RestMethod -Method Post -Uri "$BackendBaseUrl/api/iot/tokens/" -ContentType "application/json" -Body $createBody

Write-Host "Token created: $($createResp.token)"

$headers = @{ Authorization = "Token $($createResp.token)" }
$pushBody = @{ value = $Value; unit = $Unit; metric = $Metric } | ConvertTo-Json

Write-Host "Push one sample..."
$pushResp = Invoke-RestMethod -Method Post -Uri "$BackendBaseUrl/api/iot/push/" -Headers $headers -ContentType "application/json" -Body $pushBody
$pushResp | ConvertTo-Json -Depth 5

Write-Host "Check latest sensor data..."
Invoke-RestMethod -Method Get -Uri "$BackendBaseUrl/api/sensor-data/latest/" | ConvertTo-Json -Depth 5
