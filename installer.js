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
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }

  const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
  const env = {};

  content.split('\n').forEach((line) => {
    if (!line || line.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = line.split('=');
    env[key.trim()] = valueParts.join('=').trim();
  });

  return env;
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
  console.log('\n=== Telegram bot config ===\n');

  if (existingEnv.BOT_TOKEN) {
    console.log(`BOT_TOKEN already set: ${existingEnv.BOT_TOKEN.substring(0, 10)}...`);
    const change = await question('Change token? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return existingEnv.BOT_TOKEN;
    }
  }

  const token = await question('Enter BOT_TOKEN from @BotFather: ');
  if (!token) {
    throw new Error('BOT_TOKEN cannot be empty');
  }

  return token;
}

async function promptForAdminId(existingEnv) {
  if (existingEnv.ADMIN_USER_ID) {
    console.log(`ADMIN_USER_ID already set: ${existingEnv.ADMIN_USER_ID}`);
    const change = await question('Change admin id? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return existingEnv.ADMIN_USER_ID;
    }
  }

  return question('Enter ADMIN_USER_ID: ');
}

async function promptForDonor(existingEnv) {
  if (!COMMUNITIES_CONFIG.donor) {
    return '';
  }

  const donorEnvKey = COMMUNITIES_CONFIG.donor.chatIdsEnv;
  const existingValue = existingEnv[donorEnvKey];

  console.log('\n=== Donor chat/channel ===\n');
  if (existingValue) {
    console.log(`${donorEnvKey} already set: ${existingValue}`);
    const change = await question('Change donor chat ids? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return existingValue;
    }
  }

  const newChatIds = await question('Enter donor chat/channel IDs, comma separated: ');
  return newChatIds || existingValue || '';
}

async function promptForCommunity(communityKey, communityName, existingEnv) {
  const config = COMMUNITIES_CONFIG.communities[communityKey];
  const chatIds = existingEnv[config.chatIdsEnv];

  console.log(`\n=== Community: ${communityName} (${communityKey}) ===\n`);

  if (chatIds) {
    console.log(`${config.chatIdsEnv} already set: ${chatIds}`);
    const change = await question('Change this community? (y/n): ');
    if (change.toLowerCase() !== 'y') {
      return {
        chatIds,
        headerText: existingEnv[config.headerTextEnv] || '',
        footerText: existingEnv[config.footerTextEnv] || '',
        additionalLinks: existingEnv[config.additionalLinksEnv] || ''
      };
    }
  }

  const newChatIds = await question('Enter target chat/channel IDs, comma separated: ');
  const newHeaderText = await question('Enter header text: ');
  const newFooterText = await question('Enter footer text: ');
  const newAdditionalLinks = await question('Enter additional links: ');

  return {
    chatIds: newChatIds || chatIds || '',
    headerText: newHeaderText || existingEnv[config.headerTextEnv] || '',
    footerText: newFooterText || existingEnv[config.footerTextEnv] || '',
    additionalLinks: newAdditionalLinks || existingEnv[config.additionalLinksEnv] || ''
  };
}

async function interactiveInstall() {
  console.log('=== Telegram bot install/update ===\n');

  const existingEnv = await loadEnvFile();
  const newEnv = { ...existingEnv };

  newEnv.BOT_TOKEN = await promptForBotToken(existingEnv);
  newEnv.ADMIN_USER_ID = await promptForAdminId(existingEnv);
  newEnv[COMMUNITIES_CONFIG.donor.chatIdsEnv] = await promptForDonor(existingEnv);

  const setupCommunities = await question('\nSet community parameters? (y/n): ');
  if (setupCommunities.toLowerCase() === 'y') {
    for (const [communityKey, communityData] of Object.entries(COMMUNITIES_CONFIG.communities)) {
      const communityConfig = await promptForCommunity(communityKey, communityData.name, existingEnv);
      newEnv[communityData.chatIdsEnv] = communityConfig.chatIds;
      newEnv[communityData.headerTextEnv] = communityConfig.headerText;
      newEnv[communityData.footerTextEnv] = communityConfig.footerText;
      newEnv[communityData.additionalLinksEnv] = communityConfig.additionalLinks;
    }
  }

  saveEnvFile(newEnv);
  console.log('\nConfig saved to .env');

  rl.close();
}

module.exports = { interactiveInstall, loadEnvFile };
