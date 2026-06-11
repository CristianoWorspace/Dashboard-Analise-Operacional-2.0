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
  technicians?: string[]; // Array of technicians assigned to the protocol team
  isGroupedProtocol?: boolean; // Flag to indicate if it represents a grouped protocol
  // Support flexible raw structures as well
  raw?: any;
}

export interface GeneralMetrics {
  totalDemands: number;
  totalCompleted: number;
  schedulingEfficiency: number; // concluídos / total
  
  // Categorized completed quantities
  completedSuporte: number;
  completedAtivacoes: number;
  completedInfraestrutura: number;
  completedRecolhimentos: number;
  
  // Totals by category (concluded or not)
  totalSuporte: number;
  totalAtivacoes: number;
  totalInfraestrutura: number;
  totalRecolhimentos: number;
}

export interface RecolhimentoMetrics {
  totalAttempts: number; // total attempts of retrievals
  effectiveRetrievals: number; // completed status within recolhimentos (cancelamento + recolhimento)
  sentToBilling: number; // status 'não realizado' AND reason contain 'cobrança'
  teamDidNotGo: number; // status 'reagendado' AND reason contain 'não foi'
  clientAusente: number; // customer absent/not found
  clientRefused: number; // customer refused to return or did not allow entry
  retrievalEffectiveness: number; // effectiveRetrievals / totalAttempts
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
