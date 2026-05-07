@echo off
REM Скрипт для быстрого запуска установки на Windows

echo 🚀 Telegram Auto Publisher Bot - Установка
echo.
echo 📦 Установка зависимостей...
call npm install

echo.
echo ⚙️ Запуск конфигурации...
node index.js --install

echo.
echo ✅ Готово! Чтобы запустить бота, используйте:
echo npm start
pause
