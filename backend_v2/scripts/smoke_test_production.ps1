param(
    [string]$BASE_URL = "https://clockly-api.fly.dev",
    [string]$Origin = "https://app.clockly.es",
    [switch]$RunWriteTests,
    [switch]$RunCleanup,
    [string]$SmokeRunId,
    [string]$FlyApp = "clockly-api"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SmokeRunId)) {
    $SmokeRunId = "smoke_" + (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
}

function Invoke-SmokeCleanup {
    param([string]$RunId, [string]$AppName)
    if ([string]::IsNullOrWhiteSpace($RunId)) {
        throw "SmokeRunId is required for cleanup."
    }

    $command = "python scripts/cleanup_smoke_data.py --smoke-run-id $RunId --confirm"
    Write-Output "Running cleanup for SmokeRunId=$RunId on Fly app $AppName"
    $output = & fly ssh console -a $AppName --command $command 2>&1
    $exitCode = $LASTEXITCODE
    $output | ForEach-Object { Write-Output $_ }
    $outputText = ($output | Out-String)
    if ($exitCode -ne 0 -and $outputText -notmatch "SMOKE_CLEANUP_OK") {
        throw "Smoke cleanup failed with exit code $exitCode."
    }
}

if ($RunCleanup) {
    Invoke-SmokeCleanup -RunId $SmokeRunId -AppName $FlyApp
    return
}

$Results = New-Object System.Collections.Generic.List[object]
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Join-Url {
    param([string]$Base, [string]$Path)
    return $Base.TrimEnd("/") + "/" + $Path.TrimStart("/")
}

function Shorten {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }
    $singleLine = ($Value -replace "\s+", " ").Trim()
    if ($singleLine.Length -le 140) {
        return $singleLine
    }
    return $singleLine.Substring(0, 140) + "..."
}

function Add-Result {
    param(
        [string]$Test,
        [string]$Url,
        [string]$Expected,
        [string]$Actual,
        [bool]$Passed,
        [string]$Note = ""
    )
    $Results.Add([pscustomobject]@{
        Test = $Test
        URL = $Url
        Expected = $Expected
        Actual = $Actual
        Result = if ($Passed) { "PASS" } else { "FAIL" }
        Note = $Note
    })
}

function Invoke-SmokeRequest {
    param(
        [string]$Test,
        [string]$Method,
        [string]$Path,
        [int[]]$ExpectedStatus,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [bool]$UseSession = $false
    )

    $url = Join-Url $BASE_URL $Path
    $params = @{
        Uri = $url
        Method = $Method
        Headers = $Headers
        UseBasicParsing = $true
        ErrorAction = "Stop"
    }
    if ($UseSession) {
        $params.WebSession = $Session
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }

    try {
        $response = Invoke-WebRequest @params
        $status = [int]$response.StatusCode
        $content = $response.Content
        $headersOut = $response.Headers
    } catch {
        if ($_.Exception.Response -eq $null) {
            Add-Result $Test $url ($ExpectedStatus -join "/") "REQUEST_ERROR" $false $_.Exception.Message
            return $null
        }
        $response = $_.Exception.Response
        $status = [int]$response.StatusCode
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $content = $reader.ReadToEnd()
        $headersOut = $response.Headers
    }

    $passed = $ExpectedStatus -contains $status
    Add-Result $Test $url ($ExpectedStatus -join "/") $status $passed (Shorten $content)
    return [pscustomobject]@{
        Status = $status
        Content = $content
        Headers = $headersOut
    }
}

function Assert-Header {
    param(
        [string]$Test,
        [string]$Url,
        [object]$Headers,
        [string]$Name,
        [string]$ExpectedContains
    )
    $actual = ""
    if ($Headers -ne $null -and $Headers[$Name]) {
        $actual = [string]$Headers[$Name]
    }
    $passed = $actual -like "*$ExpectedContains*"
    Add-Result $Test $Url $ExpectedContains $actual $passed
}

Write-Output "SmokeRunId=$SmokeRunId"

$health = Invoke-SmokeRequest "health" "GET" "/health" @(200)
Invoke-SmokeRequest "docs disabled in production" "GET" "/docs" @(404) | Out-Null
Invoke-SmokeRequest "openapi disabled in production" "GET" "/openapi.json" @(404) | Out-Null
Invoke-SmokeRequest "public plans" "GET" "/plans" @(200) | Out-Null
Invoke-SmokeRequest "protected auth/me without token" "GET" "/auth/me" @(401) | Out-Null
Invoke-SmokeRequest "protected employees without token" "GET" "/employees" @(401) | Out-Null
Invoke-SmokeRequest "protected billing checkout without token" "POST" "/billing/checkout" @(401) @{} @{ plan_type = "pro" } | Out-Null
Invoke-SmokeRequest "stripe webhook rejects unsigned payload" "POST" "/billing/webhook" @(409) @{} @{} | Out-Null

