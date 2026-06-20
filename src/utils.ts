import { RawDemand, GeneralMetrics, RecolhimentoMetrics, OperationalEfficiencyMetrics, SchedulingAdherenceMetrics, AuditRecord } from "./types";

/**
 * Helper to determine if a status string represents a completed/concluded task.
 * Uses NFD normalization to strip Portuguese accents, enabling super robust matching
 * for "Concluído", "Concluido", "Concluída", "Concluida", etc.
 */
export function isStatusCompleted(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return norm.includes("concluid") && !norm.includes("nao");
}

/**
 * Helper to determine if a status string represents a rescheduled task.
 */
export function isStatusRescheduled(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return norm.includes("reagendado");
}

/**
 * Helper to determine if a status string represents a not performed task.
 */
export function isStatusNotPerformed(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return norm.includes("nao realizado") || norm.includes("não realizado");
}

/**
 * Classifies a demand based on Column 4 (demand type/name)
 */
export function classifyDemand(demandName: string): "Infraestrutura" | "Suporte" | "Recolhimentos" | "Ativações" | "Entrega de Carnê" {
  const name = (demandName || "").toLowerCase();
  
  const isInfra = name.includes("infraestrutura") || name.includes("engenharia");
  if (isInfra) return "Infraestrutura";
  
  const isCarne = name.includes("carnê") || name.includes("carne");
  if (isCarne) return "Entrega de Carnê";
  
  const isRecolhimento = name.includes("recolhimento") || name.includes("cancelamento");
  if (isRecolhimento) return "Recolhimentos";

  const isSuporte = name.includes("deslocamento");
  if (isSuporte) return "Suporte";
  
  return "Ativações";
}

/**
 * Robustly parses a row returned by the Apps Script endpoint (array or object)
 * and normalizes it to a RawDemand structure
 */
export function parseSheetRow(row: any, index: number): RawDemand {
  let protocolVal = "";
  let statusVal = "";
  let reasonVal = "";
  let nivelVal: "com_deslocamento" | "sem_deslocamento" | "" = "";
  let gruposVal = "";
  let demandVal = ""; // TipoOS
  let technicianVal = ""; // name
  let cityVal = "";
  let scheduleDateVal = "";

  if (Array.isArray(row)) {
    protocolVal = String(row[0] || "").trim();
    statusVal = String(row[1] || "").trim();
    reasonVal = String(row[2] || "").trim();
    
    const rawNivel = String(row[3] || "").trim().toLowerCase();
    nivelVal = rawNivel.includes("com") ? "com_deslocamento" : rawNivel.includes("sem") ? "sem_deslocamento" : "";
    
    gruposVal = String(row[4] || "").trim();
    demandVal = String(row[5] || "").trim();
    technicianVal = String(row[6] || "").trim();
    cityVal = String(row[7] || "").trim();
    scheduleDateVal = String(row[8] || "").trim();
  } else if (row && typeof row === "object") {
    const keys = Object.keys(row);
    const getVal = (colNum: number, searchTerms: string[], fallbackKey: string) => {
      for (const term of searchTerms) {
        const key = keys.find(k => {
          const lk = k.toLowerCase();
          return lk === term || lk.includes(term);
        });
        if (key) return String(row[key] || "");
      }
      const cnKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === `coluna${colNum}`);
      if (cnKey) return String(row[cnKey] || "");
      if (row[fallbackKey] !== undefined) return String(row[fallbackKey]);
      if (keys[colNum - 1]) return String(row[keys[colNum - 1]] || "");
      return "";
    };

    protocolVal = getVal(1, ["protocol_number", "protocolo", "id_protocolo"], "protocol_number");
    statusVal = getVal(2, ["status"], "status");
    reasonVal = getVal(3, ["reason", "motivo", "justificativa"], "reason");
    
    const rawNivel = getVal(4, ["nivel", "level", "deslocamento"], "nivel").toLowerCase();
    nivelVal = rawNivel.includes("com") ? "com_deslocamento" : rawNivel.includes("sem") ? "sem_deslocamento" : "";
    
    gruposVal = getVal(5, ["grupos", "groups"], "grupos");
    demandVal = getVal(6, ["tipo_os", "tipoos", "demanda", "servico"], "tipo_os");
    technicianVal = getVal(7, ["name", "nome", "tecnico"], "name");
    cityVal = getVal(8, ["city", "cidade"], "city");
    scheduleDateVal = getVal(9, ["schedule_date", "date", "data"], "schedule_date");
  }

  // Prettify target date for the table & charts
  const dateObj = parseDate(scheduleDateVal);
  let dateFormatted = scheduleDateVal;
  if (dateObj) {
    const isIso = scheduleDateVal.includes("T") || (scheduleDateVal.includes("-") && scheduleDateVal.length >= 10);
    const day = String(isIso ? dateObj.getUTCDate() : dateObj.getDate()).padStart(2, "0");
    const month = String(isIso ? (dateObj.getUTCMonth() + 1) : (dateObj.getMonth() + 1)).padStart(2, "0");
    const year = isIso ? dateObj.getUTCFullYear() : dateObj.getFullYear();
    dateFormatted = `${day}/${month}/${year}`;
  }

  const clientVal = protocolVal ? `Protocolo: #${protocolVal}` : `OS #${index + 1}`;
  const category = classifyDemand(demandVal);

  return {
    date: dateFormatted,
    status: statusVal,
    client: clientVal,
    protocol_number: protocolVal,
    demand: demandVal,
    reason: reasonVal,
    technician: technicianVal,
    city: cityVal,
    category,
    nivel: nivelVal,
    grupos: gruposVal,
    raw: row
  };
}

