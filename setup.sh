#!/bin/bash
# Скрипт для быстрого запуска установки на Linux/Mac

echo "🚀 Telegram Auto Publisher Bot - Установка"
echo ""
echo "📦 Установка зависимостей..."
npm install

echo ""
echo "⚙️ Запуск конфигурации..."
node index.js --install

echo ""
echo "✅ Готово! Чтобы запустить бота, используйте:"
echo "npm start"
