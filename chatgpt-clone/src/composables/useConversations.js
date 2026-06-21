import { ref, computed, watch } from "vue";

const STORAGE_KEY = "ai-assistant-conversations";

const conversations = ref([]);
const currentConversationId = ref(null);

// 加载对话或保存到localStorage
const loadConversations = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      conversations.value = JSON.parse(stored);
    } else {
      conversations.value = [createNewConversation()];
    }
    currentConversationId.value = conversations.value[0]?.id;
  } catch (e) {
    conversations.value = [createNewConversation()];
    currentConversationId.value = conversations.value[0]?.id;
  }
};
const saveConversations = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.value));
};

watch(conversations, saveConversations, { deep: true });

// 创建新对话
function createNewConversation() {
  const id = Date.now().toString();
  return {
    id,
    title: "新对话",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useConversations() {
  const currentConversation = computed(() => {
    return conversations.value.find(
      (c) => c.id === currentConversationId.value,
    );
  });

  const addMessage = (message) => {
    if (currentConversation.value) {
      currentConversation.value.messages.push(message);
      currentConversation.value.updatedAt = new Date().toISOString();

      if (currentConversation.value.messages.length === 1) {
        currentConversation.value.title =
          message.content.substring(0, 30) + "...";
      }
    }
  };

  const updateMessage = (messageId, updates) => {
    console.log(messageId, updates);
    if (currentConversation.value) {
      const index = currentConversation.value.messages.findIndex(
        (m) => m.id === messageId,
      );
      if (index !== -1) {
        currentConversation.value.messages[index] = {
          ...currentConversation.value.messages[index],
          ...updates,
        };
        currentConversation.value.updatedAt = new Date().toISOString();
      }
    }
  };

  // 创建新对话
  const newConversation = () => {
    const conv = createNewConversation();
    conversations.value.unshift(conv);
    currentConversationId.value = conv.id;
    return conv;
  };

  const selectConversation = (id) => {
    currentConversationId.value = id;
  };

  const deleteConversation = (id) => { 
    const index = conversations.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      conversations.value.splice(index, 1);

      if (currentConversationId.value === id) {
        currentConversationId.value = conversations.value[0]?.id || null;
        if (!currentConversationId.value && conversations.value.length === 0) {
          newConversation();
        }
      }
    }
  };

  const clearConversation = () => {
    if (currentConversation.value) {
      currentConversation.value.messages = [];
      currentConversation.value.title = "新对话";
      currentConversation.value.updatedAt = new Date().toISOString();
    }
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    addMessage,
    updateMessage,
    newConversation,
    selectConversation,
    deleteConversation,
    clearConversation,
    loadConversations,
  };
}
