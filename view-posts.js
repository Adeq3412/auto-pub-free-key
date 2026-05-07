#!/usr/bin/env node

/**
 * Скрипт для вывода всех сохраненных постов
 */

const { PostStorage } = require('./storage');

const storage = new PostStorage();
const posts = storage.getAllPosts();

console.log('📊 === ИСТОРИЯ ПОСТОВ ===\n');

if (Object.keys(posts).length === 0) {
  console.log('Нет сохраненных постов');
  process.exit(0);
}

for (const [key, post] of Object.entries(posts)) {
  console.log(`ID: ${key}`);
  console.log(`Сообщество: ${post.communityKey}`);
  console.log(`Чат: ${post.chatId}`);
  console.log(`Статус: ${post.status}`);
  console.log(`Отправлен: ${post.createdAt}`);
  console.log(`Последнее обновление: ${post.lastUpdated}`);
  console.log(`Текст: ${post.text.substring(0, 50)}...`);
  console.log('---');
}

console.log(`\nВсего постов: ${Object.keys(posts).length}`);
