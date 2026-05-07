#!/usr/bin/env node

/**
 * Скрипт для быстрого добавления нового сообщества без переустановки всей конфигурации
 * Использование: node add-community.js <key> <name>
 * Пример: node add-community.js newcommunity "My Community"
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function addCommunityToConfig(communityKey, communityName) {
  try {
    let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    
    if (config.communities[communityKey]) {
      console.log(`❌ Сообщество "${communityKey}" уже существует`);
      return false;
    }
    
    const envKeyPrefix = communityKey.toUpperCase();
    
    config.communities[communityKey] = {
      name: communityName,
      chatIdsEnv: `${envKeyPrefix}_CHAT_IDS`,
      footerTextEnv: `${envKeyPrefix}_FOOTER_TEXT`,
      helpLinkEnv: `${envKeyPrefix}_HELP_LINK`,
      additionalLinksEnv: `${envKeyPrefix}_ADDITIONAL_LINKS`
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    console.log(`✅ Сообщество "${communityKey}" добавлено!\n`);
    console.log(`Добавьте следующие переменные в .env файл:\n`);
    console.log(`${envKeyPrefix}_CHAT_IDS=`);
    console.log(`${envKeyPrefix}_FOOTER_TEXT=`);
    console.log(`${envKeyPrefix}_HELP_LINK=`);
    console.log(`${envKeyPrefix}_ADDITIONAL_LINKS=\n`);
    console.log(`Затем запустите установку: node index.js --install`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('📝 Использование: node add-community.js <key> <name>\n');
  console.log('Пример: node add-community.js newcommunity "My Community"');
  process.exit(1);
}

addCommunityToConfig(args[0], args[1]);
