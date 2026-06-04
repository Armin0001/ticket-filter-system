"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Ticket } from "@/types/ticket";
import FilterBar from "@/components/FilterBar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function formatTimestampWithTime(timestamp: any): string {
  if (!timestamp) return "unassigned";
  const date = new Date(timestamp.seconds * 1000);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Keeping date utilities local for clean client-side range calculations
function checkTimestampInRange(timestamp: any, category: string): boolean {
  if (!timestamp || !timestamp.seconds) return false;
  const ticketDate = new Date(timestamp.seconds * 1000).getTime();

  const today = new Date();
  const zero = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const todayStart = zero(today).getTime();
  const yesterdayStart = todayStart - 86400000;
  const lastWeekStart = todayStart - 7 * 86400000;
  const lastMonthStart = todayStart - 30 * 86400000;
  const tomorrowStart = todayStart + 86400000;

  switch (category) {
    case "today":
      return ticketDate >= todayStart && ticketDate < tomorrowStart;
    case "yesterday":
      return ticketDate >= yesterdayStart && ticketDate < todayStart;
    case "last week":
      return ticketDate >= lastWeekStart && ticketDate < yesterdayStart;
    case "last month":
      return ticketDate >= lastMonthStart && ticketDate < lastWeekStart;
    default:
      return true;
  }
}

function getTicketProperty(input: string | null): Record<string, any> {
  if (!input) return { error: "no param" };
  const priorities = ["low", "medium", "high", "urgent"];
  const folders = ["spam", "trash", "archive", "inbox"];
  const statuses = ["open", "pending", "solved", "closed", "on-hold"];

  if (priorities.includes(input))
    return { priority: [input.charAt(0).toUpperCase() + input.slice(1)] };
  if (folders.includes(input)) return { folder: [input] };
  if (statuses.includes(input)) return { status: [input] };
  return { error: "Unknown input" };
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  pending: "bg-amber-100 text-amber-700",
  "on-hold": "bg-blue-100 text-blue-700",
  solved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: "text-red-500",
  High: "text-orange-500",
  Medium: "text-gray-400",
  Low: "text-green-500",
};

const PRIORITY_ICON: Record<string, string> = {
  Urgent: "↑↑",
  High: "↑",
  Medium: "●",
  Low: "↓",
};

function getDisplayValue(value: any): any {
  return (value && typeof value === "string" && value.trim() !== "") ||
    (Array.isArray(value) && value.length > 0)
    ? value
    : "unassigned";
}

export default function TicketsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">Loading tickets...</div>
      }
    >
      <TicketsPage />
    </Suspense>
  );
}