$corsHeaders = @{
    Origin = $Origin
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "content-type"
}
$cors = Invoke-SmokeRequest "cors preflight auth/login" "OPTIONS" "/auth/login" @(200) $corsHeaders
if ($cors -ne $null) {
    Assert-Header "cors allow origin" (Join-Url $BASE_URL "/auth/login") $cors.Headers "Access-Control-Allow-Origin" $Origin
    Assert-Header "cors allow credentials" (Join-Url $BASE_URL "/auth/login") $cors.Headers "Access-Control-Allow-Credentials" "true"
}

if ($health -ne $null) {
    $healthUrl = Join-Url $BASE_URL "/health"
    Assert-Header "security hsts" $healthUrl $health.Headers "Strict-Transport-Security" "max-age="
    Assert-Header "security nosniff" $healthUrl $health.Headers "X-Content-Type-Options" "nosniff"
    Assert-Header "security frame deny" $healthUrl $health.Headers "X-Frame-Options" "DENY"
    Assert-Header "security csp" $healthUrl $health.Headers "Content-Security-Policy" "default-src 'none'"
    Assert-Header "security referrer policy" $healthUrl $health.Headers "Referrer-Policy" "strict-origin-when-cross-origin"
    Assert-Header "security permissions policy" $healthUrl $health.Headers "Permissions-Policy" "camera=()"
}

if ($RunWriteTests) {
    $email = "clockly-smoke-$SmokeRunId@example.invalid"
    $password = "ClockLySmoke-$SmokeRunId!"

    $registerBody = @{
        company_name = "ClockLy Smoke $SmokeRunId"
        owner_email = $email
        owner_full_name = "ClockLy Smoke Owner $SmokeRunId"
        password = $password
        timezone = "Europe/Madrid"
        plan_type = "free"
    }
    $registration = Invoke-SmokeRequest "register test company" "POST" "/auth/register-company" @(200) @{ Origin = $Origin } $registerBody $true
    if ($registration -ne $null -and $registration.Status -eq 200) {
        Invoke-SmokeRequest "auth/me with session" "GET" "/auth/me" @(200) @{} $null $true | Out-Null
        $employeeBody = @{
            first_name = "Smoke"
            last_name = $SmokeRunId
            role_title = "QA"
            pin = "1234"
        }
        $employee = Invoke-SmokeRequest "create employee" "POST" "/employees" @(201) @{ Origin = $Origin } $employeeBody $true
        Invoke-SmokeRequest "list employees with session" "GET" "/employees" @(200) @{} $null $true | Out-Null
        if ($employee -ne $null -and $employee.Status -eq 201) {
            $employeeData = $employee.Content | ConvertFrom-Json
            $clockInBody = @{
                employee_id = $employeeData.id
                method = "web"
                notes = "Production smoke test $SmokeRunId"
            }
            $clockIn = Invoke-SmokeRequest "attendance clock-in" "POST" "/attendance/clock-in" @(201) @{ Origin = $Origin } $clockInBody $true
            if ($clockIn -ne $null -and $clockIn.Status -eq 201) {
                $sessionData = $clockIn.Content | ConvertFrom-Json
                $clockOutBody = @{
                    session_id = $sessionData.id
                    method = "web"
                    notes = "Production smoke cleanup $SmokeRunId"
                }
                Invoke-SmokeRequest "attendance clock-out" "POST" "/attendance/clock-out" @(200) @{ Origin = $Origin } $clockOutBody $true | Out-Null
            }
        }
        Invoke-SmokeRequest "billing checkout test" "POST" "/billing/checkout" @(200) @{ Origin = $Origin } @{ plan_type = "pro" } $true | Out-Null
        Invoke-SmokeRequest "logout after register" "POST" "/auth/logout" @(200) @{ Origin = $Origin } $null $true | Out-Null

        $LoginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $script:Session = $LoginSession
        Invoke-SmokeRequest "login created owner" "POST" "/auth/login" @(200) @{ Origin = $Origin } @{ email = $email; password = $password } $true | Out-Null
        Invoke-SmokeRequest "refresh created owner" "POST" "/auth/refresh" @(200) @{ Origin = $Origin } $null $true | Out-Null
        Invoke-SmokeRequest "logout after login" "POST" "/auth/logout" @(200) @{ Origin = $Origin } $null $true | Out-Null
    }
} else {
    Add-Result "write flows" $BASE_URL "Run with -RunWriteTests" "SKIPPED" $true "Registration, employee create, attendance and billing are opt-in."
}

$Results | Format-Table -AutoSize -Wrap

$failures = @($Results | Where-Object { $_.Result -eq "FAIL" })
if ($failures.Count -gt 0) {
    exit 1
}
