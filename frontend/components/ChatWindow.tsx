"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MdSearch,
  MdMoreVert,
  MdSend,
  MdSmartToy,
  MdDoneAll,
  MdPerson,
  MdHelp,
  MdChevronRight,
  MdLocationOn,
  MdStraighten,
  MdHome,
  MdStorefront,
  MdBuild,
  MdApartment,
  MdCheck,
  MdClose,
} from "react-icons/md";
import type { ConversationState, ChatMessage } from "@/types";
import {
  ONBOARDING_STEPS,
  COTACAO_STEPS,
  formatTimestamp,
  generateId,
  calcularOrcamento,
  type QuoteInputs,
} from "@/lib/botScripts";
import HelpModal, { type HelpContent } from "@/components/HelpModal";
import QuoteResultCard from "@/components/QuoteResultCard";

interface ChatWindowProps {
  conversationId: string;
  state: ConversationState;
  onStateChange: (updater: ConversationState | ((prev: ConversationState) => ConversationState)) => void;
  onGoToEngineer: () => void;
}

const HELP_CONTENT: Record<string, HelpContent> = {
  padrao: {
    title: "Padrão de Acabamento",
    imageAlt: "Comparativo de padrões construtivos",
    body:
      "Simples: acabamentos funcionais e econômicos. Piso cerâmico, pintura lisa, louças e metais de linha básica. Ideal para investimentos enxutos.\n\n" +
      "Médio: equilíbrio entre qualidade e custo. Porcelanatos, esquadrias de alumínio, gesso, louças e metais de linha intermediária.\n\n" +
      "Alto padrão: materiais premium, mármore, automação residencial, janelas de vidro temperado, acabamentos importados.",
  },
  projeto: {
    title: "Projeto Arquitetônico e Estrutural",
    imageAlt: "Plantas e projetos de engenharia",
    body:
      "O projeto arquitetônico define a disposição dos cômodos, fachada e aproveitamento do espaço — é obrigatório para aprovação na prefeitura.\n\n" +
      "O projeto estrutural calcula as fundações, vigas, pilares e lajes que sustentam a edificação com segurança.\n\n" +
      "Sem esses projetos, a obra não pode ser regularizada e pode apresentar sérios problemas estruturais.",
  },
  terreno: {
    title: "Dimensões do Terreno",
    imageAlt: "Diagrama de terreno com dimensões",
    body:
      "As dimensões do terreno influenciam diretamente a viabilidade construtiva.\n\n" +
      "Terrenos com testada (frente) menor que 8 m podem limitar o tipo de construção.\n\n" +
      "A prefeitura exige recuos laterais, frontais e de fundo que reduzem a área útil disponível para construir.",
  },
};

function addBotMsg(
  text: string,
  sender: ChatMessage["sender"],
  base: ConversationState
): ConversationState {
  const msg: ChatMessage = {
    id: generateId(),
    sender,
    text,
    timestamp: formatTimestamp(),
  };
  return { ...base, messages: [...base.messages, msg] };
}

function addUserMsg(text: string, base: ConversationState): ConversationState {
  const msg: ChatMessage = {
    id: generateId(),
    sender: "user",
    text,
    timestamp: formatTimestamp(),
  };
  return { ...base, messages: [...base.messages, msg] };
}