/**
 * Parses a date string into a Date object.
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  const parts = dateString.split("/");
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Groups demands by protocol number — mas SOMENTE quando o mesmo protocolo
 * aparece no mesmo dia (date) com o mesmo status. Esse é o único cenário em que
 * a duplicidade é causada por múltiplos técnicos no mesmo evento/atendimento.
 * Se o protocolo aparece em datas ou status diferentes, são eventos distintos
 * (tentativas diferentes) e devem permanecer como linhas separadas.
 */
export function groupDemandsByProtocol(demands: RawDemand[]): RawDemand[] {
  const grouped: { [key: string]: RawDemand } = {};

  demands.forEach(demand => {
    if (!demand.protocol_number) return;

    // Chave de agrupamento: protocolo + data + status (evento específico)
    const key = `${demand.protocol_number}__${demand.date}__${demand.status}`;

    if (!grouped[key]) {
      grouped[key] = { ...demand, technicians: [demand.technician], isGroupedProtocol: true };
    }
    if (demand.technician && !grouped[key].technicians?.includes(demand.technician)) {
      grouped[key].technicians?.push(demand.technician);
    }
  });
  return Object.values(grouped);
};

/**
 * Calculates metrics for primary dashboard
 */
export function calculateGeneralMetrics(demands: RawDemand[]): GeneralMetrics {
  const totalDemands = demands.length;
  const totalCompleted = demands.filter(d => isStatusCompleted(d.status)).length;
  const schedulingEfficiency = totalDemands > 0 ? (totalCompleted / totalDemands) * 100 : 0;

  let completedSuporte = 0;
  let completedAtivacoes = 0;
  let completedInfraestrutura = 0;
  let completedRecolhimentos = 0;
  let completedEntregaCarne = 0;
  let totalSuporte = 0;
  let totalAtivacoes = 0;
  let totalInfraestrutura = 0;
  let totalRecolhimentos = 0;
  let totalEntregaCarne = 0;

  demands.forEach(d => {
    const isCompleted = isStatusCompleted(d.status);
    switch (d.category) {
      case "Suporte":
        totalSuporte++;
        if (isCompleted) completedSuporte++;
        break;
      case "Ativações":
        totalAtivacoes++;
        if (isCompleted) completedAtivacoes++;
        break;
      case "Infraestrutura":
        totalInfraestrutura++;
        if (isCompleted) completedInfraestrutura++;
        break;
      case "Recolhimentos":
        totalRecolhimentos++;
        if (isCompleted) completedRecolhimentos++;
        break;
      case "Entrega de Carnê":
        totalEntregaCarne++;
        if (isCompleted) completedEntregaCarne++;
        break;
    }
  });

  return {
    totalDemands, totalCompleted, schedulingEfficiency,
    completedSuporte, completedAtivacoes, completedInfraestrutura, completedRecolhimentos, completedEntregaCarne,
    totalSuporte, totalAtivacoes, totalInfraestrutura, totalRecolhimentos, totalEntregaCarne
  };
}

