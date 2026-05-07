#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { bot, storage, configManager } = require('./bot');
const { interactiveInstall } = require('./installer');

const ENV_FILE = path.join(__dirname, '.env');
const VERSION_FILE = path.join(__dirname, '.version');

const CURRENT_VERSION = '1.0.0';

async function checkVersionAndInstall() {
  let installedVersion = null;
  
  if (fs.existsSync(VERSION_FILE)) {
    installedVersion = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
  }
  
  const isFirstRun = !fs.existsSync(ENV_FILE);
  const isUpdate = installedVersion && installedVersion !== CURRENT_VERSION;
  
  if (isFirstRun) {
    console.log('🎉 Первый запуск. Начинаем установку...\n');
    await interactiveInstall();
  } else if (isUpdate) {
    console.log(`📦 Обнаружено обновление: ${installedVersion} → ${CURRENT_VERSION}\n`);
    console.log('Пожалуйста, проверьте обновленные параметры конфигурации.\n');
    await interactiveInstall();
  } else if (process.argv.includes('--install')) {
    console.log('🔧 Переустановка конфигурации...\n');
    await interactiveInstall();
  }
  
  // Сохраняем текущую версию
  fs.writeFileSync(VERSION_FILE, CURRENT_VERSION);
}

async function startBot() {
  try {
    if (!process.env.BOT_TOKEN) {
      throw new Error('BOT_TOKEN не установлен. Запустите с флагом --install');
    }
    
    if (!configManager.isConfigured()) {
      console.warn('⚠️警告: сообщества не настроены. Запустите с флагом --install');
    }
    
    console.log('🚀 Запуск Telegram бота...');
    console.log(`✓ Bot token: ${process.env.BOT_TOKEN.substring(0, 10)}...`);
    console.log(`✓ Сообщества настроены: ${Object.keys(configManager.getAllCommunities()).length}`);
    
    bot.launch();
    
    console.log('✅ Бот запущен и готов к работе!');
    console.log('📝 Используйте команду /help для справки\n');
    
    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Ошибка при запуске:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    await checkVersionAndInstall();
    if (!process.argv.includes('--install')) {
      await startBot();
    } else {
      console.log('\n✅ Установка завершена. Теперь вы можете запустить бота командой: npm start');
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();
