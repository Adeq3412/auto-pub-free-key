# 🚀 Развертывание из приватного GitHub репозитория

## ✅ Что уже сделано

Проект уже инициализирован как git репозиторий и готов к загрузке на GitHub.

## 📋 Шаги для развертывания

### Шаг 1: Создание приватного репозитория на GitHub

1. Перейдите на [GitHub.com](https://github.com)
2. Нажмите **"New repository"**
3. Укажите:
   - **Repository name**: `telegram-auto-publisher-bot` (или любое другое)
   - **Description**: `Telegram bot for auto-publishing VPN keys to multiple communities`
   - **Visibility**: `Private` ✅
4. **НЕ** добавляйте README, .gitignore, license (они уже есть)
5. Нажмите **"Create repository"**

### Шаг 2: Загрузка проекта на GitHub

```bash
# В папке проекта
cd "c:\projects\auto pub free key"

# Проверить статус git
git status

# Если нужно, добавить файлы
git add .

# Сделать коммит (если есть изменения)
git commit -m "Update: Add deployment files"

# Добавить remote origin (замените YOUR_USERNAME и YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Или изменить существующий remote
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Отправить на GitHub
git push -u origin main
```

### Шаг 3: Настройка аутентификации GitHub

Если push не удался, настройте аутентификацию:

#### Вариант A: Personal Access Token (рекомендуется)
```bash
# Создать токен: GitHub → Settings → Developer settings → Personal access tokens
# Выбрать scopes: repo, workflow

# Использовать токен в URL
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

#### Вариант B: SSH ключ
```bash
# Сгенерировать SSH ключ
ssh-keygen -t ed25519 -C "your_email@example.com"

# Добавить публичный ключ в GitHub: Settings → SSH and GPG keys

# Изменить remote на SSH
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 🌐 Варианты развертывания

### 🚀 Вариант 1: Локальный запуск

```bash
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Установить зависимости
npm install

# Запустить интерактивную настройку
npm run install

# Запустить бота
npm start
```

### 🐳 Вариант 2: Docker (рекомендуется)

```bash
# Клонировать
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Создать .env файл
cp .env.example .env
# Отредактировать .env с вашими данными

# Запустить с Docker Compose
docker-compose up -d --build

# Проверить логи
docker-compose logs -f
```

### ☁️ Вариант 3: Heroku

```bash
# Установить Heroku CLI
# heroku login

# Клонировать
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Создать Heroku приложение
heroku create your-app-name --region eu

# Настроить переменные окружения
heroku config:set BOT_TOKEN=your_bot_token
heroku config:set ADMIN_USER_ID=your_admin_id
# ... остальные переменные

# Деплой
git push heroku main

# Проверить
heroku logs --tail
```

### 🖥️ Вариант 4: VPS (Ubuntu/Debian)

```bash
# На сервере
sudo apt update
sudo apt install -y git nodejs npm

# Клонировать
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Установить зависимости
npm install

# Запустить настройку
npm run install

# Запустить бота
npm start

# Или использовать systemd для автозапуска
sudo cp deploy-vps.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/deploy-vps.sh
sudo /usr/local/bin/deploy-vps.sh
```

## 🔧 Управление развертыванием

### Обновление кода

```bash
# Локально
git pull origin main
npm restart

# Docker
docker-compose pull
docker-compose up -d --build

# Heroku
git push heroku main

# VPS
cd /path/to/project
git pull origin main
sudo systemctl restart telegram-bot
```

### Мониторинг

```bash
# Docker
docker-compose logs -f telegram-bot

# Heroku
heroku logs --tail

# VPS
sudo journalctl -u telegram-bot -f
```

## 🔐 Безопасность

- **Никогда не коммитите .env файл** (он в .gitignore)
- **Используйте приватный репозиторий** для чувствительных данных
- **Регулярно обновляйте токены** и пароли
- **Ограничьте доступ** к репозиторию только необходимым людям

## 📚 Документация

- **README.md** - основная информация
- **GETTING_STARTED.md** - руководство быстрого старта
- **DEPLOY_DOCKER.md** - развертывание с Docker
- **DEPLOY_HEROKU.md** - развертывание на Heroku
- **ARCHITECTURE.md** - архитектура проекта

## 🎯 Рекомендации

1. **Для тестирования**: используйте Docker локально
2. **Для продакшена**: VPS или Heroku
3. **Для команды**: Docker с docker-compose
4. **Для CI/CD**: GitHub Actions с автоматическим деплоем

## ❓ Проблемы и решения

### "Repository not found"
- Проверьте правильность URL репозитория
- Убедитесь что репозиторий существует и доступен

### "Permission denied"
- Настройте аутентификацию (Personal Access Token или SSH)

### "Port already in use"
- Измените порт в настройках или остановите другие процессы

### Бот не отвечает
- Проверьте BOT_TOKEN
- Убедитесь что бот добавлен в группы
- Проверьте логи приложения

---

**🚀 Проект готов к развертыванию из приватного репозитория!**
