const { Telegraf } = require('telegraf');
require('dotenv').config();

const { PostStorage, ConfigManager } = require('./storage');

const storage = new PostStorage();
const configManager = new ConfigManager();
const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const MODERATION_ENABLED = !['0', 'false', 'no', 'off'].includes((process.env.MODERATION_ENABLED || 'true').toLowerCase());
const AUTO_DELETE_JOIN_MESSAGES = ['1', 'true', 'yes', 'on'].includes((process.env.AUTO_DELETE_JOIN_MESSAGES || 'false').toLowerCase());
const AUTO_DELETE_JOIN_MESSAGES_DELAY_MS = Number(process.env.AUTO_DELETE_JOIN_MESSAGES_DELAY_MS || 0);

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
const SOURCE_TRAILER_PATTERN = /(?:\r?\n)*💗\s*С нас ключ\s*-\s*с (?:тебя|Вас) реакция:\s*(?:\r?\n)+🔥\s*—\s*Ключи\s*-\s*(?:огонь|работают)\s*\|\s*👍—\s*(?:Спасибо|От души)[\s\S]*$/u;

function formatLinksAsCode(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(VPN_KEY_PATTERN, (match) => {
    return `<code>${match}</code>`;
  });
}

function formatRichText(text) {
  const placeholders = [];
  const textWithPlaceholders = text.replace(/<tg-emoji\s+emoji-id="(\d+)">([\s\S]*?)<\/tg-emoji>/g, (match, emojiId, fallback) => {
    const index = placeholders.length;
    placeholders.push(`<tg-emoji emoji-id="${emojiId}">${escapeHtml(fallback)}</tg-emoji>`);
    return `__TG_EMOJI_${index}__`;
  });

  let escaped = escapeHtml(textWithPlaceholders);
  placeholders.forEach((placeholder, index) => {
    escaped = escaped.replace(`__TG_EMOJI_${index}__`, placeholder);
  });

  return escaped;
}

function formatTextLinks(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(.+?)\s*\((https?:\/\/[^)\s]+)\)\s*$/);
      if (!match) {
        return formatRichText(line);
      }

      const label = match[1].trim();
      const customEmojiMatch = label.match(/^(<tg-emoji\s+emoji-id="\d+">[\s\S]*?<\/tg-emoji>)\s*(.+)$/);
      if (customEmojiMatch) {
        return `${formatRichText(customEmojiMatch[1])} <a href="${escapeHtml(match[2])}">${formatRichText(customEmojiMatch[2])}</a>`;
      }

      return `<a href="${escapeHtml(match[2])}">${formatRichText(label)}</a>`;
    })
    .join('\n');
}

function stripSourceHeader(text) {
  return text.replace(SOURCE_HEADER_PATTERN, '').trimStart();
}

function stripSourceTrailer(text) {
  return text.replace(SOURCE_TRAILER_PATTERN, '').trimEnd();
}

