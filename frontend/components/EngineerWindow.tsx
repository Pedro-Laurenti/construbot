"use client";

import { useState, useRef, useEffect } from "react";
import {
  RiSearchLine,
  RiMoreLine,
  RiSendPlane2Line,
  RiUserVoiceLine,
  RiExternalLinkLine,
  RiCheckDoubleLine,
} from "react-icons/ri";
import type { ConversationState, ChatMessage } from "@/types";
import {
  ENGINEER_REASON_STEPS,
  ENGINEER_REASON_OPTIONS,
  formatTimestamp,
  generateId,
} from "@/lib/botScripts";

const WHATSAPP_NUMBER = "5511999999999";

interface EngineerWindowProps {
  state: ConversationState;
  onStateChange: (updater: ((prev: ConversationState) => ConversationState) | ConversationState) => void;
  userName: string;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";
  return (
    <div className={`chat ${isUser ? "chat-end" : "chat-start"} mb-1`}>
      {!isUser && (
        <div className="chat-image">
          <div className="w-7 h-7 rounded-full bg-info flex items-center justify-center text-info-content">
            <RiUserVoiceLine size={14} />
          </div>
        </div>
      )}
      <div
        className={`chat-bubble text-base-content text-sm leading-relaxed shadow-sm ${
          isUser ? "bg-[#005c4b]" : "bg-base-300"
        }`}
        style={{ maxWidth: "65%", minWidth: "72px" }}
      >
        {!isUser && (
          <div className="text-accent text-xs font-semibold mb-0.5">Assistente de Redirecionamento</div>
        )}
        <div className="flex items-end gap-2 min-w-0">
          <span className="flex-1 break-words">{message.text}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            <span className="text-base-content/40 text-[11px] whitespace-nowrap">{message.timestamp}</span>
            {isUser && <RiCheckDoubleLine size={14} className="text-accent" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildWhatsAppUrl(reason: string, userName: string): string {
  const text = encodeURIComponent(
    `Olá! Meu nome é ${userName}. Gostaria de falar com um engenheiro. Motivo: ${reason}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export default function EngineerWindow({
  state,
  onStateChange,
  userName,
}: EngineerWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [reasonAsked, setReasonAsked] = useState(false);
  const [reasonGiven, setReasonGiven] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  function addBotMessage(text: string, base: ConversationState): ConversationState {
    const msg: ChatMessage = {
      id: generateId(),
      sender: "bot-onboarding",
      text,
      timestamp: formatTimestamp(),
    };
    return { ...base, messages: [...base.messages, msg] };
  }

  function addUserMessage(text: string, base: ConversationState): ConversationState {
    const msg: ChatMessage = {
      id: generateId(),
      sender: "user",
      text,
      timestamp: formatTimestamp(),
    };
    return { ...base, messages: [...base.messages, msg] };
  }

  function handleStart() {
    let next = addBotMessage(ENGINEER_REASON_STEPS[0], state);
    onStateChange(next);
    setReasonAsked(true);
  }

  function handleOptionSelect(option: string) {
    let next = addUserMessage(option, state);
    next = addBotMessage(
      `Agradecemos o contato! Clique no botão abaixo para iniciar a conversa com um engenheiro pelo WhatsApp.`,
      next
    );
    setReasonGiven(option);
    onStateChange(next);
  }

  function handleFreeText() {
    if (!inputValue.trim()) return;
    handleOptionSelect(inputValue.trim());
    setInputValue("");
  }

  const hasStarted = state.messages.length > 0;
  const showRedirectButton = reasonGiven !== "";
  const whatsappUrl = buildWhatsAppUrl(reasonGiven, userName);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-base-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-base-300 flex-shrink-0">
        <div className="avatar placeholder flex-shrink-0">
          <div className="w-10 rounded-full bg-info text-info-content">
            <RiUserVoiceLine size={20} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base-content font-medium text-[15px] truncate">Falar com Engenheiro</div>
          <div className="text-base-content/50 text-xs">Atendimento humano especializado</div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-sm btn-circle"><RiSearchLine size={19} /></button>
          <button className="btn btn-ghost btn-sm btn-circle"><RiMoreLine size={20} /></button>
        </div>
      </div>

      {/* Body */}
      {!hasStarted ? (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
          <div className="avatar placeholder">
            <div className="w-20 rounded-full bg-base-300 text-info">
              <RiUserVoiceLine size={40} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-base-content text-lg font-semibold mb-2">Atendimento com Engenheiro</h2>
            <p className="text-base-content/50 text-sm leading-relaxed max-w-sm">
              Você será redirecionado para uma conversa no WhatsApp com um engenheiro especializado.
              Antes disso, responda uma pergunta rápida.
            </p>
          </div>
          <button onClick={handleStart} className="btn btn-info btn-wide rounded-full">
            Continuar
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-[6%] py-4">
              <div className="flex justify-center mb-3">
                <span className="badge badge-ghost text-base-content/40 text-xs">Hoje</span>
              </div>
            <div className="flex flex-col">
              {state.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>

            {showRedirectButton && (
              <div className="flex justify-center mt-6">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-wide rounded-full gap-2"
                >
                  <RiExternalLinkLine size={18} />
                  Abrir conversa no WhatsApp
                </a>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {reasonAsked && !showRedirectButton && (
            <div className="flex-shrink-0">
              <div className="px-4 pt-3 pb-1 bg-base-100 flex flex-wrap gap-2">
                {ENGINEER_REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleOptionSelect(opt)}
                    className="btn btn-secondary btn-sm rounded-full"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {/* Free text fallback */}
              <div className="flex items-center gap-2 px-4 py-3 bg-base-300">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleFreeText(); }}
                  placeholder="Ou descreva o motivo..."
                  className="input input-bordered flex-1 text-sm"
                />
                <button
                  onClick={handleFreeText}
                  disabled={!inputValue.trim()}
                  className="btn btn-info btn-circle"
                >
                  <RiSendPlane2Line size={20} />
                </button>
              </div>
            </div>
          )}

          {showRedirectButton && (
            <div className="px-4 py-4 bg-[#202c33] flex-shrink-0 text-center">
              <span className="text-[#8696a0] text-sm">
                Clique no botao acima para abrir o WhatsApp.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
