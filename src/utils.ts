import { RawDemand, GeneralMetrics, RecolhimentoMetrics, OperationalEfficiencyMetrics, SchedulingAdherenceMetrics } from "./types";

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
  return norm.includes("não realizado");
}

/**
 * Classifies a demand based on Column 4 (demand type/name)
 */
export function classifyDemand(demandName: string): "Infraestrutura" | "Suporte" | "Recolhimentos" | "Ativações" {
  const name = (demandName || "").toLowerCase();
  
  // Rule: Infraestrutura = contains "infraestrutura" or "engenharia"
  const isInfra = name.includes("infraestrutura") || name.includes("engenharia");
  if (isInfra) {
    return "Infraestrutura";
  }
  
  // Rule: Suporte = contains "deslocamento" (and not infraestrutura/engenharia)
  const isSuporte = name.includes("deslocamento") && !isInfra;
  if (isSuporte) {
    return "Suporte";
  }
  
  // Rule: Recolhimentos = contains "recolhimento" or "cancelamento"
  const isRecolhimento = name.includes("recolhimento") || name.includes("cancelamento");
  if (isRecolhimento) {
    return "Recolhimentos";
  }
  
  // Rule: Ativações = everything else
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
  let nivelVal: "com_deslocamento" | "sem_deslocamento" | "" = ""; // Nova coluna
  let gruposVal = ""; // Nova coluna
  let demandVal = ""; // TipoOS
  let technicianVal = ""; // name
  let cityVal = "";
  let scheduleDateVal = "";

  if (Array.isArray(row)) {
    // Column index matching based on the spreadsheet layout:
    // A (0) -> protocol_number
    // B (1) -> status
    // C (2) -> reason
    // D (3) -> nivel (com_deslocamento / sem_deslocamento)
    // E (4) -> grupos (Ativação, Suporte, etc.)
    // F (5) -> TipoOS
    // G (6) -> name (Technician Name)
    // H (7) -> city
    // I (8) -> schedule_date
    protocolVal = String(row[0] || "").trim();
    statusVal = String(row[1] || "").trim();
    reasonVal = String(row[2] || "").trim();
    nivelVal = (String(row[3] || "").trim() as "com_deslocamento" | "sem_deslocamento" | "");
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
    nivelVal = (getVal(4, ["nivel", "level"], "nivel") as "com_deslocamento" | "sem_deslocamento" | "");
    gruposVal = getVal(5, ["grupos", "groups"], "grupos");
    demandVal = getVal(6, ["tipoos", "tipo_os", "demanda", "servico"], "TipoOS");
    technicianVal = getVal(7, ["name", "nome", "tecnico"], "name");
    cityVal = getVal(8, ["city", "cidade"], "city");
    scheduleDateVal = getVal(9, ["schedule_date", "date", "data"], "schedule_date");
  }

  // Prettify target date for the table & charts
  const dateObj = parseDate(scheduleDateVal);
  let dateFormatted = scheduleDateVal;
  if (dateObj) {
    // If scheduleDateVal has "T" or is an ISO string, we extract UTC parameters to prevent client-side localized timezone shift (e.g. subtracting 1 day)
    const isIso = scheduleDateVal.includes("T") || (scheduleDateVal.includes("-") && scheduleDateVal.length >= 10);
    const day = String(isIso ? dateObj.getUTCDate() : dateObj.getDate()).padStart(2, "0");
    const month = String(isIso ? (dateObj.getUTCMonth() + 1) : (dateObj.getMonth() + 1)).padStart(2, "0");
    const year = isIso ? dateObj.getUTCFullYear() : dateObj.getFullYear();
    dateFormatted = `${day}/${month}/${year}`;
  }

  // Define client as representation of protocol and city
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
  // Try parsing as ISO string first
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  // Try parsing as dd/mm/yyyy
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Groups demands by protocol number.
 */
export function groupDemandsByProtocol(demands: RawDemand[]): RawDemand[] {
  const grouped: { [key: string]: RawDemand } = {};

  demands.forEach(demand => {
    if (demand.protocol_number) {
      if (!grouped[demand.protocol_number]) {
        grouped[demand.protocol_number] = { ...demand, technicians: [demand.technician], isGroupedProtocol: true };
      } else {
        // Add technician to existing group if not already present
        if (demand.technician && !grouped[demand.protocol_number].technicians?.includes(demand.technician)) {
          grouped[demand.protocol_number].technicians?.push(demand.technician);
        }
        // Update status to the most "negative" one (e.g., if one is "Reagendado", the group is "Reagendado")
        // This logic might need refinement based on exact business rules
        if (isStatusRescheduled(demand.status) && !isStatusRescheduled(grouped[demand.protocol_number].status)) {
          grouped[demand.protocol_number].status = demand.status;
        } else if (isStatusNotPerformed(demand.status) && !isStatusRescheduled(grouped[demand.protocol_number].status) && !isStatusNotPerformed(grouped[demand.protocol_number].status)) {
          grouped[demand.protocol_number].status = demand.status;
        }
      }
    } else {
      // If no protocol number, treat as individual demand
      grouped[`no_protocol_${demands.indexOf(demand)}`] = demand;
    }
  });

  return Object.values(grouped);
}

/**
 * Calculates metrics for primary dashboard
 */
export function calculateGeneralMetrics(demands: RawDemand[]): GeneralMetrics {
  const totalDemands = demands.length;
  const totalCompleted = demands.filter(d => isStatusCompleted(d.status)).length;
  
  // Eficiência do agendamento = % de concluídas em relação ao total
  const schedulingEfficiency = totalDemands > 0 ? (totalCompleted / totalDemands) * 100 : 0;

  let completedSuporte = 0;
  let completedAtivacoes = 0;
  let completedInfraestrutura = 0;
  let completedRecolhimentos = 0;

  let totalSuporte = 0;
  let totalAtivacoes = 0;
  let totalInfraestrutura = 0;
  let totalRecolhimentos = 0;

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
    }
  });

  return {
    totalDemands,
    totalCompleted,
    schedulingEfficiency,
    completedSuporte,
    completedAtivacoes,
    completedInfraestrutura,
    completedRecolhimentos,
    totalSuporte,
    totalAtivacoes,
    totalInfraestrutura,
    totalRecolhimentos
  };
}

