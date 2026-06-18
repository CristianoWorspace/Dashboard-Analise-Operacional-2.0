export function classifyDemand(demandName: string): "Infraestrutura" | "Suporte" | "Recolhimentos" | "Ativações" {
  const name = (demandName || "").toLowerCase();
  
  // Rule: Infraestrutura = contains "infraestrutura" or "engenharia"
  const isInfra = name.includes("infraestrutura") || name.includes("engenharia");
  if (isInfra) {
    return "Infraestrutura";
  }
  
  // Rule: Recolhimentos = contains "recolhimento" or "cancelamento"
  const isRecolhimento = name.includes("recolhimento") || name.includes("cancelamento");
  if (isRecolhimento) {
    return "Recolhimentos";
  }

  // Rule: Suporte = contains "deslocamento" (and not infraestrutura/engenharia/recolhimento)
  const isSuporte = name.includes("deslocamento");
  if (isSuporte) {
    return "Suporte";
  }
  
  // Rule: Ativações = everything else
  return "Ativações";
}
