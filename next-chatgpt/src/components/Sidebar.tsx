import React from 'react';
import { ChatSession } from '@/lib/langchain/chain';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPreview = (session: ChatSession) => {
    if (session.messages.length === 0) {
      return '新对话';
    }
    const lastMessage = session.messages[session.messages.length - 1];
    return lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
  };

  return (
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
        <button
          onClick={onCreateSession}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                currentSessionId === session.id
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'hover:bg-gray-800/50 border border-transparent'
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {getPreview(session)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>暂无对话</p>
              <p className="text-sm mt-1">点击上方按钮开始新对话</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          <p>基于 Next.js + LangChain 构建</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
