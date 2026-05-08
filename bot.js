const { Telegraf } = require('telegraf');
require('dotenv').config();

const { PostStorage, ConfigManager } = require('./storage');

const storage = new PostStorage();
const configManager = new ConfigManager();
const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// Middleware для проверки администратора
function isAdmin(ctx) {
  return ADMIN_USER_ID && ctx.from && ctx.from.id.toString() === ADMIN_USER_ID;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const VPN_KEY_PATTERN = /\b(?:vless|vmess|trojan|ss|ssr|hysteria|hysteria2|hy2|tuic|wireguard):\/\/[^\s<]+/gi;
const SOURCE_HEADER_PATTERN = /^\s*🎁[^\r\n]*(?:\r?\n)+♾️?\s*Безлимитный трафик(?:\r?\n)+🗓\s*Срок действия:\s*2 дня\s*(?:\r?\n)*/u;
const SOURCE_FOOTER_PATTERN = /(?:\r?\n)*💗\s*С нас ключ\s*-\s*с (?:тебя|Вас) реакция:\s*(?:\r?\n)+🔥\s*—\s*Ключи\s*-\s*(?:огонь|работают)\s*\|\s*👍—\s*(?:Спасибо|От души)\s*$/u;

function formatLinksAsCode(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(VPN_KEY_PATTERN, (match) => {
    return `<code>${match}</code>`;
  });
}

function stripSourceHeader(text) {
  return text.replace(SOURCE_HEADER_PATTERN, '').trimStart();
}

function stripSourceFooter(text) {
  return text.replace(SOURCE_FOOTER_PATTERN, '').trimEnd();
}

function buildFullMessage(config, postText) {
  let message = '';
  const bodyText = stripSourceFooter(stripSourceHeader(postText));
  
  if (config.headerText) {
    message += escapeHtml(config.headerText) + '\n\n';
  }
  
  message += formatLinksAsCode(bodyText);
  
  if (config.footerText) {
    message += '\n\n' + escapeHtml(config.footerText);
  }
  if (config.additionalLinks) {
    message += '\n' + escapeHtml(config.additionalLinks);
  }
  return message;
}

function createPendingId(chatId, messageId) {
  return `pending_${chatId}_${messageId}`;
}

function getPostText(ctx) {
  if (ctx.channelPost) {
    return ctx.channelPost.text || ctx.channelPost.caption || '';
  }
  if (ctx.message) {
    return ctx.message.text || ctx.message.caption || '';
  }
  return '';
}

async function notifyModerator(postId, sourceChatId, sourceMessageId, text) {
  if (!ADMIN_USER_ID) {
    console.warn('ADMIN_USER_ID не задан, уведомление модератора не отправлено');
    return;
  }

  const approveButton = [{ text: '✅ Одобрить', callback_data: `approve_post:${postId}` }];
  const rejectButton = [{ text: '❌ Отклонить', callback_data: `reject_post:${postId}` }];

  const message =
    `📝 Новый пост на модерации\n` +
    `ID: ${escapeHtml(postId)}\n` +
    `Источник: ${sourceChatId}\n` +
    `Сообщение: ${sourceMessageId}\n\n` +
    `${formatLinksAsCode(text)}`;

  try {
    await bot.telegram.sendMessage(ADMIN_USER_ID, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [approveButton, rejectButton]
      }
    });
  } catch (error) {
    console.error('Ошибка отправки уведомления модератору:', error.message);
  }
}

async function repostToCommunity(postId, communityKey, postText) {
  const config = configManager.getCommunityConfig(communityKey);
  if (!config || config.chatIds.length === 0) {
    return 0;
  }

  const fullMessage = buildFullMessage(config, postText);
  let count = 0;

  for (const chatId of config.chatIds) {
    try {
      const sentMessage = await bot.telegram.sendMessage(chatId, fullMessage, { parse_mode: 'HTML' });
      storage.addPost(`${postId}_${communityKey}_${sentMessage.message_id}`, {
        communityKey,
        chatId,
        messageId: sentMessage.message_id,
        text: postText,
        status: 'sent',
        sourcePostId: postId
      });
      count += 1;
    } catch (error) {
      console.error(`Ошибка при отправке в чат ${chatId}:`, error.message);
    }
  }

  return count;
}

async function checkDonorMessage(ctx) {
  const chatId = ctx.chat && ctx.chat.id ? ctx.chat.id : (ctx.channelPost && ctx.channelPost.chat && ctx.channelPost.chat.id);
  if (!chatId || !configManager.isDonorChat(chatId)) {
    return false;
  }

  const text = getPostText(ctx).trim();
  if (!text) {
    return false;
  }

  const sourceMessageId = ctx.channelPost ? ctx.channelPost.message_id : ctx.message.message_id;
  const postId = createPendingId(chatId, sourceMessageId);

  storage.addPost(postId, {
    sourceChatId: chatId,
    sourceMessageId,
    text,
    status: 'pending'
  });

  await notifyModerator(postId, chatId, sourceMessageId, text);
  return true;
}

