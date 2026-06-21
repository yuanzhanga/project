<template>
  <div :class="['message-wrapper', message.role]">
    <div :class="['message', message.role]">
      <div :class="['message-avatar', message.role]">
        {{ message.role === "user" ? "👤" : "🤖" }}
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-role">
            {{ message.role === "user" ? "你" : "AI" }}
          </span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-text" v-html="formattedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useMarkdownParser } from "../composables/useMarkdownParser.js";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
});

const { parse } = useMarkdownParser();

const formattedContent = computed(() => {
  if (!props.message.content) return "";
  if (props.isStreaming) return props.message.content;
  return parse(props.message.content);
});

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
};
</script>

<style scoped>
.message-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
  animation: fadeInUp 0.3s ease;
}

.message-wrapper.user {
  justify-content: flex-end;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 20px;
  max-width: 75%;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.message.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom-right-radius: 6px;
}

.message.assistant {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom-left-radius: 6px;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.message-avatar.user {
  background: rgba(255, 255, 255, 0.2);
}

.message-avatar.assistant {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.message-role {
  font-weight: 600;
  font-size: 14px;
  opacity: 0.9;
}

.message.user .message-role {
  color: rgba(255, 255, 255, 0.9);
}

.message.assistant .message-role {
  color: rgba(255, 255, 255, 0.8);
}

.message-time {
  font-size: 12px;
  opacity: 0.5;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.6);
}

.message.assistant .message-time {
  color: rgba(255, 255, 255, 0.4);
}

.message-text {
  line-height: 1.7;
  word-wrap: break-word;
  font-size: 15px;
}

.message.user .message-text {
  color: rgba(255, 255, 255, 0.95);
}

.message.assistant .message-text {
  color: rgba(255, 255, 255, 0.9);
}

.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
  color: #d4d4d4;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-text :deep(pre code) {
  color: #d4d4d4;
  background: transparent;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
}

.message-text :deep(code) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  color: #e0e0e0;
}

.message-text :deep(p) {
  margin: 10px 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  padding-left: 24px;
  margin: 10px 0;
}

.message-text :deep(li) {
  margin: 6px 0;
}

.message-text :deep(strong) {
  font-weight: 600;
  color: #fff;
}

.message-text :deep(em) {
  font-style: italic;
}

.message-text :deep(a) {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px solid rgba(102, 126, 234, 0.5);
  transition: all 0.2s ease;
}

.message-text :deep(a:hover) {
  color: #764ba2;
  border-bottom-color: #764ba2;
}

.message-text :deep(blockquote) {
  border-left: 3px solid #667eea;
  padding-left: 16px;
  margin: 12px 0;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 16px 0 10px 0;
  font-weight: 600;
  color: #fff;
}

.message-text :deep(h1) { font-size: 24px; }
.message-text :deep(h2) { font-size: 20px; }
.message-text :deep(h3) { font-size: 18px; }
.message-text :deep(h4) { font-size: 16px; }

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 20px 0;
}

.message.user .message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
}

.message.user .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.message.user .message-text :deep(a) {
  color: rgba(255, 255, 255, 0.9);
  border-bottom-color: rgba(255, 255, 255, 0.5);
}
</style>