/**
 * Calcula métricas do dashboard de Recolhimentos.
 * Base: categoria "Recolhimentos" (tipo_os contém "Recolhimento" e/ou "Cancelamento"), SEM deduplicação.
 *
 * - totalAttempts: Concluído + Reagendado + Não Realizado
 * - effectiveRetrievals (Total Recolhidos): apenas Concluído
 * - sentToBilling: reason contém "enviado a cobrança" (correspondência parcial)
 * - retrievalEffectiveness: Concluído / (Concluído + Não Realizado) — exclui Reagendado do denominador
 * - reasonBreakdown: contagem de motivos (coluna reason) para Reagendado + Não Realizado, ordenado por frequência
 */
export function calculateRecolhimentoMetrics(demands: RawDemand[]): RecolhimentoMetrics {
  const recolhimentos = demands.filter(d => d.category === "Recolhimentos");

  const completed = recolhimentos.filter(d => isStatusCompleted(d.status));
  const rescheduled = recolhimentos.filter(d => isStatusRescheduled(d.status));
  const notPerformed = recolhimentos.filter(d => isStatusNotPerformed(d.status));

  const totalAttempts = completed.length + rescheduled.length + notPerformed.length;
  const effectiveRetrievals = completed.length;

  const sentToBilling = recolhimentos.filter(d => {
    const norm = (d.reason || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return norm.includes("enviado a cobranca");
  }).length;

  const recoveryBase = completed.length + notPerformed.length;
  const retrievalEffectiveness = recoveryBase > 0 ? (effectiveRetrievals / recoveryBase) * 100 : 0;

  // Gráfico de motivos: Reagendado + Não Realizado, agrupado por reason (coluna C)
  const reasonCounts: { [key: string]: number } = {};
  [...rescheduled, ...notPerformed].forEach(d => {
    const reason = (d.reason || "").trim();
    if (reason !== "") {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  });
  const reasonBreakdown = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAttempts,
    effectiveRetrievals,
    sentToBilling,
    retrievalEffectiveness,
    reasonBreakdown
  };
}
/**
 * Eficiência Operacional: concluídas com deslocamento / total com deslocamento.
 */
export function calculateOperationalEfficiencyMetrics(demands: RawDemand[]): OperationalEfficiencyMetrics {
  const displacementDemands = demands.filter(d => d.nivel === "com_deslocamento");
  const total = displacementDemands.length;
  const completed = displacementDemands.filter(d => isStatusCompleted(d.status)).length;
  const efficiency = total > 0 ? (completed / total) * 100 : 0;

  return {
    totalDemandsWithDisplacement: total,
    completedDemandsWithDisplacement: completed,
    operationalEfficiency: efficiency
  };
}

/**
 * Aderência do Agendamento: exclui tipos específicos.
 */
export function calculateSchedulingAdherenceMetrics(demands: RawDemand[]): SchedulingAdherenceMetrics {
  const excludedTypes = ["recolhimento", "cancelamento", "entrega de carne"];
  const eligible = demands.filter(d => 
    d.nivel === "com_deslocamento" && 
    !excludedTypes.some(type => d.demand.toLowerCase().includes(type))
  );

  const total = eligible.length;
  const adherent = eligible.filter(d => isStatusCompleted(d.status)).length;
  const adherence = total > 0 ? (adherent / total) * 100 : 0;

  return {
    totalDemandsForAdherence: total,
    adherentDemands: adherent,
    schedulingAdherence: adherence
  };
};

/**
 * Filter demands that need auditing based on operational criteria.
 */
export const filterAuditDemands = (demands: RawDemand[]): RawDemand[] => {
  return demands.filter(demand => {
    const s = demand.status.toLowerCase();
    const isReagendado = s.includes("reagendado");
    const isComDeslocamento = demand.nivel === "com_deslocamento";
    const isRelevantReason = [
      "cliente não estava",
      "cliente solicitou reagenda",
      "cliente solicitou reagendamento",
      "não deu tempo",
      "chuva",
      "equipe deslocada",
      "equipe não deslocada"
    ].some(reason => demand.reason.toLowerCase().includes(reason));

    return isReagendado && isComDeslocamento && isRelevantReason;
  });
};

export const calculateAuditIndicators = (auditRecords: AuditRecord[]) => {
  let totalAudited = auditRecords.length;
  let triedToConfirmYes = auditRecords.filter(r => r.triedToConfirm === 'SIM').length;
  let clientConfirmedYes = auditRecords.filter(r => r.clientConfirmed === 'SIM').length;
  let schedulingErrorYes = auditRecords.filter(r => r.schedulingError === 'SIM').length;

  const whoErroredCounts: { [key: string]: number } = {};
  auditRecords.forEach(r => {
    if (r.whoErrored && r.whoErrored !== '' && r.whoErrored !== 'Tudo Certo') {
      whoErroredCounts[r.whoErrored] = (whoErroredCounts[r.whoErrored] || 0) + 1;
    }
  });

  const errorReasonCounts: { [key: string]: number } = {};
  auditRecords.forEach(r => {
    if (r.errorReason && r.errorReason !== '') {
      errorReasonCounts[r.errorReason] = (errorReasonCounts[r.errorReason] || 0) + 1;
    }
  });

  return {
    totalAudited,
    triedToConfirmYes,
    clientConfirmedYes,
    schedulingErrorYes,
    whoErroredCounts,
    errorReasonCounts,
  };
};
/**
 * Indicadores da página de Auditoria.
 * Recebe demandas já deduplicadas por protocolo (groupDemandsByProtocol),
 * registros reais da aba AUDITORIA, e um período de filtro.
 */
export interface AuditDashboardMetrics {
  // Métrica 1: % de erro nosso
  totalReagendadoUnico: number;
  totalAgendamentoErrouSim: number;
  pctErroAgendamento: number;

  // Métrica 2: Reagendado + com_deslocamento
  totalReagendadoComDeslocamento: number;
  totalBaseComparacao: number; // Concluído + Reagendado + Não Realizado, todos com_deslocamento
  pctReagendamentoSobreBase: number;

  // Métrica 3: mesma base da Métrica 2, separada por categoria
  suporte: { reagendado: number; base: number; pct: number };
  ativacoes: { reagendado: number; base: number; pct: number };
}

export function calculateAuditDashboardMetrics(
  demands: RawDemand[],        // já deduplicados por protocolo (groupDemandsByProtocol)
  auditRecords: AuditRecord[], // registros reais da aba AUDITORIA
  startDate: string,
  endDate: string
): AuditDashboardMetrics {

  // Filtra demands pelo período (schedule_date)
  const inPeriod = demands.filter(d => {
    if (!startDate && !endDate) return true;
    const dDate = parseDate(d.date);
    if (!dDate) return false;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (dDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (dDate > end) return false;
    }
    return true;
  });

  // --- Métrica 1 ---
  const reagendadosUnicos = inPeriod.filter(d => isStatusRescheduled(d.status));
  const totalReagendadoUnico = reagendadosUnicos.length;

  const protocolsInPeriod = new Set(reagendadosUnicos.map(d => d.protocol_number));

  const auditadosErrouSim = auditRecords.filter(r =>
    r.schedulingError === 'SIM' && protocolsInPeriod.has(String(r.protocol))
  );
  const totalAgendamentoErrouSim = auditadosErrouSim.length;
  const pctErroAgendamento = totalReagendadoUnico > 0
    ? (totalAgendamentoErrouSim / totalReagendadoUnico) * 100
    : 0;

  // --- Métrica 2 ---
  const reagendadoComDeslocamento = inPeriod.filter(d =>
    isStatusRescheduled(d.status) && d.nivel === "com_deslocamento"
  );
  const totalReagendadoComDeslocamento = reagendadoComDeslocamento.length;

  const baseComparacao = inPeriod.filter(d =>
    d.nivel === "com_deslocamento" &&
    (isStatusCompleted(d.status) || isStatusRescheduled(d.status) || isStatusNotPerformed(d.status))
  );
  const totalBaseComparacao = baseComparacao.length;
  const pctReagendamentoSobreBase = totalBaseComparacao > 0
    ? (totalReagendadoComDeslocamento / totalBaseComparacao) * 100
    : 0;

  // --- Métrica 3 (mesma base, separada por categoria) ---
  const suporteReagendado = reagendadoComDeslocamento.filter(d => d.category === "Suporte").length;
  const suporteBase = baseComparacao.filter(d => d.category === "Suporte").length;
  const ativacoesReagendado = reagendadoComDeslocamento.filter(d => d.category === "Ativações").length;
  const ativacoesBase = baseComparacao.filter(d => d.category === "Ativações").length;

  return {
    totalReagendadoUnico,
    totalAgendamentoErrouSim,
    pctErroAgendamento,
    totalReagendadoComDeslocamento,
    totalBaseComparacao,
    pctReagendamentoSobreBase,
    suporte: {
      reagendado: suporteReagendado,
      base: suporteBase,
      pct: suporteBase > 0 ? (suporteReagendado / suporteBase) * 100 : 0
    },
    ativacoes: {
      reagendado: ativacoesReagendado,
      base: ativacoesBase,
      pct: ativacoesBase > 0 ? (ativacoesReagendado / ativacoesBase) * 100 : 0
    }
  };
}
/**
 * Calcula métricas de eficiência de Suporte (categoria "Suporte", que já exclui
 * Engenharia/Infraestrutura via classifyDemand), opcionalmente para um técnico específico.
 * "Dias trabalhados" = dias distintos em que o técnico teve ao menos 1 Suporte concluído.
 * No modo "all" (Geral), a média exibida é a média simples entre as médias individuais
 * de cada técnico, não um agregado bruto do total.
 */
export function calculateDisplacementEfficiencyMetrics(demands: RawDemand[], technicianName?: string): DisplacementEfficiencyMetrics {
  // Base: apenas demandas de Suporte (já exclui Engenharia/Infraestrutura)
  const suporteDemands = demands.filter(d => d.category === "Suporte");

  // Caso 1: técnico específico selecionado
  if (technicianName && technicianName !== "all") {
    const techDemands = suporteDemands.filter(d => d.technician === technicianName);
    const totalDemandsWithDisplacement = techDemands.length;
    const completedDemandsWithDisplacement = techDemands.filter(d => isStatusCompleted(d.status)).length;

    const uniqueDates = new Set<string>();
    techDemands.forEach(d => {
      if (isStatusCompleted(d.status)) uniqueDates.add(d.date);
    });
    const uniqueDaysWithDisplacement = uniqueDates.size;

    const avgCompletedDisplacementPerDay = uniqueDaysWithDisplacement > 0
      ? completedDemandsWithDisplacement / uniqueDaysWithDisplacement
      : 0;

    return {
      totalDemandsWithDisplacement,
      completedDemandsWithDisplacement,
      uniqueDaysWithDisplacement,
      avgCompletedDisplacementPerDay,
      technicianName
    };
  }

  // Caso 2: "all" — média simples entre as médias individuais de cada técnico
  const technicianNames = Array.from(
    new Set(suporteDemands.map(d => d.technician).filter(t => t && t.trim() !== ""))
  );

  let totalDemandsWithDisplacement = 0;
  let completedDemandsWithDisplacement = 0;
  let totalUniqueDays = 0;
  const individualAverages: number[] = [];

  technicianNames.forEach(tech => {
    const techDemands = suporteDemands.filter(d => d.technician === tech);
    const techTotal = techDemands.length;
    const techCompleted = techDemands.filter(d => isStatusCompleted(d.status)).length;

    const uniqueDates = new Set<string>();
    techDemands.forEach(d => {
      if (isStatusCompleted(d.status)) uniqueDates.add(d.date);
    });
    const techUniqueDays = uniqueDates.size;

    totalDemandsWithDisplacement += techTotal;
    completedDemandsWithDisplacement += techCompleted;
    totalUniqueDays += techUniqueDays;

    if (techUniqueDays > 0) {
      individualAverages.push(techCompleted / techUniqueDays);
    }
  });

  const avgCompletedDisplacementPerDay = individualAverages.length > 0
    ? individualAverages.reduce((acc, v) => acc + v, 0) / individualAverages.length
    : 0;

  return {
    totalDemandsWithDisplacement,
    completedDemandsWithDisplacement,
    uniqueDaysWithDisplacement: totalUniqueDays,
    avgCompletedDisplacementPerDay,
    technicianName: "Geral"
  };
}