/**
 * Calculates specialized metrics for Retrievals Dashboard (Recolhimentos)
 */
export function calculateRecolhimentoMetrics(demands: RawDemand[]): RecolhimentoMetrics {
  // Only filter out items that belong to the "Recolhimentos" category
  const recolhimentos = demands.filter(d => d.category === "Recolhimentos");
  const totalAttempts = recolhimentos.length;

  // Real effective retrievals: status is "concluido" or "concluída"
  const effectiveRetrievals = recolhimentos.filter(d => isStatusCompleted(d.status)).length;

  // Sent to billing: status is "não realizado" / "não realizada" AND reason contain "cobrança"
  const sentToBilling = recolhimentos.filter(d => {
    const statusLower = d.status.toLowerCase();
    const reasonLower = d.reason.toLowerCase();
    return (isStatusNotPerformed(d.status) || statusLower.includes("enviado a cobrança")) && reasonLower.includes("cobrança");
  }).length;

  // Team did not go: status "reagendado" AND reason contains "não foi"
  const teamDidNotGo = recolhimentos.filter(d => {
    return isStatusRescheduled(d.status) && d.reason.toLowerCase().includes("não foi");
  }).length;

  // Client absent/not found: status "reagendado" AND reason contains "cliente não estava"
  const clientAusente = recolhimentos.filter(d => {
    return isStatusRescheduled(d.status) && d.reason.toLowerCase().includes("cliente não estava");
  }).length;

  // Customer refused to return or did not allow entry: status "reagendado" AND reason contains "recusou"
  const clientRefused = recolhimentos.filter(d => {
    return isStatusRescheduled(d.status) && d.reason.toLowerCase().includes("recusou");
  }).length;

  const retrievalEffectiveness = totalAttempts > 0 ? (effectiveRetrievals / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    effectiveRetrievals,
    sentToBilling,
    teamDidNotGo,
    clientAusente,
    clientRefused,
    retrievalEffectiveness,
  };
}

/**
 * Calculates operational efficiency metrics.
 * Eficiência Operacional: Operacional é a relação de demandas concluídas de acordo com o total de demandas a serem realizadas.
 * Considera apenas demandas com deslocamento.
 */
export function calculateOperationalEfficiencyMetrics(demands: RawDemand[]): OperationalEfficiencyMetrics {
  const demandsWithDisplacement = demands.filter(d => d.nivel === "com_deslocamento");
  const totalDemandsWithDisplacement = demandsWithDisplacement.length;
  const completedDemandsWithDisplacement = demandsWithDisplacement.filter(d => isStatusCompleted(d.status)).length;

  const operationalEfficiency = totalDemandsWithDisplacement > 0
    ? (completedDemandsWithDisplacement / totalDemandsWithDisplacement) * 100
    : 0;

  return {
    totalDemandsWithDisplacement,
    completedDemandsWithDisplacement,
    operationalEfficiency,
  };
}

/**
 * Calculates scheduling adherence metrics.
 * Aderência do Agendamento: eficiência do agendamento considerando descumprimento de planejado 'por parte do cliente',
 * levando em conta o nível de acertos da equipe "agendamento" propriamente.
 * Exclui serviços como Recolhimento, Cancelamento e Entrega de Carnê.
 */
export function calculateSchedulingAdherenceMetrics(demands: RawDemand[]): SchedulingAdherenceMetrics {
  const excludedDemandTypes = [
    "Recolhimento",
    "Cancelamento / Financeiro",
    "Cancelamento / Retenção",
    "Entrega de Carnê", // Assumindo que este é um valor possível para 'demand'
  ].map(s => s.toLowerCase());

  const eligibleDemands = demands.filter(d =>
    d.nivel === "com_deslocamento" &&
    !excludedDemandTypes.includes(d.demand.toLowerCase())
  );

  const totalDemandsForAdherence = eligibleDemands.length;
  const adherentDemands = eligibleDemands.filter(d => isStatusCompleted(d.status)).length;

  const schedulingAdherence = totalDemandsForAdherence > 0
    ? (adherentDemands / totalDemandsForAdherence) * 100
    : 0;

  return {
    totalDemandsForAdherence,
    adherentDemands,
    schedulingAdherence,
  };
}
