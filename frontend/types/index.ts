export type ConversationId = "cotacao" | "engenheiro";

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot-onboarding" | "bot-cotacao";
  text: string;
  timestamp: string;
}

export interface ConversationState {
  messages: ChatMessage[];
  onboardingComplete: boolean;
  onboardingStep: number;
  userProfile: Partial<UserProfile>;
  cotacaoStep: number;
}

export interface AppSession {
  isLoggedIn: boolean;
  conversations: Record<ConversationId, ConversationState>;
}

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  version: string;
}