function MessageBubble({
  message,
  onShowHelp,
}: {
  message: ChatMessage;
  onShowHelp: (key: string) => void;
}) {
  const isUser = message.sender === "user";
  const isOnboarding = message.sender === "bot-onboarding";

  const helpKey =
    !isUser && message.text.toLowerCase().includes("padrão de acabamento")
      ? "padrao"
      : !isUser && message.text.toLowerCase().includes("projeto arquitet")
        ? "projeto"
        : !isUser && message.text.toLowerCase().includes("terreno")
          ? "terreno"
          : null;

  return (
    <div className={`chat ${isUser ? "chat-end" : "chat-start"} mb-1`}>
      {!isUser && (
        <div className="chat-image">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
              isOnboarding ? "bg-primary" : "bg-info"
            }`}
          >
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
        {!isUser && (
          <div className={`text-xs font-semibold mb-1 ${isOnboarding ? "text-primary" : "text-accent"}`}>
            {isOnboarding ? "Informações iniciais" : "Assistente de Cotação"}
          </div>
        )}
        <div className="flex items-end gap-2 min-w-0">
          <span className="flex-1 break-words">{message.text}</span>
          {helpKey && (
            <button
              onClick={() => onShowHelp(helpKey)}
              className="btn btn-ghost btn-xs btn-circle border border-base-content/30 flex-shrink-0 mb-0.5"
              title="Saiba mais"
            >
              <MdHelp size={11} />
            </button>
          )}
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            <span className="text-base-content/40 text-[11px] whitespace-nowrap">{message.timestamp}</span>
            {isUser && <MdDoneAll size={14} className="text-accent" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartPrompt({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div className="avatar placeholder">
        <div className="w-20 rounded-full bg-base-300 text-primary">
            <MdSmartToy size={40} />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-base-content text-lg font-semibold mb-2">Assistente de Cotações</h2>
        <p className="text-base-content/50 text-sm leading-relaxed max-w-sm">
          Inicie uma conversa para receber uma estimativa personalizada para sua obra.
          O assistente irá guiá-lo passo a passo.
        </p>
      </div>
      <button onClick={onStart} className="btn btn-primary btn-wide rounded-full">
        Iniciar a conversa
      </button>
    </div>
  );
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

function OnboardingInput({
  step,
  onSubmit,
}: {
  step: number;
  onSubmit: (value: string) => void;
}) {
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
      ? phoneDigits.length < 2
        ? "Digite o DDD"
        : `Faltam ${10 - phoneDigits.length} dígito(s)`
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
        <button type="submit" disabled={isDisabled} className="btn btn-primary btn-circle mt-5">
          <MdSend size={20} />
        </button>
      </div>
    </form>
  );
}


const TIPOS_OBRA = [
  { label: "Casa térrea", icon: <MdHome size={22} /> },
  { label: "Sobrado", icon: <MdApartment size={22} /> },
  { label: "Comercial", icon: <MdStorefront size={22} /> },
  { label: "Reforma", icon: <MdBuild size={22} /> },
  { label: "Galpão", icon: <MdApartment size={22} /> },
];

function TipoObraInput({ onSelect }: { onSelect: (v: string) => void }) {
  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">Selecione o tipo de obra:</p>
      <div className="grid grid-cols-5 gap-2">
        {TIPOS_OBRA.map((t) => (
          <button
            key={t.label}
            onClick={() => onSelect(t.label)}
            className="btn btn-secondary hover:btn-primary flex-col h-auto py-3 gap-1.5 text-base-content/70 hover:text-primary-content"
          >
            {t.icon}
            <span className="text-[10px] font-medium text-center leading-tight normal-case">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


function AreaInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState("");

  const QUICK = ["50", "80", "120", "200", "300"];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(value);
    if (!n || n <= 0) return;
    onSubmit(`${value} m²`);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 bg-base-300 flex-shrink-0">
      <div className="flex gap-1.5 flex-wrap mb-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setValue(q)}
            className={`btn btn-xs rounded-full ${
              value === q ? "btn-primary" : "btn-secondary"
            }`}
          >
            {q} m²
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Área (m²)</legend>
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ou digite o valor"
            className="input w-full"
          />
        </fieldset>
        <button
          type="submit"
          disabled={!value || parseFloat(value) <= 0}
          className="btn btn-primary btn-circle mt-5"
        >
          <MdChevronRight size={20} />
        </button>
      </div>
    </form>
  );
}


function LocalizacaoInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [zona, setZona] = useState<"Urbana" | "Rural" | "">("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zona || !cidade.trim() || !estado.trim()) return;
    onSubmit(`${zona} — ${cidade.trim()}, ${estado.trim()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 bg-base-300 flex-shrink-0">
      <div className="flex gap-2 mb-2">
        {(["Urbana", "Rural"] as const).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZona(z)}
            className={`btn flex-1 gap-2 ${
              zona === z ? "btn-primary" : "btn-secondary"
            }`}
          >
            <MdLocationOn size={16} />
            {z}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Cidade</legend>
          <input
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Ex: Goiânia"
            className="input w-full"
          />
        </fieldset>
        <fieldset className="fieldset w-16">
          <legend className="fieldset-legend">UF</legend>
          <input
            type="text"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            placeholder="GO"
            maxLength={2}
            className="input w-full uppercase"
          />
        </fieldset>
        <button
          type="submit"
          disabled={!zona || !cidade.trim() || !estado.trim()}
          className="btn btn-primary btn-circle mt-5"
        >
          <MdChevronRight size={20} />
        </button>
      </div>
    </form>
  );
}


function TerrenoInput({
  onSubmit,
  onShowHelp,
}: {
  onSubmit: (v: string) => void;
  onShowHelp: () => void;
}) {
  const [possui, setPossui] = useState<boolean | null>(null);
  const [larg, setLarg] = useState("");
  const [comp, setComp] = useState("");

  function handleConfirm() {
    if (possui === null) return;
    if (possui && (!larg.trim() || !comp.trim())) return;
    const answer = possui
      ? `Sim — ${larg}m x ${comp}m`
      : "Não possuo terreno ainda";
    onSubmit(answer);
  }

  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base-content/50 text-xs">Você já possui o terreno?</p>
        <button onClick={onShowHelp} className="btn btn-ghost btn-xs btn-circle border border-base-content/30">
          <MdHelp size={11} />
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        {[
          { v: true, label: "Sim", icon: <MdCheck size={16} /> },
          { v: false, label: "Não", icon: <MdClose size={16} /> },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => setPossui(opt.v)}
            className={`btn flex-1 gap-2 ${
              possui === opt.v ? "btn-primary" : "btn-secondary"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
      {possui && (
        <div className="flex gap-2 mb-3 items-end">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Largura</legend>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <MdStraighten size={14} className="text-base-content/40" />
              <input
                type="number"
                min={1}
                value={larg}
                onChange={(e) => setLarg(e.target.value)}
                placeholder="Ex: 10"
                className="grow bg-transparent outline-none"
              />
              <span className="text-base-content/40 text-xs">m</span>
            </label>
          </fieldset>
          <span className="text-base-content/40 mb-3">×</span>
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Comprimento</legend>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="number"
                min={1}
                value={comp}
                onChange={(e) => setComp(e.target.value)}
                placeholder="Ex: 25"
                className="grow bg-transparent outline-none"
              />
              <span className="text-base-content/40 text-xs">m</span>
            </label>
          </fieldset>
        </div>
      )}
      {possui !== null && (
        <button
          onClick={handleConfirm}
          disabled={possui && (!larg.trim() || !comp.trim())}
          className="btn btn-primary w-full"
        >
          Confirmar
        </button>
      )}
    </div>
  );
}


const PADROES = [
  {
    key: "Simples",
    desc: "Cerâmica, pintura básica, louças de linha econômica",
    dotClass: "bg-base-content/40",
    badgeClass: "badge-ghost",
    range: "R$ 2.200 – 2.800/m²",
  },
  {
    key: "Médio",
    desc: "Porcelanato, gesso, esquadrias de alumínio",
    dotClass: "bg-primary",
    badgeClass: "badge-primary",
    range: "R$ 3.500 – 4.500/m²",
  },
  {
    key: "Alto",
    desc: "Mármore, automação, materiais importados",
    dotClass: "bg-warning",
    badgeClass: "badge-warning",
    range: "R$ 6.000 – 9.000/m²",
  },
];

function PadraoInput({
  onSelect,
  onShowHelp,
}: {
  onSelect: (v: string) => void;
  onShowHelp: () => void;
}) {
  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base-content/50 text-xs">Padrão de acabamento:</p>
        <button onClick={onShowHelp} className="btn btn-ghost btn-xs btn-circle border border-base-content/30">
          <MdHelp size={11} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {PADROES.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            className="flex items-center gap-3 bg-secondary hover:bg-secondary/80 rounded-xl px-4 py-3 transition-colors text-left"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${p.dotClass}`} />
            <div className="flex-1 min-w-0">
              <div className="text-base-content text-sm font-semibold">{p.key}</div>
              <div className="text-base-content/50 text-xs truncate">{p.desc}</div>
            </div>
            <div className={`text-xs font-medium flex-shrink-0 badge badge-outline ${p.badgeClass}`}>
              {p.range}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


const PROJETO_OPTIONS = [
  "Sim, já possuo projeto completo",
  "Sim, tenho apenas o arquitetônico",
  "Não, precisarei contratar",
  "Ainda não sei",
];

function ProjetoInput({
  onSelect,
  onShowHelp,
}: {
  onSelect: (v: string) => void;
  onShowHelp: () => void;
}) {
  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base-content/50 text-xs">Situação dos projetos:</p>
        <button onClick={onShowHelp} className="btn btn-ghost btn-xs btn-circle border border-base-content/30">
          <MdHelp size={11} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {PROJETO_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="flex items-center gap-3 bg-secondary hover:bg-secondary/80 rounded-xl px-4 py-3 transition-colors text-left"
          >
            <span className="text-base-content text-sm">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


const PRAZO_LABELS = [
  "Menos de 6 meses",
  "6 a 12 meses",
  "1 a 2 anos",
  "Mais de 2 anos",
  "Sem prazo definido",
];

function PrazoInput({ onSelect }: { onSelect: (v: string) => void }) {
  const [idx, setIdx] = useState(2);
  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-4">Prazo desejado para conclusão:</p>
      <div className="flex flex-col gap-3 px-1">
        <div className="flex justify-between text-[10px] text-base-content/40 px-0.5">
          {PRAZO_LABELS.map((l, i) => (
            <span
              key={l}
              className={`text-center leading-tight ${i === idx ? "text-primary font-semibold" : ""}`}
              style={{ width: `${100 / PRAZO_LABELS.length}%` }}
            >
              {l}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={PRAZO_LABELS.length - 1}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="range range-primary range-sm cursor-pointer"
        />
        <div className="flex justify-center">
          <span className="badge badge-primary badge-lg">{PRAZO_LABELS[idx]}</span>
        </div>
      </div>
      <button onClick={() => onSelect(PRAZO_LABELS[idx])} className="btn btn-primary w-full mt-4">
        Confirmar
      </button>
    </div>
  );
}


const ORCAMENTO_LABELS = [
  "Até R$ 100 mil",
  "R$ 100 mil – R$ 300 mil",
  "R$ 300 mil – R$ 600 mil",
  "R$ 600 mil – R$ 1 milhão",
  "Acima de R$ 1 milhão",
  "Ainda não defini",
];

function OrcamentoInput({ onSelect }: { onSelect: (v: string) => void }) {
  const [idx, setIdx] = useState(2);
  const isUndefined = idx === ORCAMENTO_LABELS.length - 1;
  return (
    <div className="px-4 py-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-4">Orçamento previsto:</p>
      <div className="flex flex-col gap-3 px-1">
        <input
          type="range"
          min={0}
          max={ORCAMENTO_LABELS.length - 1}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="range range-primary range-sm cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] text-base-content/40 px-0.5">
          <span>Menor</span>
          <span className="badge badge-primary badge-lg font-semibold">
            {ORCAMENTO_LABELS[idx]}
          </span>
          <span>Maior</span>
        </div>
      </div>
      {isUndefined && (
        <p className="text-base-content/40 text-xs text-center mt-2">
          Sem problema — a estimativa será calculada com base nos outros dados.
        </p>
      )}
      <button onClick={() => onSelect(ORCAMENTO_LABELS[idx])} className="btn btn-primary w-full mt-4">
        Confirmar
      </button>
    </div>
  );
}


export default function ChatWindow({
  conversationId,
  state,
  onStateChange,
  onGoToEngineer,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isCotacao = conversationId === "cotacao";
  const [helpKey, setHelpKey] = useState<string | null>(null);
  const [quoteInputs, setQuoteInputs] = useState<Partial<QuoteInputs>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const handleStartConversation = useCallback(() => {
    const next = addBotMsg(ONBOARDING_STEPS[0], "bot-onboarding", {
      ...state,
      onboardingStep: 0,
    });
    onStateChange(next);
  }, [state, onStateChange]);

  function handleOnboardingSubmit(value: string) {
    const step = state.onboardingStep;
    let next = addUserMsg(value, state);

    const profileUpdate: Partial<typeof state.userProfile> = {};
    if (step === 0) profileUpdate.name = value;
    else if (step === 1) profileUpdate.phone = value;
    else if (step === 2) profileUpdate.email = value;

    next = { ...next, userProfile: { ...next.userProfile, ...profileUpdate } };

    if (step < 2) {
      next = addBotMsg(ONBOARDING_STEPS[step + 1], "bot-onboarding", next);
      next = { ...next, onboardingStep: step + 1 };
    } else {
      next = addBotMsg(ONBOARDING_STEPS[3], "bot-onboarding", next);
      next = { ...next, onboardingComplete: true, onboardingStep: 3 };

      setTimeout(() => {
        onStateChange((prev: ConversationState) => {
          let s = addBotMsg(COTACAO_STEPS[0], "bot-cotacao", prev);
          s = { ...s, cotacaoStep: 0 };
          return s;
        });
      }, 1200);
    }

    onStateChange(next);
  }

  function handleCotacaoStep(value: string) {
    const step = state.cotacaoStep;
    let next = addUserMsg(value, state);

    const newInputs = { ...quoteInputs };
    if (step === 0) newInputs.tipoObra = value;
    else if (step === 1) newInputs.area = parseFloat(value);
    else if (step === 2) newInputs.localizacao = value;
    else if (step === 3) {
      newInputs.temTerreno = value;
      if (value.startsWith("Sim")) newInputs.dimensoes = value;
    }
    else if (step === 4) newInputs.padrao = value;
    else if (step === 5) newInputs.temProjeto = value;
    else if (step === 6) newInputs.prazo = value;
    else if (step === 7) newInputs.orcamentoPrevisto = value;

    setQuoteInputs(newInputs);

    const nextStep = step + 1;
    const isFinalStep = nextStep >= COTACAO_STEPS.length - 1;

    if (!isFinalStep) {
      next = addBotMsg(COTACAO_STEPS[nextStep], "bot-cotacao", next);
      next = { ...next, cotacaoStep: nextStep };
    } else {
      next = { ...next, cotacaoStep: COTACAO_STEPS.length - 1 };
    }

    onStateChange(next);
  }

  const hasStarted = state.messages.length > 0;
  const onboardingActive = !state.onboardingComplete && hasStarted;
  const cotacaoActive =
    state.onboardingComplete && state.cotacaoStep < COTACAO_STEPS.length - 1;
  const cotacaoFinished =
    state.onboardingComplete && state.cotacaoStep >= COTACAO_STEPS.length - 1;

  const currentCotacaoStep = state.cotacaoStep;

  function renderCotacaoInput() {
    switch (currentCotacaoStep) {
      case 0:
        return <TipoObraInput onSelect={handleCotacaoStep} />;
      case 1:
        return <AreaInput onSubmit={handleCotacaoStep} />;
      case 2:
        return <LocalizacaoInput onSubmit={handleCotacaoStep} />;
      case 3:
        return (
          <TerrenoInput
            onSubmit={handleCotacaoStep}
            onShowHelp={() => setHelpKey("terreno")}
          />
        );
      case 4:
        return (
          <PadraoInput
            onSelect={handleCotacaoStep}
            onShowHelp={() => setHelpKey("padrao")}
          />
        );
      case 5:
        return (
          <ProjetoInput
            onSelect={handleCotacaoStep}
            onShowHelp={() => setHelpKey("projeto")}
          />
        );
      case 6:
        return <PrazoInput onSelect={handleCotacaoStep} />;
      case 7:
        return <OrcamentoInput onSelect={handleCotacaoStep} />;
      default:
        return null;
    }
  }

  const quoteResult =
    cotacaoFinished &&
    quoteInputs.tipoObra &&
    quoteInputs.area &&
    quoteInputs.localizacao &&
    quoteInputs.padrao
      ? calcularOrcamento(quoteInputs as QuoteInputs)
      : null;

  return (
    <>
      {helpKey && HELP_CONTENT[helpKey] && (
        <HelpModal
          content={HELP_CONTENT[helpKey]}
          onClose={() => setHelpKey(null)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full bg-base-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-base-300 flex-shrink-0">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-10 rounded-full bg-primary text-primary-content">
            <MdSmartToy size={20} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base-content font-medium text-[15px]">Realizar Cotação</div>
            <div className="text-base-content/50 text-xs">Assistente automatizado</div>
          </div>
          <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-sm btn-circle"><MdSearch size={19} /></button>
          <button className="btn btn-ghost btn-sm btn-circle"><MdMoreVert size={20} /></button>
          </div>
        </div>

        {!hasStarted ? (
          <StartPrompt onStart={handleStartConversation} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-[6%] py-4">
              <div className="flex justify-center mb-3">
                <span className="badge badge-ghost text-base-content/40 text-xs">Hoje</span>
              </div>
              <div className="flex flex-col">
                {state.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onShowHelp={setHelpKey}
                  />
                ))}
              </div>

              {cotacaoFinished && quoteResult && (
                <QuoteResultCard
                  result={quoteResult}
                  inputs={quoteInputs as QuoteInputs}
                  onTalkToEngineer={onGoToEngineer}
                />
              )}

              {cotacaoFinished && !quoteResult && (
                <div className="text-center text-base-content/50 text-sm py-4">
                  Cotação enviada. Aguarde o contato de um engenheiro.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {onboardingActive && state.onboardingStep < 3 && (
              <OnboardingInput
                step={state.onboardingStep}
                onSubmit={handleOnboardingSubmit}
              />
            )}
            {cotacaoActive && renderCotacaoInput()}
          </>
        )}
      </div>
    </>
  );
}
