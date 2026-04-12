"use client";

import { useState } from "react";
import { MdSmartToy, MdChevronRight, MdEdit, MdDoneAll, MdPerson, MdPhone, MdEmail, MdCheck } from "react-icons/md";
import type { ConversationState, ChatMessage, UserProfile } from "@/types";
import { ONBOARDING_STEPS, formatTimestamp, generateId } from "@/lib/botScripts";

interface InicialWindowProps {
  state: ConversationState;
  onStateChange: (updater: ConversationState | ((prev: ConversationState) => ConversationState)) => void;
  userProfile: Partial<UserProfile>;
  onProfileChange: (profile: Partial<UserProfile>) => void;
  onGoToCotacao: () => void;
}

function formatNationalPhone(digits: string): string {
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length === 0) return `(${ddd}) `;
  if (local.length <= 4) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
}

function OnboardingInput({ step, onSubmit }: { step: number; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  const config = [
    { label: "Nome completo", placeholder: "Seu nome completo", type: "text" },
    { label: "Telefone", placeholder: "", type: "tel" },
    { label: "E-mail", placeholder: "seu@email.com", type: "email" },
  ][step] ?? { label: "", placeholder: "", type: "text" };

  const phoneValid = phoneDigits.length >= 10;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneDigits(raw);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!phoneValid) return;
      onSubmit(`+55 ${formatNationalPhone(phoneDigits)}`);
      setPhoneDigits("");
    } else {
      if (!value.trim()) return;
      onSubmit(value.trim());
      setValue("");
    }
  }

  const isDisabled = step === 1 ? !phoneValid : !value.trim();
  const phoneHint =
    step === 1 && phoneDigits.length > 0 && !phoneValid
      ? phoneDigits.length < 2 ? "Digite o DDD" : `Faltam ${10 - phoneDigits.length} dígito(s)`
      : null;

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 bg-base-300 flex-shrink-0">
      <div className="flex items-center gap-2">
        {step === 1 ? (
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">{config.label}</legend>
            <div className="flex items-center border border-base-content/20 rounded-lg overflow-hidden bg-base-100">
              <span className="text-base-content/40 text-sm px-3 font-mono border-r border-base-content/20 select-none flex-shrink-0 self-stretch flex items-center">+55</span>
              <input
                type="tel"
                inputMode="numeric"
                value={formatNationalPhone(phoneDigits)}
                onChange={handlePhoneChange}
                placeholder="(62) 98448-3697"
                autoFocus
                className="input flex-1 border-none bg-transparent font-mono tracking-wide text-sm"
              />
            </div>
            {phoneHint && <p className="label text-base-content/40 text-[11px]">{phoneHint}</p>}
          </fieldset>
        ) : (
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">{config.label}</legend>
            <input
              type={config.type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              autoFocus
              className="input w-full"
            />
          </fieldset>
        )}
        <button type="submit" disabled={isDisabled} className="btn btn-success btn-circle mt-5">
          <MdChevronRight size={20} />
        </button>
      </div>
    </form>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";
  return (
    <div className={`chat ${isUser ? "chat-end" : "chat-start"} mb-1`}>
      {!isUser && (
        <div className="chat-image">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-success">
            <MdSmartToy size={14} />
          </div>
        </div>
      )}
      <div
        className={`chat-bubble text-sm leading-relaxed shadow-sm ${
          isUser ? "bg-primary text-primary-content" : "bg-base-300 text-base-content"
        }`}
        style={{ maxWidth: "65%", minWidth: "72px" }}
      >
        {!isUser && <div className="text-xs font-semibold mb-1 text-success">Assistente inicial</div>}
        <div className="flex items-end gap-2 min-w-0">
          <span className="flex-1 break-words">{message.text}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            <span className="text-base-content/40 text-[11px] whitespace-nowrap">{message.timestamp}</span>
            {isUser && <MdDoneAll size={14} className="text-accent" />}
          </div>
        </div>
      </div>
    </div>
  );
}

const EDIT_STEPS = [
  "Vamos atualizar seus dados. Qual é o seu nome completo?",
  "Qual é o seu número de telefone para contato?",
  "Qual é o seu e-mail?",
  "Dados atualizados com sucesso!",
];

