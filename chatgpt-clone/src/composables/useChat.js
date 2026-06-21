import { ref, watch } from "vue";
import { useConversations } from "./useConversations";

export function useChat() {
  const {
    currentConversation,
    addMessage,
    updateMessage,
    loadConversations,
  } = useConversations();

  const input = ref("");
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const error = ref(null);
  const selectedProvider = ref("deepseek");

  const messages = ref([]);

  watch(
    () => currentConversation.value?.messages,
    (newMessages) => {
      messages.value = newMessages || [];
    },
    { deep: true, immediate: true }
  );

  const handleSubmit = async (event) => {
    event?.preventDefault();
    
    if (!input.value.trim() || isLoading.value) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.value.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    input.value = "";
    error.value = null;

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    addMessage(assistantMessage);
    isLoading.value = true;
    isStreaming.value = true;

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: currentConversation.value?.messages || [],
          provider: selectedProvider.value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API 调用失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

          const dataStr = trimmedLine.slice(5).trim();
          if (dataStr === "[DONE]") {
            isStreaming.value = false;
            isLoading.value = false;
            break;
          }

          try {
            const data = JSON.parse(dataStr);
            if (typeof data === "string") {
              updateMessage(assistantMessage.id, {
                content: (currentConversation.value?.messages.find(m => m.id === assistantMessage.id)?.content || "") + data,
              });
            }
          } catch (e) {
            console.error("解析错误:", e);
          }
        }
      }
    } catch (err) {
      error.value = err.message;
      updateMessage(assistantMessage.id, {
        content: `错误: ${err.message}`,
      });
    } finally {
      isLoading.value = false;
      isStreaming.value = false;
    }
  };

  const setProvider = (provider) => {
    selectedProvider.value = provider;
  };

  return {
    messages,
    input,
    isLoading,
    isStreaming,
    error,
    selectedProvider,
    handleSubmit,
    setProvider,
    loadConversations,
  };
}