@echo off
echo === BioLink Railway Deployment ===
echo.

cd /d "%~dp0"

echo Step 1: Creating Railway project...
railway init --name biolink
if errorlevel 1 goto error

echo.
echo Step 2: Setting environment variables...
railway variables set JWT_SECRET=xK9mP2qR8nL5vW3jY7aZ4eBcDfGhKmNpQrStUvWx NODE_ENV=production
if errorlevel 1 goto error

echo.
echo Step 3: Deploying code (this takes 2-3 minutes)...
railway up --detach
if errorlevel 1 goto error

echo.
echo === Done! ===
echo.
echo Next steps:
echo 1. Run:  railway open
echo    This opens your Railway dashboard in the browser.
echo 2. Go to Settings -^> Domains -^> Generate Domain
echo 3. Copy your URL (e.g. https://biolink-xxx.up.railway.app)
echo 4. Run:  railway variables set CLIENT_URL=https://YOUR-URL-HERE.up.railway.app
echo 5. Run:  railway up --detach
echo 6. Add a Volume (mount path: /app/server) to keep your database persistent
echo.
pause
goto end

:error
echo.
echo Something went wrong. Check the error above.
pause

:end
