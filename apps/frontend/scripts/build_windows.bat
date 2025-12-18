@echo off
setlocal enabledelayedexpansion

echo [INFO] Setting up Visual Studio environment...

set "VS_DEV_CMD=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
if exist "!VS_DEV_CMD!" (
    call "!VS_DEV_CMD!" -arch=x64 -host_arch=x64 >nul 2>&1
)

:: Verify link.exe
set "LINK_FOUND=0"
where link.exe >nul 2>&1
if %errorlevel% equ 0 (
    :: Check if it is the Microsoft linker
    link.exe /? >nul 2>&1
    if !errorlevel! equ 0 (
        :: MSVC link returns 0 on /?, GNU link might properly execute or fail differently?
        :: Let's check output content for "Microsoft"
        for /f "tokens=*" %%i in ('link.exe /? 2^>^&1 ^| findstr "Microsoft"') do (
            set "LINK_FOUND=1"
        )
    )
)

if "!LINK_FOUND!"=="1" (
    echo [INFO] MSVC linker found in PATH.
    goto :BUILD
)

echo [WARN] MSVC linker not found in PATH. Searching manually...

set "MSVC_ROOT=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC"
if exist "!MSVC_ROOT!" (
    for /d %%v in ("!MSVC_ROOT!\*") do (
        set "LINK_PATH=%%v\bin\Hostx64\x64"
        if exist "!LINK_PATH!\link.exe" (
            echo [INFO] Found MSVC linker at: !LINK_PATH!
            set "PATH=!LINK_PATH!;!PATH!"
            goto :BUILD
        )
    )
)

echo [ERROR] Could not locate MSVC link.exe. Please install "Desktop development with C++" workload.
exit /b 1

:BUILD
echo [INFO] Starting Tauri build...
npm run tauri build
