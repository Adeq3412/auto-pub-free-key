#!/usr/bin/env node

/**
 * Утилита для просмотра текущей конфигурации
 */

const { ConfigManager } = require('./storage');

const configManager = new ConfigManager();
const communities = configManager.getAllCommunities();

console.log('⚙️ === ТЕКУЩАЯ КОНФИГУРАЦИЯ ===\n');

for (const [key, config] of Object.entries(communities)) {
  console.log(`🏢 ${config.name} (${key})`);
  console.log(`   Чаты: ${config.chatIds.length > 0 ? config.chatIds.join(', ') : 'не настроены'}`);
  console.log(`   Подвал: ${config.footerText ? '✓ ' + config.footerText.substring(0, 30) + '...' : '✗'}`);
  console.log(`   Ссылка помощи: ${config.helpLink || '✗'}`);
  console.log(`   Дополнительные ссылки: ${config.additionalLinks ? '✓' : '✗'}`);
  console.log();
}

console.log(`✓ Всего сообществ: ${Object.keys(communities).length}`);
console.log(`✓ Сообществ с чатами: ${Object.values(communities).filter(c => c.chatIds.length > 0).length}`);
