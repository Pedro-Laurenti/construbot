"use client";

import { useState, useRef, useEffect } from "react";
import { MdCalculate, MdRecordVoiceOver, MdSearch, MdMoreVert, MdArticle, MdLogout } from "react-icons/md";
import type { ConversationId } from "@/types";

interface NavItem {
  id: ConversationId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  avatarClass: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "cotacao",
    label: "Realizar Cotação",
    sublabel: "Assistente de cotações de obras",
    icon: <MdCalculate size={22} />,
    avatarClass: "bg-primary text-primary-content",
  },
  {
    id: "engenheiro",
    label: "Falar com Engenheiro",
    sublabel: "Atendimento humano especializado",
    icon: <MdRecordVoiceOver size={22} />,
    avatarClass: "bg-info text-info-content",
  },
];

interface SidebarProps {
  selectedId: ConversationId;
  onSelect: (id: ConversationId) => void;
  onLogout: () => void;
  userName: string;
}

export default function Sidebar({ selectedId, onSelect, onLogout, userName }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <aside className="w-[380px] min-w-[380px] flex flex-col h-full border-r border-secondary bg-base-100">
      <div className="flex items-center justify-between px-4 py-2.5 bg-base-300 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm select-none">
              <span>{initials || "U"}</span>
            </div>
          </div>
          <span className="text-base-content text-sm font-medium truncate">
            {userName || "Usuário"}
          </span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn btn-ghost btn-sm btn-circle"
            title="Mais opções"
          >
            <MdMoreVert size={20} />
          </button>
          {menuOpen && (
            <ul className="menu absolute top-full right-0 mt-1 w-44 bg-base-300 rounded-box shadow-xl z-50 border border-secondary p-1">
              <li>
                <button
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="flex items-center gap-2 text-sm"
                >
                  <MdLogout size={16} className="text-base-content/50" />
                  Sair da conta
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="px-3 py-2 bg-base-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 w-full cursor-text">
          <MdSearch size={15} className="text-base-content/40 flex-shrink-0" />
          <span className="text-base-content/40 text-sm select-none">
            Pesquisar ou começar nova conversa
          </span>
        </div>
      </div>

      <div className="divider my-0 h-px" />

      <ul className="menu flex-1 overflow-y-auto p-0 gap-0">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-3 px-3 rounded-none w-full transition-colors ${
                selectedId === item.id ? "bg-secondary active" : "hover:bg-base-300"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${item.avatarClass}`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0 py-3.5 border-b border-secondary text-left">
                <div className="text-base-content font-medium text-sm truncate">
                  {item.label}
                </div>
                <div className="text-base-content/50 text-[13px] truncate">
                  {item.sublabel}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex-shrink-0 px-4 py-3 bg-base-300 border-t border-secondary">
        <div className="flex items-center gap-2 text-base-content/40">
          <MdArticle size={14} />
          <span className="text-xs">ConstruBot - Plataforma de cotações</span>
        </div>
      </div>
    </aside>
  );
}
