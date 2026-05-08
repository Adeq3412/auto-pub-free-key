FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install --omit=dev

# Копирование исходного кода
COPY . .

# Создание директории для данных
RUN mkdir -p /app/data

# Запуск приложения
CMD ["node", "index.js"]
