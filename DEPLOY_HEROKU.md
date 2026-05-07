# 🚀 Развертывание на Heroku

## Шаг 1: Установка Heroku CLI

### Windows:
```bash
# Скачать с https://devcenter.heroku.com/articles/heroku-cli
# Или через Chocolatey:
choco install heroku-cli
```

### Linux/Mac:
```bash
# Через Snap:
sudo snap install --classic heroku

# Или через Homebrew (Mac):
brew install heroku/brew/heroku
```

## Шаг 2: Авторизация

```bash
heroku login
```

## Шаг 3: Создание приложения

```bash
# В папке проекта
cd "c:\projects\auto pub free key"
heroku create your-app-name --region eu
```

## Шаг 4: Настройка переменных окружения

```bash
# Через Heroku CLI
heroku config:set BOT_TOKEN=your_bot_token_here
heroku config:set ADMIN_USER_ID=your_admin_id_here
heroku config:set MAIN_CHAT_IDS=-1001234567890,-1001234567891
heroku config:set MAIN_FOOTER_TEXT="💗 С нас ключ - с тебя реакция:\n🔥 — Ключи - огонь | 👍— Спасибо"
heroku config:set MAIN_HELP_LINK=https://t.me/stretten/8
heroku config:set MAIN_ADDITIONAL_LINKS="✅ Премиум VPN (https://t.me/vpngranitbot)\n💬 Бесплатные прокси для Telegram (https://t.me/stretten/123)\n💫 Купить Telegram Stars (https://t.me/strettenstars_bot)\n🚀 Забустить (https://t.me/boost/stretten)"

# Для INCY сообщества
heroku config:set INCY_CHAT_IDS=-1001234567892
heroku config:set INCY_FOOTER_TEXT="💗 С нас ключ - с Вас реакция:\n🔥 — Ключи - работают | 👍— От души"
heroku config:set INCY_HELP_LINK=https://t.me/free_incy/5
heroku config:set INCY_ADDITIONAL_LINKS="✅ Премиум VPN (https://t.me/vpngranitbot)\n💬 Бесплатные прокси для Telegram (https://t.me/stretten/123)\n💫 Купить Telegram Stars (https://t.me/strettenstars_bot)\n🚀 Забустить (https://t.me/boost/stretten)"
```

## Шаг 5: Деплой

```bash
# Добавить изменения в git
git add .
git commit -m "Deploy to Heroku"

# Отправить на Heroku
git push heroku main
```

## Шаг 6: Проверка

```bash
# Посмотреть логи
heroku logs --tail

# Проверить статус
heroku ps
```

## Шаг 7: Управление

```bash
# Перезапуск
heroku restart

# Масштабирование (бесплатный план поддерживает только 1 dyno)
heroku ps:scale web=1

# Просмотр переменных окружения
heroku config

# Обновление
git push heroku main
```

## ⚠️ Важные замечания

1. **Бесплатный план Heroku** выключает приложение после 30 минут бездействия
2. **Переменные окружения** нужно настроить в Dashboard Heroku или через CLI
3. **Логи** доступны через `heroku logs`
4. **Обновления** делаются через git push

## 🔧 Альтернативы

Если Heroku не подходит:
- **Railway** - https://railway.app (похож на Heroku)
- **Render** - https://render.com (хороший бесплатный план)
- **VPS** - DigitalOcean, Vultr, Hetzner (используйте deploy-vps.sh)
