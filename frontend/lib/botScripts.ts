export const ONBOARDING_STEPS = [
  "Olá! Seja bem-vindo à ConstruBot. Como esta é sua primeira vez na plataforma, precisamos de algumas informações básicas. Isso acontecerá apenas uma vez. Qual é o seu nome completo?",
  "Obrigado! Agora, qual é o seu número de telefone para contato?",
  "Perfeito! Por último, qual é o seu e-mail?",
  "Suas informações foram salvas com sucesso! Agora você pode iniciar o processo de cotação. Estou passando você para o assistente de cotações. Até mais!",
];

export const COTACAO_STEPS = [
  "Olá! Sou o assistente de cotações da ConstruBot. Vou ajudá-lo a levantar as informações necessárias para sua cotação. Para começar: qual é o tipo de obra que você deseja realizar?",
  "Ótimo! Qual é a área total estimada da construção em metros quadrados?",
  "Entendido. A obra será realizada em área urbana ou rural?",
  "Você já possui o terreno?",
  "Qual é o padrão de acabamento desejado?",
  "A construção precisará de projeto arquitetônico e/ou estrutural, ou você já os possui?",
  "Qual é o prazo desejado para conclusão da obra?",
  "Por fim, você tem um orçamento previsto?",
  "RESULTADO_FINAL",
];

export const ENGINEER_REASON_STEPS = [
  "Antes de redirecionar você, poderia nos contar o motivo pelo qual deseja falar com um engenheiro? Isso nos ajuda a melhorar a plataforma.",
];

export const ENGINEER_REASON_OPTIONS = [
  "Achei o sistema complicado de usar",
  "Preciso de uma análise mais detalhada",
  "Tenho dúvidas técnicas específicas",
  "Prefiro atendimento humano",
  "Outro motivo",
];

export function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type QuoteInputs = {
  tipoObra: string;
  area: number;
  localizacao: string;
  temTerreno: string;
  dimensoes?: string;
  padrao: string;
  temProjeto: string;
  prazo: string;
  orcamentoPrevisto: string;
};

export type QuoteResult = {
  custoM2Min: number;
  custoM2Max: number;
  totalMin: number;
  totalMax: number;
  prazoEstimado: string;
  materiais: number;
  maoDeObra: number;
  indiretosAdmin: number;
  economiaEnergetica?: string;
};

const BASE_COST: Record<string, [number, number]> = {
  simples: [2200, 2800],
  médio: [3500, 4500],
  alto: [6000, 9000],
};

const TIPO_MULTIPLIER: Record<string, number> = {
  "Casa térrea": 1.0,
  "Sobrado": 1.08,
  "Comercial": 1.15,
  "Reforma": 0.6,
  "Galpão": 0.85,
};

export function calcularOrcamento(inputs: QuoteInputs): QuoteResult {
  const [baseMin, baseMax] = BASE_COST[inputs.padrao.toLowerCase()] ?? [3000, 4000];
  const tipeMult = TIPO_MULTIPLIER[inputs.tipoObra] ?? 1.0;
  const urbanMult = inputs.localizacao.toLowerCase().includes("rural") ? 1.12 : 1.0;

  const m2Min = Math.round(baseMin * tipeMult * urbanMult);
  const m2Max = Math.round(baseMax * tipeMult * urbanMult);
  const totalMin = Math.round(m2Min * inputs.area);
  const totalMax = Math.round(m2Max * inputs.area);
  const total = (totalMin + totalMax) / 2;

  return {
    custoM2Min: m2Min,
    custoM2Max: m2Max,
    totalMin,
    totalMax,
    prazoEstimado: estimarPrazo(inputs.area, inputs.tipoObra),
    materiais: Math.round(total * 0.54),
    maoDeObra: Math.round(total * 0.35),
    indiretosAdmin: Math.round(total * 0.11),
  };
}

function estimarPrazo(area: number, tipo: string): string {
  if (tipo === "Reforma") {
    if (area < 60) return "2 a 4 meses";
    if (area < 150) return "4 a 8 meses";
    return "8 a 14 meses";
  }
  if (area < 80) return "6 a 10 meses";
  if (area < 150) return "10 a 16 meses";
  if (area < 300) return "16 a 24 meses";
  return "24 a 36 meses";
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
