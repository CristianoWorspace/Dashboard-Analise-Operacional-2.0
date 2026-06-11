import { RawDemand, GeneralMetrics, RecolhimentoMetrics } from "./types";

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
  let demandVal = ""; // TipoOS
  let technicianVal = ""; // name
  let cityVal = "";
  let scheduleDateVal = "";

  if (Array.isArray(row)) {
    // Column index matching based on the spreadsheet layout:
    // A (0) -> protocol_number
    // B (1) -> status
    // C (2) -> reason
    // D (3) -> TipoOS
    // E (4) -> name (Technician Name)
    // F (5) -> city
    // G (6) -> schedule_date
    protocolVal = String(row[0] || "").trim();
    statusVal = String(row[1] || "").trim();
    reasonVal = String(row[2] || "").trim();
    demandVal = String(row[3] || "").trim();
    technicianVal = String(row[4] || "").trim();
    cityVal = String(row[5] || "").trim();
    scheduleDateVal = String(row[6] || "").trim();
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
    demandVal = getVal(4, ["tipoos", "tipo_os", "demanda", "servico"], "TipoOS");
    technicianVal = getVal(5, ["name", "nome", "tecnico"], "name");
    cityVal = getVal(6, ["city", "cidade"], "city");
    scheduleDateVal = getVal(7, ["schedule_date", "date", "data"], "schedule_date");
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
    raw: row
  };
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

  // Sent to billing: status is "não realizado" / "não realizada" AND reason contains "cobrança"
  const sentToBilling = recolhimentos.filter(d => {
    const statusLower = d.status.toLowerCase();
    const reasonLower = d.reason.toLowerCase();
    return (statusLower.includes("não realizado") || statusLower.includes("nao realizado") || statusLower.includes("não realizada") || statusLower.includes("nao realizada")) 
      && (reasonLower.includes("cobrança") || reasonLower.includes("cobranca") || reasonLower.includes("cobrar"));
  }).length;

  // Team did not go: status is "reagendado" AND reason contains "não foi"
  const teamDidNotGo = recolhimentos.filter(d => {
    const statusLower = d.status.toLowerCase();
    const reasonLower = d.reason.toLowerCase();
    return statusLower.includes("reagendado") 
      && (reasonLower.includes("não foi") || reasonLower.includes("nao foi") || reasonLower.includes("equipe não foi") || reasonLower.includes("não fomos"));
  }).length;

  // Customer absent
  const clientAusente = recolhimentos.filter(d => {
    const reasonLower = d.reason.toLowerCase();
    return reasonLower.includes("ausente") || reasonLower.includes("não estava") || reasonLower.includes("nao estava") || reasonLower.includes("fechado");
  }).length;

  // Customer refused
  const clientRefused = recolhimentos.filter(d => {
    const reasonLower = d.reason.toLowerCase();
    return reasonLower.includes("recusou") || reasonLower.includes("não devolve") || reasonLower.includes("nao devolve") || reasonLower.includes("não permitiu");
  }).length;

  const retrievalEffectiveness = totalAttempts > 0 ? (effectiveRetrievals / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    effectiveRetrievals,
    sentToBilling,
    teamDidNotGo,
    clientAusente,
    clientRefused,
    retrievalEffectiveness
  };
}

/**
 * Groups a collection of RawDemand rows by their protocol number.
 * Under this senior approach:
 * - A single protocol represents ONE unique operational customer ticket/visit.
 * - If multiple rows represent the same protocol, they are consolidated.
 * - If any row for a protocol contains "concluido", the protocol is considered fully "Concluído" (Effective).
 * - The technicians assigned to the same protocol are gathered and joined as a team.
 * This corrects the double/triple-counting of multi-technician visits.
 */
export function groupDemandsByProtocol(demands: RawDemand[]): RawDemand[] {
  const groups: { [key: string]: RawDemand[] } = {};
  
  demands.forEach((d, idx) => {
    // Treat empty/unspecified protocols as independent unique items
    const protocolKey = d.protocol_number && d.protocol_number.trim() !== "" 
      ? d.protocol_number.trim() 
      : `virtual_${idx}`;
      
    if (!groups[protocolKey]) {
      groups[protocolKey] = [];
    }
    groups[protocolKey].push(d);
  });

  return Object.entries(groups).map(([protocolKey, rows]) => {
    const isVirtual = protocolKey.startsWith("virtual_");
    
    // Status Aggregation Priority:
    // Concluído (3) > Reagendado (2) > Não Realizado (1) > Pendente (0)
    let finalStatus = "Pendente";
    let maxPriority = -1;
    
    rows.forEach(r => {
      const s = r.status.toLowerCase();
      let priority = 0;
      if (isStatusCompleted(r.status)) {
        priority = 3;
      } else if (s.includes("reagendado")) {
        priority = 2;
      } else if (s.includes("não") || s.includes("nao") || s.includes("fracas") || s.includes("cancel")) {
        priority = 1;
      }
      
      if (priority > maxPriority) {
        maxPriority = priority;
        finalStatus = r.status; // Preserve original status word
      }
    });

    // Gather unique technicians assigned
    const techSet = new Set<string>();
    rows.forEach(r => {
      if (r.technician && r.technician.trim() !== "") {
        techSet.add(r.technician.trim());
      }
    });
    const techsArray = Array.from(techSet);
    const combinedTechnicians = techsArray.join(" + ");

    // Pick first row for general properties
    const firstRow = rows[0];
    const city = rows.find(r => r.city && r.city.trim() !== "")?.city || firstRow.city || "";
    const date = rows.find(r => r.date && r.date.trim() !== "")?.date || firstRow.date || "";
    const demand = rows.find(r => r.demand && r.demand.trim() !== "")?.demand || firstRow.demand || "";
    const category = rows.find(r => r.category)?.category || firstRow.category || "Ativações";
    const reason = rows.find(r => r.reason && r.reason.trim() !== "")?.reason || firstRow.reason || "";
    const client = firstRow.client || "";

    return {
      date,
      status: finalStatus,
      client,
      protocol_number: isVirtual ? "" : protocolKey,
      demand,
      reason,
      technician: combinedTechnicians || "Não designado",
      city,
      category,
      technicians: techsArray,
      isGroupedProtocol: true,
      raw: rows.map(r => r.raw) // aggregate raw objects
    };
  });
}

/**
 * Helper to parse a "dd/mm/yyyy" or ISO string and return a standard Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const t = dateStr.trim();
  
  // Format dd/mm/yyyy
  if (t.includes("/")) {
    const parts = t.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based months
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000; // expand short years
      return new Date(year, month, day);
    }
  }

  // ISO fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  return null;
}
