<template>
  <div class="app-container">
    <Sidebar @modelChange="handleModelChange" />

    <main class="main-content">
      <div class="chat-container">
        <header class="chat-header">
          <div class="header-content">
            <div class="header-icon">🤖</div>
            <div class="header-info">
              <h1>AI 助手</h1>
              <p class="subtitle">基于 Vue 3 的 AI 编程协作工作台</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="action-btn" title="清空对话" @click="handleClear">
              <span>🗑️</span>
            </button>
          </div>
        </header>

        <main class="chat-main">
          <div class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="welcome-message">
              <div class="welcome-icon">👋</div>
              <h2>你好！我是 AI 助手</h2>
              <p>有什么我可以帮助你的吗？</p>
              <div class="suggestions">
                <button
                  v-for="suggestion in suggestions"
                  :key="suggestion"
                  @click="handleSuggestion(suggestion)"
                  class="suggestion-btn"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>

            <ChatMessage
              v-for="message in messages"
              :key="message.id"
              :message="message"
              :is-streaming="
                isStreaming &&
                message.role === 'assistant' &&
                message === messages[messages.length - 1]
              "
            />

            <div v-if="isLoading" class="typing-indicator">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-text">AI 正在思考...</span>
            </div>
          </div>
        </main>

        <footer class="chat-footer">
          <div class="upload-area">
            <input
              type="file"
              id="file-upload"
              class="file-input"
              @change="handleFileUpload"
              multiple
            />
            <label for="file-upload" class="upload-btn">
              <span class="upload-icon">📁</span>
              <span>上传文件</span>
            </label>
            <span
              v-if="uploadProgress > 0 && uploadProgress < 100"
              class="upload-progress"
            >
              <span class="progress-bar">
                <span
                  class="progress-fill"
                  :style="{ width: uploadProgress + '%' }"
                ></span>
              </span>
              <span class="progress-text">{{ uploadProgress }}%</span>
            </span>
          </div>

          <form @submit="handleSubmit" class="input-form">
            <div class="input-wrapper">
              <button type="button" class="input-btn" title="发送图片">
                🖼️
              </button>
              <textarea
                v-model="input"
                @keydown="handleKeydown"
                @input="handleInput"
                placeholder="输入消息..."
                rows="1"
                :disabled="isLoading"
                class="message-input"
                ref="inputRef"
              />
              <button
                type="button"
                class="input-btn"
                title="语音输入"
                :class="{ active: isRecording }"
                @click="toggleRecording"
              >
                🎤
              </button>
              <button
                type="submit"
                :disabled="!input.trim() || isLoading"
                class="send-btn"
              >
                <span v-if="!isLoading" class="send-icon">➤</span>
                <span v-else class="loading-spinner"></span>
              </button>
            </div>
            <p v-if="error" class="error-message">{{ error }}</p>
          </form>
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { useChat } from "./composables/useChat";
import Sidebar from "./components/Sidebar.vue";
import ChatMessage from "./components/ChatMessage.vue";

const {
  messages,
  input,
  isLoading,
  isStreaming,
  error,
  handleSubmit,
  setProvider,
  loadConversations,
} = useChat();

const messagesContainer = ref(null);
const inputRef = ref(null);
const uploadProgress = ref(0);
const isRecording = ref(false);
let recognition = null;

const suggestions = [
  "介绍一下自己",
  "帮我写个冒泡排序",
  "解释什么是闭包",
  "推荐一本编程书籍",
];

//提交
const handleSuggestion = (suggestion) => {
  input.value = suggestion;
  handleSubmit();
};
const handleKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};
const handleInput = () => {
  if (inputRef.value) {
    inputRef.value.style.height = "auto";
    inputRef.value.style.height =
      Math.min(inputRef.value.scrollHeight, 100) + "px";
  }
};
// 切换模型
const handleModelChange = (model) => {
  setProvider(model);
};

const handleClear = () => {
  if (confirm("确定要清空当前对话吗？")) {
    window.location.reload();
  }
};

// 语音识别
const toggleRecording = () => {
  if (!recognition) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("❌ 浏览器不支持语音识别，请使用 Chrome");
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        interimTranscript += transcript;
      }
      input.value = interimTranscript;
    };
    recognition.onerror = (error) => {
      console.error("语音识别错误:", error);
    };
  }

  isRecording.value = !isRecording.value;

  if (isRecording.value) {
    console.log("开始语音识别");
    recognition.start();
  } else {
    console.log("停止语音识别");
    recognition.stop();
  }
};

const handleFileUpload = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  uploadProgress.value = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(file)
    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;

    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("file", chunk, file.name);
      formData.append("chunk", uploadedChunks + 1);
      formData.append("totalChunks", totalChunks);
      formData.append("fileName", file.name);

      try {
        await fetch("http://localhost:3001/api/upload", {
          method: "POST",
          body: formData,
        });

        uploadedChunks++;
        uploadProgress.value = Math.round(
          ((i * totalChunks + uploadedChunks) / (files.length * totalChunks)) *
            100,
        );
      } catch (err) {
        console.error("文件上传失败:", err);
        break;
      }
    }
  }

  uploadProgress.value = 0;
  event.target.value = "";
};

watch(
  messages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  },
  { deep: true },
);

onMounted(() => {
  loadConversations();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    sans-serif;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  min-height: 100vh;
  color: #fff;
  overflow: hidden;
}

.app-container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  display: flex;
  flex-direction: column;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(30px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.header-info h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, #fff 0%, #c0c0c0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.chat-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.chat-main::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(102, 126, 234, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 80%,
      rgba(118, 75, 162, 0.08) 0%,
      transparent 50%
    );
  pointer-events: none;
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.welcome-message {
  text-align: center;
  padding: 80px 20px;
}

.welcome-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.welcome-message h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #fff 0%, #c0c0c0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-message p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 32px 0;
  font-size: 15px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 500px;
  margin: 0 auto;
}

.suggestion-btn {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.suggestion-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.chat-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.15);
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.file-input {
  display: none;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
}

.upload-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 40px;
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
}

.input-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.input-btn.active {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 15px;
  resize: none;
  min-height: 36px;
  max-height: 200px;
  overflow-y: auto;
  font-family: inherit;
}

.message-input:focus {
  outline: none;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.send-btn {
  width: 48px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.send-icon {
  font-weight: bold;
}

.error-message {
  color: #ef4444;
  font-size: 13px;
  margin: 0;
  padding: 0 8px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  width: fit-content;
  margin: 8px 0;
}

.typing-dots {
  display: flex;
  gap: 6px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}
.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }

  .chat-header,
  .chat-footer {
    padding: 14px 16px;
  }

  .messages-container {
    padding: 16px;
  }

  .header-info h1 {
    font-size: 18px;
  }

  .header-icon {
    width: 38px;
    height: 38px;
    font-size: 20px;
  }

  .send-btn {
    width: 44px;
    height: 36px;
  }
}
</style>
