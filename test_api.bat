@echo off
cd /d D:\Agent\backend

echo === STEP 1: Login ===
for /f "tokens=*" %%a in ('curl.exe -s -X POST "http://localhost:8080/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"faiz@test.com\",\"password\":\"Test1234!\"}"') do set RESP=%%a
echo %RESP%

echo === STEP 2: List niches ===
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTdlYjU4Ny0wMDNmLTQ0YWYtYjI5Yi1kYzRmY2MxOTZmYzMiLCJleHAiOjE3Nzk5MjE3NDgsInR5cGUiOiJhY2Nlc3MifQ.OTVKO7cVOVj3StC-O5aTfxIWJU0MHi83v9mJzGclIQI
curl.exe -s -X GET "http://localhost:8080/api/v1/niches/" -H "Authorization: Bearer %TOKEN%"

echo === STEP 3: Agent status ===
curl.exe -s -X GET "http://localhost:8080/api/v1/agent/status" -H "Authorization: Bearer %TOKEN%"

echo.
echo === DONE ===
pause
