import React from "react";

// 首屏静态骨架：在客户端 hydration（mounted）完成前渲染，
// 由服务端直接输出到 HTML，避免首屏出现单调的“加载中”或白屏闪烁。
// 结构与真实布局（Sidebar + Header + 消息区 + ChatInput）保持一致。
const AppSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex">
      {/* Sidebar 骨架 */}
      <div className="w-72 bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
              AI
            </span>
            智能助手
          </h1>
        </div>

        <div className="p-3">
          <div className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 opacity-80">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            新对话
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-2 space-y-2 animate-pulse">
            <div className="h-14 rounded-xl bg-gray-800/50" />
            <div className="h-14 rounded-xl bg-gray-800/40" />
            <div className="h-14 rounded-xl bg-gray-800/30" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center">
            <p>基于 Next.js + LangChain 构建</p>
          </div>
        </div>
      </div>

      {/* 主区域骨架 */}
      <main className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className="glass-panel border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">AI 助手</h1>
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
                <span className="text-xs text-gray-400">连接中</span>
              </div>
            </div>
            <div className="px-4 py-2 text-sm text-gray-500 rounded-lg">
              清空对话
            </div>
          </div>
        </header>

        {/* 消息区占位 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-sm">正在加载对话…</div>
        </div>

        {/* 输入区骨架 */}
        <div className="flex items-end gap-3 p-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700">
          <div className="w-10 h-10 rounded-xl bg-gray-700/50" />
          <div className="flex-1">
            <div className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-gray-500">
              输入消息...
            </div>
          </div>
          <div className="px-6 py-3 rounded-xl font-medium bg-gray-600 text-gray-400">
            发送
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppSkeleton;
