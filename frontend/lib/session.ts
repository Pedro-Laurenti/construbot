import type { AppSession, ConversationState } from "@/types";

const SESSION_KEY = "construbot_session";

const defaultConversation = (): ConversationState => ({
  messages: [],
  cotacaoStep: 0,
  cotacaoComplete: false,
});

const defaultSession = (): AppSession => ({
  isLoggedIn: false,
  userProfile: {},
  conversations: {
    inicial: defaultConversation(),
    cotacao: defaultConversation(),
    engenheiro: defaultConversation(),
  },
});

export function loadSession(): AppSession {
  if (typeof window === "undefined") return defaultSession();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return defaultSession();
    return JSON.parse(raw) as AppSession;
  } catch {
    return defaultSession();
  }
}

export function saveSession(session: AppSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}
