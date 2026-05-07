const fs = require('fs');
const path = require('path');
require('dotenv').config();

const STORAGE_FILE = path.join(__dirname, 'posts.json');
const COMMUNITIES_CONFIG = require('./config.json');

class PostStorage {
  constructor() {
    this.posts = this.loadPosts();
  }
  
  loadPosts() {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(content || '{}');
    }
    return {};
  }
  
  savePosts() {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.posts, null, 2));
  }
  
  addPost(postId, data) {
    this.posts[postId] = {
      ...data,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    this.savePosts();
  }
  
  getPost(postId) {
    return this.posts[postId];
  }
  
  updatePost(postId, data) {
    if (this.posts[postId]) {
      this.posts[postId] = {
        ...this.posts[postId],
        ...data,
        lastUpdated: new Date().toISOString()
      };
      this.savePosts();
      return true;
    }
    return false;
  }
  
  getAllPosts() {
    return this.posts;
  }
}

class ConfigManager {
  constructor() {
    this.communityConfigs = {};
    this.donorChatIds = [];
    this.loadConfigurations();
  }
  
  loadConfigurations() {
    if (COMMUNITIES_CONFIG.donor) {
      this.donorChatIds = (process.env[COMMUNITIES_CONFIG.donor.chatIdsEnv] || '').split(',').filter(id => id.trim());
    }

    for (const [communityKey, communityData] of Object.entries(COMMUNITIES_CONFIG.communities)) {
      const chatIds = (process.env[communityData.chatIdsEnv] || '').split(',').filter(id => id.trim());
      const headerText = process.env[communityData.headerTextEnv] || '';
      const footerText = process.env[communityData.footerTextEnv] || '';
      const helpLink = process.env[communityData.helpLinkEnv] || '';
      const additionalLinks = process.env[communityData.additionalLinksEnv] || '';
      
      this.communityConfigs[communityKey] = {
        name: communityData.name,
        chatIds,
        headerText,
        footerText,
        helpLink,
        additionalLinks
      };
    }
  }
  
  getCommunityConfig(communityKey) {
    return this.communityConfigs[communityKey];
  }
  
  getAllCommunities() {
    return this.communityConfigs;
  }
  
  getDonorChatIds() {
    return this.donorChatIds;
  }
  
  isDonorChat(chatId) {
    return this.donorChatIds.some(id => id.toString() === chatId.toString());
  }
  
  isConfigured() {
    return this.getDonorChatIds().length > 0 || Object.values(this.communityConfigs).some(config => config.chatIds.length > 0);
  }
}

module.exports = { PostStorage, ConfigManager };