export default function InicialWindow({
  state,
  onStateChange,
  userProfile,
  onProfileChange,
  onGoToCotacao,
}: InicialWindowProps) {
  const hasProfile = !!userProfile.name;
  const [mode, setMode] = useState<"profile" | "collecting">(hasProfile ? "profile" : "collecting");
  const [step, setStep] = useState(0);
  const [pendingProfile, setPendingProfile] = useState<Partial<UserProfile>>({});
  const [editDone, setEditDone] = useState(false);

  const isFirstTime = !hasProfile;
  const scripts = isFirstTime ? ONBOARDING_STEPS : EDIT_STEPS;
  const inFlow = state.messages.length > 0;
  const flowComplete = inFlow && step >= 3;

  function startFlow() {
    const msg: ChatMessage = {
      id: generateId(),
      sender: "bot-inicial",
      text: scripts[0],
      timestamp: formatTimestamp(),
    };
    onStateChange({ ...state, messages: [msg] });
    setStep(0);
    setPendingProfile({});
    setEditDone(false);
    setMode("collecting");
  }

  function handleSubmit(value: string) {
    const userMsg: ChatMessage = {
      id: generateId(),
      sender: "user",
      text: value,
      timestamp: formatTimestamp(),
    };

    const updated: Partial<UserProfile> = { ...pendingProfile };
    if (step === 0) updated.name = value;
    else if (step === 1) updated.phone = value;
    else if (step === 2) updated.email = value;

    setPendingProfile(updated);

    const nextStep = step + 1;
    const messages = [...state.messages, userMsg];

    if (nextStep < 3) {
      const botMsg: ChatMessage = {
        id: generateId(),
        sender: "bot-inicial",
        text: scripts[nextStep],
        timestamp: formatTimestamp(),
      };
      onStateChange({ ...state, messages: [...messages, botMsg] });
      setStep(nextStep);
    } else {
      const doneMsg: ChatMessage = {
        id: generateId(),
        sender: "bot-inicial",
        text: scripts[3],
        timestamp: formatTimestamp(),
      };
      onStateChange({ ...state, messages: [...messages, doneMsg] });
      onProfileChange({ ...userProfile, ...updated });
      setStep(3);
      setEditDone(true);
    }
  }

  const header = (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-base-300 flex-shrink-0">
      <div className="avatar placeholder flex-shrink-0">
        <div className="w-10 rounded-full bg-success text-success-content">
          <MdSmartToy size={20} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base-content font-medium text-[15px]">Assistente inicial</div>
        <div className="text-base-content/50 text-xs">Informações sobre você</div>
      </div>
    </div>
  );

  if (mode === "profile" && hasProfile) {
    const initials = (userProfile.name ?? "")
      .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

    return (
      <div className="flex-1 flex flex-col min-w-0 h-full bg-base-200">
        {header}
        <div className="flex flex-col items-center justify-center h-full gap-5 px-8">
          <div className="avatar placeholder">
            <div className="w-20 rounded-full bg-success text-success-content font-bold text-2xl select-none">
              <span>{initials}</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-base-content text-lg font-semibold">
              Olá, {userProfile.name}!
            </h2>
            <p className="text-base-content/50 text-sm mt-1">Seus dados estão salvos.</p>
          </div>

          <div className="w-full max-w-sm bg-base-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
              <MdPerson size={16} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-base-content/40 text-[11px] uppercase tracking-wide">Nome</div>
                <div className="text-base-content text-sm font-medium truncate">{userProfile.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
              <MdPhone size={16} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-base-content/40 text-[11px] uppercase tracking-wide">Telefone</div>
                <div className="text-base-content text-sm font-medium truncate">{userProfile.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <MdEmail size={16} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-base-content/40 text-[11px] uppercase tracking-wide">E-mail</div>
                <div className="text-base-content text-sm font-medium truncate">{userProfile.email}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button onClick={onGoToCotacao} className="btn btn-success rounded-full gap-2">
              Ir para cotação
              <MdChevronRight size={18} />
            </button>
            <button
              onClick={startFlow}
              className="btn btn-ghost rounded-full gap-2 text-base-content/50 hover:text-base-content"
            >
              <MdEdit size={16} />
              Editar dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "collecting" && !inFlow) {
    return (
      <div className="flex-1 flex flex-col min-w-0 h-full bg-base-200">
        {header}
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
          <div className="avatar placeholder">
            <div className="w-20 rounded-full bg-base-300 text-success">
              <MdSmartToy size={40} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-base-content text-lg font-semibold mb-2">Bem-vindo à ConstruBot</h2>
            <p className="text-base-content/50 text-sm leading-relaxed max-w-sm">
              Antes de iniciar a cotação, precisamos de algumas informações básicas. Isso acontecerá apenas uma vez.
            </p>
          </div>
          <button onClick={startFlow} className="btn btn-success btn-wide rounded-full">
            Começar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-base-200">
      {header}
      <div className="flex-1 overflow-y-auto px-[6%] py-4">
        <div className="flex justify-center mb-3">
          <span className="badge badge-ghost text-base-content/40 text-xs">Hoje</span>
        </div>
        <div className="flex flex-col">
          {state.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
        {flowComplete && (
          <div className="flex justify-center mt-4">
            <button onClick={onGoToCotacao} className="btn btn-success btn-wide rounded-full gap-2">
              {editDone ? <MdCheck size={18} /> : <MdChevronRight size={18} />}
              {editDone ? "Ir para cotação" : "Iniciar Cotação"}
            </button>
          </div>
        )}
      </div>
      {!flowComplete && <OnboardingInput step={step} onSubmit={handleSubmit} />}
    </div>
  );
}
