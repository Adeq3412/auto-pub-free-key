# 🐳 Развертывание с Docker

## Шаг 1: Установка Docker

### Windows:
```bash
# Скачать Docker Desktop с https://www.docker.com/products/docker-desktop
# Запустить установщик
```

### Linux (Ubuntu/Debian):
```bash
# Обновление пакетов
sudo apt update

# Установка Docker
sudo apt install -y docker.io docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Перезагрузка (или перезапуск сессии)
newgrp docker
```

## Шаг 2: Клонирование и настройка

```bash
# Клонирование репозитория
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git bot
cd bot

# Создание .env файла
cp .env.example .env
# Отредактируйте .env файл с вашими данными
```

## Шаг 3: Первый запуск (интерактивная настройка)

```bash
# Запуск в интерактивном режиме для настройки
docker run --rm -it -v $(pwd):/app -w /app node:18-alpine sh -c "npm install && npm run install"
```

## Шаг 4: Запуск с Docker Compose

```bash
# Сборка и запуск
docker-compose up -d --build

# Или отдельно:
# docker-compose build
# docker-compose up -d
```

## Шаг 5: Проверка работы

```bash
# Просмотр логов
docker-compose logs -f telegram-bot

# Проверка статуса
docker-compose ps

# Остановка
docker-compose down

# Перезапуск
docker-compose restart
```

## 🔧 Управление контейнером

```bash
# Вход в контейнер
docker-compose exec telegram-bot sh

# Просмотр файлов в контейнере
docker-compose exec telegram-bot ls -la

# Остановка и удаление
docker-compose down -v  # удалить также volumes
```

## 📊 Мониторинг

```bash
# Логи в реальном времени
docker-compose logs -f

# Логи за последний час
docker-compose logs --since 1h

# Статистика использования ресурсов
docker stats
```

## 🔄 Обновление

```bash
# Остановка
docker-compose down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose up -d --build
```

## ⚙️ Настройка переменных окружения

Все переменные настраиваются в файле `.env`:

```env
BOT_TOKEN=your_bot_token
ADMIN_USER_ID=your_admin_id
MAIN_CHAT_IDS=-1001234567890,-1001234567891
# ... остальные переменные
```

## 🛡️ Безопасность

- **Не коммитите .env файл** в git (он в .gitignore)
- **Используйте strong пароли** для всех сервисов
- **Регулярно обновляйте** Docker образы

## 🚀 Продвинутое использование

### Запуск на VPS с Docker

```bash
# На сервере
sudo apt update
sudo apt install -y docker.io docker-compose git

# Клонирование
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Настройка .env
cp .env.example .env
nano .env  # заполнить данные

# Запуск
docker-compose up -d --build
```

### Автозапуск при загрузке системы

```bash
# Создание systemd сервиса
sudo nano /etc/systemd/system/docker-telegram-bot.service

# Содержимое файла:
[Unit]
Description=Docker Telegram Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/your/project
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target

# Включение сервиса
sudo systemctl enable docker-telegram-bot
```

## 🔧 Устранение неполадок

### Контейнер не запускается
```bash
# Проверить логи
docker-compose logs

# Проверить переменные окружения
docker-compose exec telegram-bot env
```

### Проблемы с правами
```bash
# На Linux добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### Очистка Docker
```bash
# Остановить все контейнеры
docker-compose down

# Очистить неиспользуемые ресурсы
docker system prune -a --volumes
```
