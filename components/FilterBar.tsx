"use client";

import { useState, useMemo } from "react";

interface FilterItem {
  key: string;
  value: string;
}

type FilterBarProps = {
  setDefaultValue: (v: string[]) => void;
  setDefaultValueOther: (v: Record<string, any>) => void;
  setDefaultValueUsers: (v: Record<string, any>) => void;
  setDefaultValueOptions: (v: Record<string, any>) => void;
  allTickets: Array<{ tags?: string[] & any }>;
  callFunction: () => void;
};

const FILTER_KEYS = [
  "Status", "Priority", "Assignment", "Attachment", "Creation date", "Last activity", "Last message", "Tag", "Followers"
];

const OPTIONS: Record<string, string[]> = {
  Status: ["open", "pending", "on-hold", "solved", "closed"],
  Priority: ["urgent", "high", "medium", "low"],
  Assignment: ["assigned", "unassigned"],
  Attachment: ["has", "has_not"],
  "Creation date": ["today", "yesterday", "last week", "last month"],
  "Last activity": ["today", "yesterday", "last week", "last month"],
  "Last message": ["today", "yesterday", "last week", "last month"],
  Tag: [],
  Followers: [],
};

const PILL_COLORS: Record<string, string> = {
  Status: "bg-sky-100 text-sky-800 border-sky-200",
  Priority: "bg-orange-100 text-orange-800 border-orange-200",
  Assignment: "bg-purple-100 text-purple-800 border-purple-200",
  Attachment: "bg-green-100 text-green-800 border-green-200",
  "Creation date": "bg-pink-100 text-pink-800 border-pink-200",
  "Last activity": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Last message": "bg-teal-100 text-teal-800 border-teal-200",
  Tag: "bg-violet-100 text-violet-800 border-violet-200",
  Followers: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function FilterBar({
  setDefaultValue,
  setDefaultValueOther,
  setDefaultValueUsers,
  setDefaultValueOptions,
  allTickets,
  callFunction,
}: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [emailText, setEmailText] = useState("");

  // Memoize to prevent recalculating array transformations on every render pass
  const tagOptions = useMemo(() => {
    return [...new Set(
      allTickets.flatMap((t) => (Array.isArray(t.tags) ? t.tags : []))
    )].filter(Boolean) as string[];
  }, [allTickets]);

  const getFilterOptions = (key: string) => {
    return key === "Tag" ? tagOptions : (OPTIONS[key] ?? []);
  };

  const processAndPushFilters = (currentFilters: FilterItem[]) => {
    const keys: string[] = [];
    const other: Record<string, any> = {};
    const users: Record<string, any> = {};

    for (const item of currentFilters) {
      keys.push(item.key);
      if (item.key === "Followers") {
        if (!users[item.key]) users[item.key] = [];
        if (!users[item.key].includes(item.value)) {
          users[item.key].push(item.value);
        }
      } else {
        other[item.key] = item.value;
      }
    }

    setDefaultValue(keys);
    setDefaultValueOther(other);
    setDefaultValueUsers(users);
    setDefaultValueOptions({});
  };

  const handleAddFilter = (key: string, val: string) => {
    if (activeFilters.some((f) => f.key === key && f.value === val)) return;
    const updated = [...activeFilters, { key, value: val }];
    
    setActiveFilters(updated);
    processAndPushFilters(updated);
    setOpen(false);
    setActiveKey(null);
    setEmailText("");
  };

  const handleRemoveFilter = (idx: number) => {
    const updated = activeFilters.filter((_, i) => i !== idx);
    setActiveFilters(updated);
    processAndPushFilters(updated);
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    setDefaultValue([]);
    setDefaultValueOther({});
    setDefaultValueUsers({});
    setDefaultValueOptions({});
    callFunction();
  };

  const onApply = () => {
    // Explicit sync immediately execution pass instead of relying on event loop timeouts
    processAndPushFilters(activeFilters);
    callFunction();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 flex-wrap">
        
        <div className="relative">
          <button
            onClick={() => { setOpen(!open); setActiveKey(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 2h12M3 7h8M5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add Filter
          </button>

          {open && !activeKey && (
            <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-56 py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                Filter by
              </div>
              {FILTER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                >
                  {key}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 3l3 3-3 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}

          {open && activeKey && (
            <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-56 py-1">
              <button
                onClick={() => setActiveKey(null)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 border-b border-gray-100 w-full hover:bg-gray-50"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8 3L5 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {activeKey}
              </button>

              {activeKey === "Followers" ? (
                <div className="p-3">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && emailText.trim()) {
                        handleAddFilter("Followers", emailText.trim());
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    onClick={() => { if (emailText.trim()) handleAddFilter("Followers", emailText.trim()); }}
                    className="mt-2 w-full px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              ) : getFilterOptions(activeKey).length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 italic">
                  {activeKey === "Tag" ? "No tags found in tickets" : "No options available"}
                </div>
              ) : (
                getFilterOptions(activeKey).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAddFilter(activeKey, opt)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 capitalize"
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {activeFilters.map((filter, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${PILL_COLORS[filter.key] ?? "bg-gray-100 text-gray-800 border-gray-200"}`}
          >
            <span className="opacity-60">{filter.key}:</span>
            <span className="capitalize">{filter.value}</span>
            <button onClick={() => handleRemoveFilter(i)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          {activeFilters.length > 0 && (
            <button onClick={handleClearAll} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              Clear all
            </button>
          )}
          <button onClick={onApply} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
            Apply Filter
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setActiveKey(null); }}/>
      )}
    </div>
  );
}