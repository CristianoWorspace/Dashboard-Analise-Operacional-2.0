export interface RawDemand {
  date: string;
  status: string;
  client: string;
  protocol_number: string;
  demand: string;
  reason: string;
  technician: string;
  city: string;
  category: "Infraestrutura" | "Suporte" | "Recolhimentos" | "Ativações";
  nivel: "com_deslocamento" | "sem_deslocamento" | "";
  grupos: string;
  technicians?: string[];
  isGroupedProtocol?: boolean;
  raw?: any;
}

export interface GeneralMetrics {
  totalDemands: number;
  totalCompleted: number;
  schedulingEfficiency: number;
  completedSuporte: number;
  completedAtivacoes: number;
  completedInfraestrutura: number;
  completedRecolhimentos: number;
  totalSuporte: number;
  totalAtivacoes: number;
  totalInfraestrutura: number;
  totalRecolhimentos: number;
}

export interface RecolhimentoMetrics {
  totalAttempts: number;
  effectiveRetrievals: number;
  sentToBilling: number;
  teamDidNotGo: number;
  clientAusente: number;
  clientRefused: number;
  retrievalEffectiveness: number;
}

export interface OperationalEfficiencyMetrics {
  totalDemandsWithDisplacement: number;
  completedDemandsWithDisplacement: number;
  operationalEfficiency: number;
}

export interface SchedulingAdherenceMetrics {
  totalDemandsForAdherence: number;
  adherentDemands: number;
  schedulingAdherence: number;
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  technician: string;
  status: string;
  category: string;
}

export interface User {
  name: string;
  username: string;
  email: string;
  role: string;
}