function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);

  const [defaultValue, setDefaultValue] = useState<string[]>([]);
  const [defaultValueOther, setDefaultValueOther] = useState<
    Record<string, any>
  >({});
  const [defaultValueUsers, setDefaultValueUsers] = useState<
    Record<string, any>
  >({});
  const [defaultValueOptions, setDefaultValueOptions] = useState<
    Record<string, any>
  >({});

  const [origFiltered, setOrigFiltered] = useState<Ticket[]>([]);
  const [orig, setOrig] = useState<Ticket[]>([]);
  const [checkUsed, setCheckUsed] = useState(false);
  const [myFilters, setFilters] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);

  const urlFilterActive = useMemo(
    () => !!urlFilter && !("error" in getTicketProperty(urlFilter)),
    [urlFilter],
  );

  const fetchTickets = async () => {
    let mergedObj: Record<string, any> = {};
    const urlResult = getTicketProperty(urlFilter);
    if (!("error" in urlResult)) {
      mergedObj = { ...myFilters, ...urlResult };
    } else if (urlFilter) {
      router.replace("/");
      return;
    }

    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "myNewTickets"));

      const all: Ticket[] = [];
      querySnapshot.forEach((d) => {
        all.push({ ...(d.data() as any), id: d.id });
      });
      setAllTickets(all);

      const activeFilters =
        Object.keys(myFilters).length !== 0 ? myFilters : mergedObj;
      const hasFilters = Object.keys(activeFilters).length !== 0;

      if (hasFilters) {
        let myQuery: any = collection(db, "myNewTickets");
        let clientDateFilters: Record<string, string> = {};

        Object.entries(activeFilters).forEach(([key, value]) => {
          // Divert programmatic date categories into our custom client-side pipeline
          if (
            key === "dateCreated" ||
            key === "lastActivity" ||
            key === "lastMessage"
          ) {
            clientDateFilters[key] = value;
            return;
          }

          const newKey = key.charAt(0).toLowerCase() + key.slice(1);
          if (key === "followers" || key === "Tags") {
            myQuery = query(
              myQuery,
              where(newKey, "array-contains-any", value),
            );
          } else {
            myQuery = query(myQuery, where(newKey, "in", value));
          }
        });

        const filteredSnapshot = await getDocs(myQuery);
        let docs = filteredSnapshot.docs.map(
          (d) => ({ ...(d.data() as Record<string, any>), id: d.id }) as Ticket,
        );
        // Execute dynamic runtime filtering on client side to remain independent from database index rules
        if (Object.keys(clientDateFilters).length > 0) {
          docs = docs.filter((ticket) => {
            return Object.entries(clientDateFilters).every(
              ([field, category]) => {
                return checkTimestampInRange((ticket as any)[field], category);
              },
            );
          });
        }

        setFilteredTickets(docs);
        setOrigFiltered(docs);

        if (urlFilterActive && Object.keys(myFilters).length === 0) {
          setCheckUsed(true);
        }
      } else {
        const list = querySnapshot.docs.map((d) => {
          const t = d.data();
          return {
            id: d.id,
            name: t.name,
            email: t.email,
            subject: t.subject,
            agent: t.agent,
            status: t.status,
            priority: t.priority,
            lastMessage: t.lastMessage,
            madeBy: t.madeBy,
            attachmentLink: t.attachmentLink,
            dateCreated: t.dateCreated,
            lastActivity: t.lastActivity,
            followers: t.followers,
            folder: t.folder || "unassigned",
          } as Ticket;
        });
        setTickets(list);
        setOrig(list);
        setFilteredTickets([]);
        setOrigFiltered([]);
        setCheckUsed(false);
      }
    } catch (err: any) {
      if (
        String(err).includes("YOUR_") ||
        String(err).includes("projectId") ||
        err?.code === "permission-denied"
      ) {
        setConfigMissing(true);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myFilters, urlFilter]);

  const logData = () => {
    let obj3: Record<string, any> = {};

    for (const key in defaultValueOther) {
      if (Object.prototype.hasOwnProperty.call(defaultValueUsers, key)) {
        obj3[key] = [defaultValueUsers[key]];
      } else {
        obj3[key] = [defaultValueOther[key]];
      }
    }

    const assignedAgents = tickets
      .filter((item) => item.agent !== "")
      .map((item) => item.agent);
    const unassignedAgents = tickets
      .filter((item) => item.agent === "")
      .map((item) => item.agent);
    const complexAttachments = tickets
      .filter((item) => item.attachmentLink === "true")
      .map((item) => item.attachmentLink);
    const emptyAttachments = tickets
      .filter((item) => item.attachmentLink !== "true")
      .map((item) => item.attachmentLink);

    if (obj3["Attachment"]?.[0] === "has")
      obj3["Attachment"] = complexAttachments;
    if (obj3["Attachment"]?.[0] === "has_not")
      obj3["Attachment"] = emptyAttachments;
    if (obj3["Assignment"]?.[0] === "assigned")
      obj3["Assignment"] = assignedAgents;
    if (obj3["Assignment"]?.[0] === "unassigned")
      obj3["Assignment"] = unassignedAgents;

    if (Object.prototype.hasOwnProperty.call(obj3, "Assignment")) {
      obj3["agent"] = obj3["Assignment"];
      delete obj3["Assignment"];
    }
    if (Object.prototype.hasOwnProperty.call(obj3, "Attachment")) {
      obj3["attachmentLink"] = obj3["Attachment"];
      delete obj3["Attachment"];
    }

    if (Object.prototype.hasOwnProperty.call(obj3, "Creation date")) {
      obj3["dateCreated"] = obj3["Creation date"][0];
      delete obj3["Creation date"];
    }

    if (Object.prototype.hasOwnProperty.call(obj3, "Last activity")) {
      obj3["lastActivity"] = obj3["Last activity"][0];
      delete obj3["Last activity"];
    }

    if (Object.prototype.hasOwnProperty.call(obj3, "Last message")) {
      obj3["lastMessage"] = obj3["Last message"][0];
      delete obj3["Last message"];
    }

    if (Object.prototype.hasOwnProperty.call(defaultValueUsers, "Followers")) {
      obj3["followers"] = [...new Set(defaultValueUsers["Followers"])];
      delete obj3["Followers"];
    }

    Object.keys(obj3).forEach((key) => {
      if (obj3[key].length === 1 && obj3[key][0] === false) delete obj3[key];
    });

    if (Object.prototype.hasOwnProperty.call(obj3, "Priority")) {
      obj3["Priority"] = obj3["Priority"].map(
        (item: string) => item.charAt(0).toUpperCase() + item.slice(1),
      );
    }

    if (Object.prototype.hasOwnProperty.call(obj3, "Status")) {
      obj3["Status"] = obj3["Status"].map(
        (item: string) => item.charAt(0).toLowerCase() + item.slice(1),
      );
    }

    if (Object.prototype.hasOwnProperty.call(obj3, "Tag")) {
      obj3["Tags"] = obj3["Tag"].map(
        (item: string) => item.charAt(0).toLowerCase() + item.slice(1),
      );
      delete obj3["Tag"];
    }

    setCheckUsed(Object.keys(obj3).length !== 0);
    setFilters(obj3);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value !== "") {
      const filterBySearch = (list: Ticket[]) =>
        list.filter((item) =>
          item.subject.toLowerCase().includes(value.toLowerCase()),
        );
      setFilteredTickets(filterBySearch(filteredTickets));
      setTickets(filterBySearch(tickets));
    } else {
      setFilteredTickets(origFiltered);
      setTickets(orig);
    }
  };

  const updateTicket = async (
    ticketId: string,
    updatedFields: Partial<Ticket>,
  ) => {
    try {
      const ticketRef = doc(db, "myNewTickets", ticketId);
      await updateDoc(ticketRef, updatedFields as any);
      fetchTickets();
      toast.success("Ticket updated successfully!");
    } catch (error) {
      console.error("Error updating ticket: ", error);
    }
  };

  const visibleTickets =
    checkUsed || urlFilterActive ? filteredTickets : tickets;

  if (configMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Firebase Configuration Error
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-5 leading-relaxed">
            Please check your configuration files under{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">
              config/firebase.ts
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar />

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="1"
                width="6"
                height="6"
                rx="1"
                fill="white"
                opacity="0.8"
              />
              <rect
                x="9"
                y="1"
                width="6"
                height="6"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="1"
                y="9"
                width="6"
                height="6"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Support Tickets</span>
            <span className="ml-2 text-xs text-gray-400">myNewTickets</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            {["open", "pending", "solved", "urgent", "spam"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  if (urlFilter === f) {
                    setCheckUsed(false);
                    router.push("/");
                  } else {
                    router.push(`/?filter=${f}`);
                  }
                }}
                className={`px-2.5 py-1 rounded-full capitalize transition-colors ${
                  urlFilter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M9.5 9.5l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by subject…"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-52"
            />
          </div>

          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full font-medium">
            {visibleTickets.length} / {allTickets.length}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {urlFilterActive && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-indigo-600 font-medium">Quick filter:</span>
            <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize">
              {urlFilter}
            </span>
            <button
              onClick={() => {
                setCheckUsed(false);
                router.push("/");
              }}
              className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 underline"
            >
              Clear
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Filters
            </span>
            {checkUsed && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {Object.keys(myFilters).length}
              </span>
            )}
          </div>
          <FilterBar
            setDefaultValue={setDefaultValue}
            setDefaultValueOther={setDefaultValueOther}
            setDefaultValueUsers={setDefaultValueUsers}
            setDefaultValueOptions={setDefaultValueOptions}
            allTickets={allTickets}
            callFunction={logData}
          />
        </div>

        {/* Removed overflow-hidden here so popups aren't cut off inside rows */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="grid grid-cols-[2fr_2.5fr_1.5fr_1fr_1fr_1.8fr_40px] px-5 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <div>Requester</div>
            <div>Subject</div>
            <div>Agent</div>
            <div className="text-center">Status</div>
            <div className="text-center">Priority</div>
            <div className="text-center">Last Message</div>
            <div />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading tickets…</p>
            </div>
          ) : visibleTickets.length > 0 ? (
            visibleTickets.map((ticket, index) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                index={index}
                onUpdate={updateTicket}
              />
            ))
          ) : checkUsed ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-sm font-medium text-gray-500">
                No data on record!
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="text-5xl mb-4">🎫</div>
              <p className="text-sm font-medium text-gray-500">
                Create a ticket to get started!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TicketRow({
  ticket,
  index,
  onUpdate,
}: {
  ticket: Ticket;
  index: number;
  onUpdate: (id: string, fields: Partial<Ticket>) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => {
    return ticket.name
      ? ticket.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?";
  }, [ticket.name]);

  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ];
  const avatarColor = colors[(ticket.name?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div className="grid grid-cols-[2fr_2.5fr_1.5fr_1fr_1fr_1.8fr_40px] px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors group items-center">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-full ${avatarColor} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">
            {getDisplayValue(ticket.name)}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {getDisplayValue(ticket.email)}
          </div>
        </div>
      </div>

      <div className="min-w-0 pr-4">
        <div className="text-sm text-gray-700 truncate">
          {getDisplayValue(ticket.subject)}
        </div>
        {ticket.folder && (
          <div className="text-xs text-gray-400 mt-0.5">{ticket.folder}</div>
        )}
      </div>

      <div className="text-sm min-w-0">
        {ticket.agent ? (
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
            <span className="truncate">{ticket.agent}</span>
          </span>
        ) : (
          <span className="text-gray-300 italic text-xs">unassigned</span>
        )}
      </div>

      <div className="flex justify-center">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[ticket.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {getDisplayValue(ticket.status)}
        </span>
      </div>

      <div className="flex justify-center">
        <span
          className={`flex items-center gap-1 text-xs font-semibold ${PRIORITY_COLOR[ticket.priority] ?? "text-gray-400"}`}
        >
          <span className="text-sm leading-none">
            {PRIORITY_ICON[ticket.priority] ?? "●"}
          </span>
          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
        </span>
      </div>

      <div className="text-center text-xs text-gray-400">
        {ticket.lastMessage
          ? formatTimestampWithTime(ticket.lastMessage)
          : "unassigned"}
      </div>

      {/* Styled context wrapper layer using proper z-indexing stacking rules */}
      <div className="relative flex justify-center z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
        >
          ⋯
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-1 w-44 text-sm max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                Change Priority
              </div>
              {[
                { p: "Urgent", color: "text-red-500" },
                { p: "High", color: "text-orange-500" },
                { p: "Medium", color: "text-gray-400" },
                { p: "Low", color: "text-green-500" },
              ].map(({ p, color }) => (
                <button
                  key={p}
                  onClick={() => {
                    onUpdate(ticket.id, { priority: p });
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 ${color}`}
                >
                  <span>{PRIORITY_ICON[p]}</span> {p}
                </button>
              ))}
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-y border-gray-100">
                Change Status
              </div>
              {["open", "pending", "on-hold", "solved", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onUpdate(ticket.id, { status: s });
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 capitalize"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
