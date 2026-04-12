export type ConversationId = "inicial" | "cotacao" | "engenheiro";

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot-onboarding" | "bot-cotacao" | "bot-inicial";
  text: string;
  timestamp: string;
}

export interface ConversationState {
  messages: ChatMessage[];
  cotacaoStep: number;
  cotacaoComplete: boolean;
}

export interface AppSession {
  isLoggedIn: boolean;
  userProfile: Partial<UserProfile>;
  conversations: Record<ConversationId, ConversationState>;
}

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  version: string;
}
