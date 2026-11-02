# =========================================================
# Douban map builder (PowerShell 5.1, ASCII-only source)
#
# For every film (name + year) in archive/*.json, resolve its Douban
# subject and freeze the data into a static table the frontend loads:
#   1) subject_suggest  -> subject id + year + poster thumbnail
#   2) rexxar v2 movie  -> rating (+ poster backup) by id
# Year is used to pick the right entry when titles collide
# (e.g. a 1983 film vs a 2026 remake sharing the same name).
#
# Why a static table instead of runtime queries:
#   Douban sends no CORS headers and blocks cross-origin fetches, so
#   the browser cannot query it directly. Freezing data at build time
#   keeps the page instant with zero extra requests.
#
# Anti-bot / throttle strategy:
#   - a `bid` cookie is mandatory (without it suggest goes empty fast)
#   - 4s spacing between requests
#   - adaptive cooldown: consecutive empty suggest results are treated
#     as throttling -> escalating sleep (60s, 120s, 240s ... capped 600s),
#     reset as soon as a request succeeds
#   - cache is flushed after EVERY item so an interrupted run
#     (orphaned process) never loses progress; reruns are incremental
#   - progress is appended to a log file so it stays observable
#     even if the launching shell times out
#
# Output:
#   douban-cache.json  - per-name suggest candidates + per-id rating
#   douban-map.js      - window.DOUBAN_MAP = { "name|year": {i,r,p} }
#     i = douban subject id  -> https://movie.douban.com/subject/{i}/
#     r = rating (string, may be empty)
#     p = poster (douban CDN url)
#
# Usage:
#   .\build-douban-map.ps1          # incremental: reuse cache
#   .\build-douban-map.ps1 -Force   # ignore cache, refresh ratings
# =========================================================
param([switch]$Force)

$ErrorActionPreference = 'Stop'
$ROOT  = Split-Path -Parent $PSScriptRoot
$CACHE = Join-Path $ROOT 'douban-cache.json'
$OUTJS = Join-Path $ROOT 'douban-map.js'
$LOG   = Join-Path $env:TEMP 'douban-build.log'
$UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
$BID   = 'fkUmsdXq'   # bid cookie: without it Douban returns empty after a few requests
$DELAY = 4000         # ms between requests (bid cookie makes this spacing sufficient)

function Write-Log([string]$msg) {
  $line = '[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $msg
  Write-Host $line
  try { Add-Content -Path $LOG -Value $line -Encoding UTF8 } catch { }
}

function Norm([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace '\s+', '').Trim().ToLower()
}

# Escalating cooldown used when Douban starts returning empty results.
$script:streak = 0
function Reset-Streak([string]$what) {
  if ($script:streak -ge 3) { Write-Log ($what + ' recovered after streak=' + $script:streak) }
  $script:streak = 0
}
function Add-Streak([string]$what) {
  $script:streak++
  if ($script:streak -ge 3) {
    $exp = $script:streak - 3
    if ($exp -gt 4) { $exp = 4 }
    $cool = 60 * [int][Math]::Pow(2, $exp)   # 60,120,240,480,960...
    if ($cool -gt 600) { $cool = 600 }       # hard cap 600s
    Write-Log ("{0}: streak={1} -> cooldown {2}s" -f $what, $script:streak, $cool)
    Start-Sleep -Seconds $cool
  }
}

