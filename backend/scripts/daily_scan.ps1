# 공실 후보 탐색을 매일 이어서 돌린다. Windows 작업 스케줄러가 호출한다.
# 이미 탐색이 돌고 있으면 건너뛴다. 로그는 backend/data/scan-날짜.log에 쌓는다.
$backend = Split-Path -Parent $PSScriptRoot
$python = Join-Path $backend ".venv\Scripts\python.exe"
$logDir = Join-Path $backend "data"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("scan-" + (Get-Date -Format "yyyyMMdd") + ".log")

$running = Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -match "find_vacancies" }
if ($running) {
    Add-Content $log "$(Get-Date -Format s) 이미 탐색이 돌고 있어 건너뜁니다."
    exit 0
}

$env:PYTHONIOENCODING = "utf-8"
Set-Location $backend
Add-Content $log "$(Get-Date -Format s) 탐색을 시작합니다."
& $python -u -m scripts.find_vacancies --lat 37.5445 --lng 127.0560 --span-km 20 --daily-limit 9000 *>> $log
Add-Content $log "$(Get-Date -Format s) 탐색을 마쳤습니다."
