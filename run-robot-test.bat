@echo off
echo ========================================
echo  eSourcing Platform - Robot Test Runner
echo  Watch the browser test automatically!
echo ========================================
echo.

cd /d "%~dp0"

echo Starting API server...
start /B cmd /c "npm run dev --workspace=@esourcing/api > NUL 2>&1"
timeout /t 15 /nobreak > NUL

echo Starting Web server...
start /B cmd /c "npm run dev --workspace=@esourcing/web > NUL 2>&1"
timeout /t 20 /nobreak > NUL

echo.
echo ========================================
echo  Launching Robot Tests (visible browser)
echo  Watch the screen - the robot is testing!
echo ========================================
echo.

npx playwright test e2e/full-system-robot.spec.ts --headed

echo.
echo ========================================
echo  Test Complete! Opening HTML Report...
echo ========================================
npx playwright show-report

pause
