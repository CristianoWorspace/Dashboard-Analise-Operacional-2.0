export interface RawDemand {
  protocol_number: string;
  status: string;
  reason: string;
  demand: string;
  technician: string;
  city: string;
  date: string;
  category: string;
  client: string;
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
  displacementLevel?: string;
  reason?: string;
}

export interface User {
  name: string;
  username: string;
  password?: string;
  email: string;
  role: "Admin" | "Gerente" | "Colaborador";
}

export interface AuditRecord {
  date: string;
  protocol: string;
  triedToConfirm: 'SIM' | 'NÃO' | '';
  clientConfirmed: 'SIM' | 'NÃO' | '';
  schedulingError: 'SIM' | 'NÃO' | '';
  whoErrored: 'Adrieli' | 'Ariani' | 'Tatiane' | 'Graziela' | 'Victória' | 'Tayane' | 'Jéssica' | 'Stéfani' | 'Laís' | 'Tudo Certo' | '';
  errorReason: 'Erro de Confirmação - Sem Retorno - Remoção da Agenda' |
               'Erro de Confirmação - Contato desatualizado - Remoção da Agenda' |
               'Erro de Confirmação - Sem Retorno - Remoção da Agenda - Equipe foi deslocada' |
               'Agendamento Ok - Cliente Reagendou' |
               'Antecipado por ser "Externo"' |
               'Erro de Confirmação - Chamado contato errado - Remoção da Agenda' |
               'Não deu tempo - Reagendado pela equipe técnica' |
               'Motivo - Chuva - Equipe deslocada' |
               'Motivo - Chuva - Equipe não deslocada' | '';
}

export type AuditWhoErroredOptions = AuditRecord['whoErrored'];
export type AuditErrorReasonOptions = AuditRecord['errorReason'];
