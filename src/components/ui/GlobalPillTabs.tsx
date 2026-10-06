import React from 'react';

export interface TabItem {
  id: string;
  label: string;
}

interface GlobalPillTabsProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function GlobalPillTabs({ tabs, activeTab, setActiveTab }: GlobalPillTabsProps) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 md:pb-0 md:flex-wrap md:overflow-visible">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === tab.id
              ? 'bg-orange-500 text-white shadow-sm' // Active Pill
              : 'text-gray-600 bg-transparent hover:bg-gray-100 hover:text-gray-900' // Inactive Pill
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