bot.command('config', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }

  const donorIds = configManager.getDonorChatIds();
  const communities = configManager.getAllCommunities();
  let message = '⚙️ **Текущая конфигурация:**\n\n';

  message += `🧾 **Донорский канал/группа**:\n  • Chat IDs: ${donorIds.length > 0 ? donorIds.join(', ') : 'не настроены'}\n\n`;

  for (const [key, config] of Object.entries(communities)) {
    message += `🏢 **${config.name}** (${key})\n`;
    message += `  • Чаты: ${config.chatIds.length > 0 ? config.chatIds.join(', ') : 'не настроены'}\n`;
    message += `  • Подвал: ${config.footerText ? '✓' : '✗'}\n`;
    message += `  • Доп. ссылки: ${config.additionalLinks ? '✓' : '✗'}\n\n`;
  }

  ctx.reply(message, { parse_mode: 'Markdown' });
});

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

  const fullMessage = buildFullMessage(config, postText);
  let successCount = 0;
  let errorCount = 0;

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

bot.command('pending', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }

  const posts = storage.getAllPosts();
  const pending = Object.entries(posts).filter(([, post]) => post.status === 'pending');

  if (pending.length === 0) {
    return ctx.reply('✅ Нет постов на модерации');
  }

  let message = '🕐 **Посты на модерации:**\n\n';
  for (const [postId, post] of pending) {
    message += `• ID: ${postId}\n`;
    message += `  Источник: ${post.sourceChatId}, сообщение ${post.sourceMessageId}\n`;
    message += `  Текст: ${post.text.substring(0, 120)}...\n\n`;
  }

  ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => {
  const message =
    '🤖 **Справка по командам:**\n\n' +
    '/config - Показать текущую конфигурацию\n' +
    '/communities - Список всех сообществ\n' +
    '/pending - Показать посты на модерации\n' +
    '/post <community> <text> - Отправить пост вручную\n' +
    '/approve <post_id> - Одобрить пост\n' +
    '/reject <post_id> - Отклонить пост\n' +
    '/help - Эта справка\n\n' +
    '🔐 Для администраторских команд требуется прав доступа';

  ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('approve', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('📝 Использование: /approve <post_id>');
  }

  const postId = args[1];
  const post = storage.getPost(postId);
  if (!post || post.status !== 'pending') {
    return ctx.reply('❌ Пост не найден или уже обработан');
  }

  const communities = configManager.getAllCommunities();
  let total = 0;
  for (const communityKey of Object.keys(communities)) {
    total += await repostToCommunity(postId, communityKey, post.text);
  }

  storage.updatePost(postId, { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: ctx.from.id, sentCount: total });
  ctx.reply(`✅ Пост одобрен и отправлен в ${total} чатов`);
});

bot.command('reject', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ У вас нет прав для этой команды');
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('📝 Использование: /reject <post_id>');
  }

  const postId = args[1];
  const post = storage.getPost(postId);
  if (!post || post.status !== 'pending') {
    return ctx.reply('❌ Пост не найден или уже обработан');
  }

  storage.updatePost(postId, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: ctx.from.id });
  ctx.reply('❌ Пост отклонен');
});

bot.on('channel_post', async (ctx) => {
  await checkDonorMessage(ctx);
});

bot.on('message', async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith('/')) {
    return;
  }

  const processed = await checkDonorMessage(ctx);
  if (processed) {
    return;
  }
});

bot.action(/^approve_post:(.+)$/, async (ctx) => {
  if (!ctx.from || ctx.from.id.toString() !== ADMIN_USER_ID) {
    return ctx.answerCbQuery('❌ У вас нет прав');
  }

  const postId = ctx.match[1];
  const post = storage.getPost(postId);
  if (!post || post.status !== 'pending') {
    await ctx.answerCbQuery('❌ Пост уже обработан');
    return;
  }

  const communities = configManager.getAllCommunities();
  let total = 0;
  for (const communityKey of Object.keys(communities)) {
    total += await repostToCommunity(postId, communityKey, post.text);
  }

  storage.updatePost(postId, { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: ctx.from.id, sentCount: total });
  await ctx.editMessageText(`✅ Пост одобрен и отправлен в ${total} чатов`);
});

bot.action(/^reject_post:(.+)$/, async (ctx) => {
  if (!ctx.from || ctx.from.id.toString() !== ADMIN_USER_ID) {
    return ctx.answerCbQuery('❌ У вас нет прав');
  }

  const postId = ctx.match[1];
  const post = storage.getPost(postId);
  if (!post || post.status !== 'pending') {
    await ctx.answerCbQuery('❌ Пост уже обработан');
    return;
  }

  storage.updatePost(postId, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: ctx.from.id });
  await ctx.editMessageText('❌ Пост отклонен');
});

bot.on('text', (ctx) => {
  if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
    return;
  }

  if (ctx.chat && configManager.isDonorChat(ctx.chat.id)) {
    return;
  }

  ctx.reply('❓ Неизвестная команда. Используйте /help для справки');
});

bot.catch((err, ctx) => {
  console.error('❌ Ошибка бота:', err);
});

module.exports = { bot, storage, configManager };