function buildFullMessage(config, postText) {
  let message = '';
  const bodyText = stripSourceTrailer(stripSourceHeader(postText));
  
  if (config.headerText) {
    message += escapeHtml(config.headerText) + '\n\n';
  }
  
  message += formatLinksAsCode(bodyText);
  
  if (config.footerText) {
    message += '\n\n' + escapeHtml(config.footerText);
  }
  if (config.additionalLinks) {
    message += '\n\n' + formatTextLinks(config.additionalLinks);
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

function getIncomingMessage(ctx) {
  return ctx.channelPost || ctx.message || null;
}

function isPaidIncomingMessage(ctx) {
  const message = getIncomingMessage(ctx);
  if (!message) {
    return false;
  }

  return Boolean(message.is_paid_post || (Array.isArray(message.paid_media) && message.paid_media.length > 0));
}

function getCustomEmojiEntities(message) {
  const text = message.text || message.caption || '';
  const entities = message.entities || message.caption_entities || [];

  return entities
    .filter((entity) => entity.type === 'custom_emoji' && entity.custom_emoji_id)
    .map((entity) => ({
      fallback: text.substring(entity.offset, entity.offset + entity.length),
      id: entity.custom_emoji_id
    }));
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

async function approvePostForAllCommunities(postId, postText, approvedBy) {
  const communities = configManager.getAllCommunities();
  let total = 0;

  for (const communityKey of Object.keys(communities)) {
    total += await repostToCommunity(postId, communityKey, postText);
  }

  storage.updatePost(postId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy,
    sentCount: total
  });

  return total;
}

async function checkDonorMessage(ctx) {
  const chatId = ctx.chat && ctx.chat.id ? ctx.chat.id : (ctx.channelPost && ctx.channelPost.chat && ctx.channelPost.chat.id);
  if (!chatId || !configManager.isDonorChat(chatId)) {
    return false;
  }

  if (isPaidIncomingMessage(ctx)) {
    if (ADMIN_USER_ID) {
      const message = getIncomingMessage(ctx);
      const sourceMessageId = message && message.message_id ? message.message_id : 'unknown';
      await bot.telegram.sendMessage(
        ADMIN_USER_ID,
        `⚠️ Пропущен платный пост из донора\nИсточник: ${chatId}\nСообщение: ${sourceMessageId}`
      );
    }
    return true;
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
    status: MODERATION_ENABLED ? 'pending' : 'auto_approving'
  });

  if (!MODERATION_ENABLED) {
    const total = await approvePostForAllCommunities(postId, text, 'auto');
    if (ADMIN_USER_ID) {
      await bot.telegram.sendMessage(
        ADMIN_USER_ID,
        `✅ Пост автоодобрен и отправлен в ${total} чатов\nID: ${escapeHtml(postId)}`,
        { parse_mode: 'HTML' }
      );
    }
    return true;
  }

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
    '/emoji_ids - Показать ID custom emoji из reply-сообщения\n' +
    '/approve <post_id> - Одобрить пост\n' +
    '/reject <post_id> - Отклонить пост\n' +
    '/help - Эта справка\n\n' +
    '🔐 Для администраторских команд требуется прав доступа';

  ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('emoji_ids', (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('вќЊ РЈ РІР°СЃ РЅРµС‚ РїСЂР°РІ РґР»СЏ СЌС‚РѕР№ РєРѕРјР°РЅРґС‹');
  }

  const repliedMessage = ctx.message && ctx.message.reply_to_message;
  if (!repliedMessage) {
    return ctx.reply('Reply to a message with custom emoji and send /emoji_ids');
  }

  const customEmojiEntities = getCustomEmojiEntities(repliedMessage);
  if (customEmojiEntities.length === 0) {
    return ctx.reply('No custom emoji entities found in the replied message.');
  }

  const message = customEmojiEntities
    .map(({ fallback, id }) => `<tg-emoji emoji-id="${id}">${escapeHtml(fallback)}</tg-emoji> emoji-id=${id}`)
    .join('\n');

  ctx.reply(message, { parse_mode: 'HTML' });
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

  const total = await approvePostForAllCommunities(postId, post.text, ctx.from.id);
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
  const hasJoinNotice = ctx.message && Array.isArray(ctx.message.new_chat_members) && ctx.message.new_chat_members.length > 0;
  const hasLeftNotice = ctx.message && ctx.message.left_chat_member;

  if (AUTO_DELETE_JOIN_MESSAGES && (hasJoinNotice || hasLeftNotice)) {
    const chatId = ctx.chat && ctx.chat.id;
    const messageId = ctx.message.message_id;

    if (chatId && messageId) {
      try {
        if (AUTO_DELETE_JOIN_MESSAGES_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, AUTO_DELETE_JOIN_MESSAGES_DELAY_MS));
        }
        await bot.telegram.deleteMessage(chatId, messageId);
      } catch (error) {
        console.error('Ошибка удаления сообщения о вступлении:', error.message);
      }
    }
    return;
  }

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

  const total = await approvePostForAllCommunities(postId, post.text, ctx.from.id);
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
