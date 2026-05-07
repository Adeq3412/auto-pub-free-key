const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const CONFIG_FILE = path.join(__dirname, '.env');
const COMMUNITIES_CONFIG = require('./config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function loadEnvFile() {
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    return env;
  }
  return {};
}

function saveEnvFile(env) {
  let content = '';
  for (const [key, value] of Object.entries(env)) {
    if (value) {
      content += `${key}=${value}\n`;
    }
  }
  fs.writeFileSync(CONFIG_FILE, content);
}

async function promptForBotToken(existingEnv) {
  console.log('\n📱 === КОНФИГУРАЦИЯ TELEGRAM БОТА ===\n');
  
  if (existingEnv.BOT_TOKEN) {
    console.log(`✓ BOT_TOKEN уже установлен: ${existingEnv.BOT_TOKEN.substring(0, 10)}...`);
    const change = await question('Изменить токен? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return existingEnv.BOT_TOKEN;
    }
  }
  
  const token = await question('Введите BOT_TOKEN (получить у @BotFather): ');
  if (!token) {
    throw new Error('BOT_TOKEN не может быть пустым');
  }
  return token;
}

async function promptForAdminId(existingEnv) {
  if (existingEnv.ADMIN_USER_ID) {
    console.log(`✓ ADMIN_USER_ID уже установлен: ${existingEnv.ADMIN_USER_ID}`);
    const change = await question('Изменить? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return existingEnv.ADMIN_USER_ID;
    }
  }
  
  const adminId = await question('Введите ADMIN_USER_ID для управления ботом: ');
  return adminId;
}

async function promptForCommunity(communityKey, communityName, existingEnv) {
  const config = COMMUNITIES_CONFIG.communities[communityKey];
  
  console.log(`\n🏢 === КОНФИГУРАЦИЯ: ${communityName} ===\n`);
  
  const chatIds = existingEnv[config.chatIdsEnv];
  if (chatIds) {
    console.log(`✓ Chat IDs уже установлены: ${chatIds}`);
    const change = await question('Изменить? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return {
        chatIds,
        footerText: existingEnv[config.footerTextEnv] || '',
        helpLink: existingEnv[config.helpLinkEnv] || '',
        additionalLinks: existingEnv[config.additionalLinksEnv] || ''
      };
    }
  }
  
  const newChatIds = await question('Введите ID чатов (через запятую, например: -1001234567890,-1001234567891): ');
  const newFooterText = await question('Введите текст подвала (или нажмите Enter для стандартного): ');
  const newHelpLink = await question('Введите ссылку на инструкцию подключения: ');
  const newAdditionalLinks = await question('Введите дополнительные ссылки (или нажмите Enter для стандартных): ');
  
  return {
    chatIds: newChatIds || chatIds || '',
    footerText: newFooterText || existingEnv[config.footerTextEnv] || '',
    helpLink: newHelpLink || existingEnv[config.helpLinkEnv] || '',
    additionalLinks: newAdditionalLinks || existingEnv[config.additionalLinksEnv] || ''
  };
}

async function interactiveInstall() {
  console.log('🚀 === УСТАНОВКА/ОБНОВЛЕНИЕ TELEGRAM БОТА ===\n');
  
  const existingEnv = await loadEnvFile();
  const newEnv = { ...existingEnv };
  
  // Запрос основных параметров
  newEnv.BOT_TOKEN = await promptForBotToken(existingEnv);
  newEnv.ADMIN_USER_ID = await promptForAdminId(existingEnv);
  
  // Запрос параметров сообществ
  const setupCommunities = await question('\nЗадать параметры сообществ? (y/n): ');
  if (setupCommunities.toLowerCase() === 'y') {
    for (const [communityKey, communityData] of Object.entries(COMMUNITIES_CONFIG.communities)) {
      const config = await promptForCommunity(communityKey, communityData.name, existingEnv);
      newEnv[communityData.chatIdsEnv] = config.chatIds;
      newEnv[communityData.footerTextEnv] = config.footerText;
      newEnv[communityData.helpLinkEnv] = config.helpLink;
      newEnv[communityData.additionalLinksEnv] = config.additionalLinks;
    }
  }
  
  // Сохранение конфигурации
  saveEnvFile(newEnv);
  console.log('\n✅ Конфигурация сохранена в .env');
  
  rl.close();
}

module.exports = { interactiveInstall, loadEnvFile };
