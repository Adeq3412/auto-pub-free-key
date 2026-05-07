const { Telegraf } = require('telegraf');
require('dotenv').config();

const { PostStorage, ConfigManager } = require('./storage');

const storage = new PostStorage();
const configManager = new ConfigManager();
const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// Middleware для проверки администратора
function isAdmin(ctx) {
  return !ADMIN_USER_ID || ctx.from.id.toString() === ADMIN_USER_ID;
}

// Команда для просмотра текущей конфигурации
bot.command('config', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }
  
  const communities = configManager.getAllCommunities();
  let message = '⚙️ **Текущая конфигурация:**\n\n';
  
  for (const [key, config] of Object.entries(communities)) {
    message += `🏢 **${config.name}** (${key})\n`;
    message += `  • Чаты: ${config.chatIds.length > 0 ? config.chatIds.join(', ') : 'не настроены'}\n`;
    message += `  • Подвал: ${config.footerText ? '✓' : '✗'}\n`;
    message += `  • Ссылка помощи: ${config.helpLink ? '✓' : '✗'}\n\n`;
  }
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Команда для отправки поста
bot.command('post', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply(
      '📝 **Использование:** /post <community_key> <post_text>\n\n' +
      'Пример: /post main Текст поста с ключами\n\n' +
      'Доступные сообщества: ' + Object.keys(configManager.getAllCommunities()).join(', '),
      { parse_mode: 'Markdown' }
    );
  }
  
  const communityKey = args[1].toLowerCase();
  const postText = args.slice(2).join(' ');
  
  const config = configManager.getCommunityConfig(communityKey);
  if (!config) {
    return ctx.reply(`❌ Сообщество "${communityKey}" не найдено`);
  }
  
  if (config.chatIds.length === 0) {
    return ctx.reply(`❌ Для сообщества "${communityKey}" не настроены ID чатов`);
  }
  
  // Формирование полного текста поста с подвалом
  let fullMessage = postText;
  if (config.footerText) {
    fullMessage += '\n\n' + config.footerText;
  }
  if (config.helpLink) {
    fullMessage += `\n🆘 Как подключить (${config.helpLink})`;
  }
  if (config.additionalLinks) {
    fullMessage += '\n' + config.additionalLinks;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Отправка во все чаты сообщества
  for (const chatId of config.chatIds) {
    try {
      const sentMessage = await bot.telegram.sendMessage(chatId, fullMessage, { parse_mode: 'HTML' });
      storage.addPost(`${communityKey}_${sentMessage.message_id}`, {
        communityKey,
        chatId,
        messageId: sentMessage.message_id,
        text: postText,
        status: 'sent'
      });
      successCount++;
    } catch (error) {
      console.error(`Ошибка при отправке в чат ${chatId}:`, error.message);
      errorCount++;
    }
  }
  
  ctx.reply(
    `✅ Пост отправлен!\n\n` +
    `📊 Результаты:\n` +
    `  ✓ Успешно: ${successCount}\n` +
    `  ✗ Ошибок: ${errorCount}`
  );
});

// Команда для вывода всех сообществ
bot.command('communities', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }
  
  const communities = configManager.getAllCommunities();
  let message = '🏢 **Доступные сообщества:**\n\n';
  
  for (const [key, config] of Object.entries(communities)) {
    message += `• **${config.name}** - ${key}\n`;
  }
  
  message += '\n📝 Используйте `/post <ключ> <текст>` для отправки поста';
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Команда справки
bot.command('help', (ctx) => {
  const message = 
    '🤖 **Справка по командам:**\n\n' +
    '/config - Показать текущую конфигурацию\n' +
    '/communities - Список всех сообществ\n' +
    '/post <community> <text> - Отправить пост\n' +
    '/help - Эта справка\n\n' +
    '🔐 Для администраторских команд требуется прав доступа';
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Обработка неизвестных команд
bot.on('text', (ctx) => {
  ctx.reply('❓ Неизвестная команда. Используйте /help для справки');
});

// Обработчик ошибок
bot.catch((err, ctx) => {
  console.error('❌ Ошибка бота:', err);
});

module.exports = { bot, storage, configManager };
