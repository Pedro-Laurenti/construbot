"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import EngineerWindow from "@/components/EngineerWindow";
import LoginPage from "@/components/LoginPage";
import { loadSession, saveSession, clearSession } from "@/lib/session";
import type { AppSession, ConversationId, ConversationState, HealthResponse } from "@/types";

export default function Home() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [selectedId, setSelectedId] = useState<ConversationId>("cotacao");
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    setSession(loadSession());
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<HealthResponse>;
      })
      .then((data) => setApiStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  function handleLogin() {
    const updated: AppSession = { ...loadSession(), isLoggedIn: true };
    saveSession(updated);
    setSession(updated);
  }

  function handleLogout() {
    clearSession();
    setSession(loadSession());
  }

  function handleConversationChange(
    id: ConversationId,
    updater: ConversationState | ((prev: ConversationState) => ConversationState)
  ) {
    setSession((prev) => {
      if (!prev) return prev;
      const current = prev.conversations[id];
      const next = typeof updater === "function" ? updater(current) : updater;
      const updated: AppSession = {
        ...prev,
        conversations: { ...prev.conversations, [id]: next },
      };
      saveSession(updated);
      return updated;
    });
  }

  if (!session) return null;

  if (!session.isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const cotacaoState = session.conversations.cotacao;
  const userName = cotacaoState.userProfile.name ?? "Usuario";

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* API status badge */}
      <div className="fixed top-3 right-3 z-50">
        <div className={`p-1.5 rounded-full ${
          apiStatus === "ok" ? "badge-success" :
          apiStatus === "error" ? "badge-error" : "badge-ghost"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            apiStatus === "loading" ? "animate-pulse" : ""
          }`} />
        </div>
      </div>

      <Sidebar
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLogout={handleLogout}
        userName={userName}
      />

      {selectedId === "cotacao" ? (
        <ChatWindow
          conversationId="cotacao"
          state={session.conversations.cotacao}
          onStateChange={(updater) => handleConversationChange("cotacao", updater)}
          onGoToEngineer={() => setSelectedId("engenheiro")}
        />
      ) : (
        <EngineerWindow
          state={session.conversations.engenheiro}
          onStateChange={(updater) => handleConversationChange("engenheiro", updater)}
          userName={userName}
        />
      )}
    </div>
  );
}
