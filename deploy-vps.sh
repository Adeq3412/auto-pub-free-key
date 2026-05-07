#!/bin/bash
# Скрипт развертывания на VPS (Ubuntu/Debian)

echo "🚀 Развертывание Telegram Auto Publisher Bot"

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js (если не установлен)
echo "📦 Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка Git (если не установлен)
echo "📦 Установка Git..."
sudo apt install -y git

# Клонирование репозитория
echo "📥 Клонирование репозитория..."
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git bot
cd bot

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# Создание .env файла (нужно заполнить вручную)
echo "⚙️ Создание конфигурации..."
cp .env.example .env
echo "❗ Не забудьте отредактировать .env файл с вашими данными!"

# Запуск установки
echo "⚙️ Запуск интерактивной конфигурации..."
npm run install

# Создание systemd сервиса для автозапуска
echo "🔧 Создание systemd сервиса..."
sudo tee /etc/systemd/system/telegram-bot.service > /dev/null <<EOF
[Unit]
Description=Telegram Auto Publisher Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/bot
ExecStart=/usr/bin/node /home/$USER/bot/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Включение и запуск сервиса
echo "▶️ Запуск сервиса..."
sudo systemctl daemon-reload
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Проверка статуса:"
echo "sudo systemctl status telegram-bot"
echo ""
echo "📝 Просмотр логов:"
echo "sudo journalctl -u telegram-bot -f"
echo ""
echo "🔄 Перезапуск:"
echo "sudo systemctl restart telegram-bot"
