
import React, { useState } from 'react';
import { DATABASE_TOPICS } from '../constants/databaseData';
import { Language } from '../types';
import { X, ChevronRight, ChevronDown, Server, Cloud, Layers, Database, HardDrive, Shield, Network, Terminal, Cpu } from './Icons';

interface TopicNavigationProps {
  language: Language;
  onSelectTopic: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const TopicNavigation: React.FC<TopicNavigationProps> = ({ language, onSelectTopic, isOpen, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  const handleTopicClick = (topic: string) => {
    onSelectTopic(topic);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'mysql': return <Database className="w-4 h-4 text-blue-500" />;
      case 'postgres': return <Server className="w-4 h-4 text-indigo-400" />;
      case 'rocksdb': return <Layers className="w-4 h-4 text-stone-400" />;
      case 'redis': return <HardDrive className="w-4 h-4 text-red-500" />;
      case 'cloud': return <Cloud className="w-4 h-4 text-sky-400" />;
      case 'gpu': return <Cpu className="w-4 h-4 text-emerald-400" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed md:sticky top-0 left-0 h-screen z-40 w-80 bg-[#0c0c0c] border-r border-stone-800 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:h-[calc(100vh)] md:top-0
        `}
      >
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-2 text-stone-200 font-bold font-mono">
            <Database className="w-5 h-5 text-tech-500" />
            <span>{language === 'zh' ? '數據庫內核索引' : 'DB Kernel Index'}</span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 text-stone-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {DATABASE_TOPICS.map((cat) => {
            const isExpanded = expandedCategory === cat.category;

            return (
              <div key={cat.category} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className={`
                    w-full flex items-center justify-between px-3 py-3 rounded text-sm font-bold transition-colors border border-transparent font-mono
                    ${isExpanded ? 'bg-stone-800 text-tech-400 border-stone-700' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(cat.icon)}
                    <span className="truncate">{cat.category}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>

                {isExpanded && (
                  <div className="ml-4 pl-2 border-l border-stone-800 mt-1 space-y-1 animate-fade-in">
                    {cat.topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicClick(topic)}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-stone-500 hover:text-tech-400 hover:bg-stone-900 rounded-r transition-colors truncate"
                        title={topic}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default TopicNavigation;