function Get-Json([string]$url, [string]$referer) {
  $backoff = @(5000, 12000, 25000)
  for ($a = 0; $a -le $backoff.Count; $a++) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25 -UserAgent $UA `
           -Headers @{ Referer = $referer; Cookie = ('bid=' + $BID) }
      return $r.Content
    } catch {
      $is429 = ($_.Exception.Message -match '429')
      if (-not $is429) { throw }
      if ($a -ge $backoff.Count) { throw }
      Start-Sleep -Milliseconds $backoff[$a]
    }
  }
  throw 'retry exhausted'
}

function Get-Suggest([string]$q) {
  $u = 'https://movie.douban.com/j/subject_suggest?q=' + [uri]::EscapeDataString($q)
  foreach ($try in 1..2) {
    try {
      $c = Get-Json $u 'https://movie.douban.com/'
      $arr = $c | ConvertFrom-Json
      $out = @()
      foreach ($it in $arr) {
        if ($it.type -and $it.type -ne 'movie') { continue }
        if (-not $it.id) { continue }
        $out += [pscustomobject]@{
          id    = [string]$it.id
          title = [string]$it.title
          year  = [string]$it.year
          img   = [string]$it.img
        }
      }
      if (@($out).Count -gt 0) { return , $out }
      if ($try -eq 2) { return , @() }      # still empty after retry: throttle or not indexed
      Start-Sleep -Milliseconds 15000       # empty may be transient throttle: wait, retry
    } catch {
      if ($try -eq 2) { throw }
      Start-Sleep -Milliseconds 15000
    }
  }
  return , @()
}

function Get-Rexxar([string]$id) {
  $u = 'https://m.douban.com/rexxar/api/v2/movie/' + $id
  $c = Get-Json $u ('https://m.douban.com/movie/subject/' + $id + '/')
  $j = $c | ConvertFrom-Json
  $rating = ''
  if ($j.rating -and $j.rating.value) { $rating = [string]$j.rating.value }
  $pic = ''
  if ($j.pic -and $j.pic.normal) { $pic = [string]$j.pic.normal }
  elseif ($j.cover_url) { $pic = [string]$j.cover_url }
  return [pscustomobject]@{ rating = $rating; pic = $pic }
}

# ---------- 1. collect films from archive ----------
$films = @{}           # "norm|year" -> @{name=;year=}
$nameByNorm = @{}      # norm -> original display name
Get-ChildItem -Path (Join-Path $ROOT 'archive') -Filter '*.json' | ForEach-Object {
  $j = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($r in $j.records) {
    $name = [string]$r.name
    $year = [string]$r.year
    if (-not $name) { continue }
    $nn = Norm $name
    $key = $nn + '|' + $year
    if (-not $films.ContainsKey($key)) { $films[$key] = @{ name = $name; year = $year } }
    if (-not $nameByNorm.ContainsKey($nn)) { $nameByNorm[$nn] = $name }
  }
}
if ($films.Count -eq 0) { Write-Error 'no film data under archive/'; exit 1 }

$yearsByName = @{}
foreach ($k in $films.Keys) {
  $nn = ($k -split '\|')[0]
  $yy = $films[$k].year
  if (-not $yearsByName.ContainsKey($nn)) { $yearsByName[$nn] = @() }
  if ($yearsByName[$nn] -notcontains $yy) { $yearsByName[$nn] += $yy }
}
Write-Log ("films={0} (unique names={1})" -f $films.Count, $yearsByName.Count)

# ---------- 2. load / init cache ----------
$data = @{ names = @{}; rt = @{} }
if (-not $Force -and (Test-Path $CACHE)) {
  try {
    $o = Get-Content $CACHE -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $o.names.PSObject.Properties) { $data.names[$p.Name] = @($p.Value) }
    foreach ($p in $o.rt.PSObject.Properties)   { $data.rt[$p.Name]   = $p.Value }
    Write-Log ("cache loaded: names={0} ratings={1}" -f $data.names.Count, $data.rt.Count)
  } catch { Write-Log 'cache unreadable, rebuilding'; $data = @{ names = @{}; rt = @{} } }
}

function Save-Cache {
  $json = $data | ConvertTo-Json -Compress -Depth 8
  [System.IO.File]::WriteAllText($CACHE, $json, (New-Object System.Text.UTF8Encoding($false)))
}

# ---------- 3. Phase A: suggest search per unique name ----------
$names = @($yearsByName.Keys)
$idx = 0; $fetched = 0; $empty = 0
foreach ($nn in $names) {
  $idx++
  $hasCands = $data.names.ContainsKey($nn) -and (@($data.names[$nn]).Count -gt 0)
  if (-not $hasCands) {
    $dn = $nameByNorm[$nn]
    try {
      $c = Get-Suggest $dn
      $data.names[$nn] = @($c)
      $n = @($c).Count
      Save-Cache                       # flush every item: interrupted runs keep progress
      if ($n -gt 0) {
        $fetched++
        Reset-Streak 'suggest'
        Write-Log ("[{0}/{1}] suggest {2} -> {3}" -f $idx, $names.Count, $dn, $n)
      } else {
        $empty++
        Add-Streak 'suggest'
        Write-Log ("[{0}/{1}] suggest {2} -> 0" -f $idx, $names.Count, $dn)
      }
    } catch {
      Save-Cache
      Write-Log ("[{0}/{1}] suggest {2} FAILED: {3}" -f $idx, $names.Count, $dn, $_.Exception.Message)
      Add-Streak 'suggest-error'
    }
  }
  Start-Sleep -Milliseconds $DELAY
}
Save-Cache
Write-Log ("phase A done: fetched={0} empty={1} cached={2}" -f $fetched, $empty, $data.names.Count)

# ---------- 4. Phase B: pick by year, enrich rating via rexxar ----------
$pickByKey = @{}
$needIds = @()
foreach ($k in $films.Keys) {
  $nn = ($k -split '\|')[0]
  $yr = $films[$k].year
  $dn = $films[$k].name
  $cands = @()
  if ($data.names.ContainsKey($nn)) { $cands = @($data.names[$nn]) }
  $pick = $null
  if ($cands.Count -gt 0) {
    $exact = @($cands | Where-Object { $_.year -eq $yr })
    if ($exact.Count -gt 0) {
      $same = @($exact | Where-Object { (Norm $_.title) -eq (Norm $dn) })
      if ($same.Count -gt 0) { $pick = $same[0] } else { $pick = $exact[0] }
    } else { $pick = $cands[0] }
  }
  $pickByKey[$k] = $pick
  if ($pick) {
    $id = $pick.id
    if (-not $data.rt.ContainsKey($id) -and ($needIds -notcontains $id)) { $needIds += $id }
  }
}
Write-Log ("to enrich via rexxar: {0} ids" -f $needIds.Count)
$idx = 0; $rtOk = 0
foreach ($id in $needIds) {
  $idx++
  try {
    $rt = Get-Rexxar $id
    $data.rt[$id] = $rt
    $rtOk++
    Reset-Streak 'rexxar'
    Write-Log ("[{0}/{1}] rexxar {2} -> rating={3}" -f $idx, $needIds.Count, $id, $rt.rating)
  } catch {
    Write-Log ("[{0}/{1}] rexxar {2} FAILED: {3}" -f $idx, $needIds.Count, $id, $_.Exception.Message)
    Add-Streak 'rexxar-error'
  }
  Save-Cache
  Start-Sleep -Milliseconds $DELAY
}
Save-Cache
Write-Log ("phase B done: rt={0}/{1}" -f $rtOk, $needIds.Count)

# ---------- 5. derive map ----------
$map = [ordered]@{}
$hit = 0; $miss = 0
foreach ($k in $films.Keys) {
  $nn = ($k -split '\|')[0]
  $pick = $pickByKey[$k]
  if ($pick) {
    $id = $pick.id
    $r = ''
    $p = $pick.img                       # suggest gives douban poster thumbnail
    if ($data.rt.ContainsKey($id)) {
      $rt = $data.rt[$id]
      if ($rt.rating) { $r = [string]$rt.rating }
      if ($rt.pic) { $p = [string]$rt.pic }
    }
    $map[$k] = @{ i = $id; r = [string]$r; p = [string]$p }
    $hit++
    if ($yearsByName[$nn].Count -eq 1 -and -not $map.Contains($nn)) { $map[$nn] = $map[$k] }
  } else { $miss++ }
}

# ---------- 6. write douban-map.js ----------
$json = $map | ConvertTo-Json -Compress -Depth 5
$js = "// auto-generated by scripts/build-douban-map.ps1 (do not edit)`r`n" +
      "// source: douban suggest + rexxar; key = normName|year, i=id r=rating p=poster`r`n" +
      "// hit=$hit miss=$miss generated=$(Get-Date -Format 'yyyy-MM-dd HH:mm')`r`n" +
      "window.DOUBAN_MAP=$json;`r`n"
[System.IO.File]::WriteAllText($OUTJS, $js, (New-Object System.Text.UTF8Encoding($false)))

# ---------- 7. cache posters locally (browser ORB blocks douban CDN images) ----------
# Frontend loads assets/posters/<id>.jpg first; missing/failed files fall back to
# the douban CDN URL then the CFA poster in the frontend fallback chain.
$PDIR = Join-Path $ROOT (Join-Path 'assets' 'posters')
if (-not (Test-Path $PDIR)) { New-Item -ItemType Directory -Path $PDIR -Force | Out-Null }
$dlOk = 0; $dlSkip = 0; $dlFail = 0
$uniqIds = @{}
foreach ($k in $map.Keys) { $id = [string]$map[$k].i; if ($id -and -not $uniqIds.ContainsKey($id)) { $uniqIds[$id] = [string]$map[$k].p } }
foreach ($id in $uniqIds.Keys) {
  $f = Join-Path $PDIR ($id + '.jpg')
  if ((Test-Path $f) -and ((Get-Item $f).Length -gt 5000)) { $dlSkip++; continue }
  $u = $uniqIds[$id]
  if (-not $u) { $dlFail++; continue }
  try {
    Invoke-WebRequest -Uri $u -OutFile $f -UseBasicParsing -TimeoutSec 25 -UserAgent $UA -Headers @{ Referer = 'https://movie.douban.com/' }
    if ((Get-Item $f).Length -gt 5000) { $dlOk++ } else { Remove-Item $f -Force; $dlFail++ }
  } catch {
    if (Test-Path $f) { Remove-Item $f -Force }
    $dlFail++
    Write-Log ("poster {0} download FAILED: {1}" -f $id, $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 400
}
Write-Log ("posters: new={0} cached={1} failed={2} -> {3}" -f $dlOk, $dlSkip, $dlFail, $PDIR)

Write-Log ("BUILD_DONE hit={0} miss={1} -> {2}" -f $hit, $miss, $OUTJS)
if ($miss -gt 0) { Write-Log 'miss = no douban subject found; frontend keeps CFA poster and links to douban search.' }
