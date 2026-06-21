<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">🤖 AI 助手</h2>
      <button @click="handleNewConversation" class="new-chat-btn">
        <span class="icon">+</span>
        <span>新对话</span>
      </button>
    </div>

    <div class="conversation-list">
      <div
        v-for="conv in sortedConversations"
        :key="conv.id"
        class="conversation-item"
        :class="{ active: conv.id === currentConversationId }"
        @click="handleSelectConversation(conv.id)"
      >
        <div class="conversation-icon">💬</div>
        <div class="conversation-info">
          <span class="conversation-title">{{ conv.title }}</span>
          <span class="conversation-time">{{ formatTime(conv.updatedAt) }}</span>
        </div>
        <button
          @click.stop="handleDeleteConversation(conv.id)"
          class="delete-btn"
          title="删除对话"
        >
          ×
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="model-selector">
        <label>模型:</label>
        <select v-model="selectedModel" @change="handleModelChange">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
    </div>
  </aside>
</template>

<script setup>import { ref, computed } from 'vue';
import { useConversations } from '../composables/useConversations';
const { conversations, currentConversationId, newConversation, selectConversation, deleteConversation } = useConversations();
const availableModels = ref([
 { id: 'deepseek', name: 'DeepSeek' },
 { id: 'openai', name: 'OpenAI' },
 { id: 'tongyi', name: '通义千问' },
 { id: 'mock', name: 'Mock' },
]);
const selectedModel = ref('deepseek');
const emit = defineEmits(['modelChange']);
const sortedConversations = computed(() => {
 return [...conversations.value].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});
const handleNewConversation = () => {
 newConversation();
};
const handleSelectConversation = (id) => {
 selectConversation(id);
};
const handleDeleteConversation = (id) => {
 if (confirm('确定要删除这个对话吗？')) {
 deleteConversation(id);
 }
};
const handleModelChange = () => {
 emit('modelChange', selectedModel.value);
};
const formatTime = (isoString) => {
 const date = new Date(isoString);
 const now = new Date();
 const diff = now - date;
 const minutes = Math.floor(diff / 60000);
 const hours = Math.floor(diff / 3600000);
 const days = Math.floor(diff / 86400000);
 if (minutes < 1)
 return '刚刚';
 if (minutes < 60)
 return `${minutes}分钟前`;
 if (hours < 24)
 return `${hours}小时前`;
 if (days < 7)
 return `${days}天前`;
 return date.toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px 0;
}

.new-chat-btn {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.new-chat-btn .icon {
  font-size: 18px;
  font-weight: 300;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.conversation-item.active {
  background: rgba(255, 255, 255, 0.15);
}

.conversation-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  display: block;
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-selector label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.model-selector select {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.model-selector select option {
  background: #1a1a2e;
  color: #fff;
}

.conversation-list::-webkit-scrollbar {
  width: 6px;
}

.conversation-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.conversation-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>