/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  CreditCard, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Wrench, 
  XCircle, 
  FileSpreadsheet, 
  Search, 
  Building2, 
  Layers, 
  Trash2, 
  PackageCheck,
  Percent,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ChevronUp,
  LayoutGrid,
  LogOut,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  parseSheetRow, 
  calculateGeneralMetrics, 
  calculateRecolhimentoMetrics, 
  calculateOperationalEfficiencyMetrics,
  calculateSchedulingAdherenceMetrics,
  calculateAuditDashboardMetrics,
  parseDate, 
  groupDemandsByProtocol, 
  isStatusCompleted,
  isStatusRescheduled
} from "./utils";
import { 
  RawDemand, 
  DashboardFilters, 
  User,
  OperationalEfficiencyMetrics,
  SchedulingAdherenceMetrics,
  AuditRecord
} from "./types";

export default function App() {
  // User authentication states
    const [activeTab, setActiveTab] = useState<"geral" | "recolhimentos" | "eficiencia" | "motivos" | "usuarios" | "auditoria">("geral");
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("dashboard_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginError("");
  setIsLoggingIn(true);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: usernameInput,
        password: passwordInput
      })
    });

    const result = await response.json();

    if (result.success && result.user) {
      localStorage.setItem(
        "dashboard_user",
        JSON.stringify(result.user)
      );

      setCurrentUser(result.user);

      setUsernameInput("");
      setPasswordInput("");
    } else {
      setLoginError(
        result.message ||
        "Usuário ou senha incorretos."
      );
    }

  } catch (err) {
    console.error("Login request failed:", err);

    setLoginError(
      "Falha ao conectar com o servidor."
    );

  } finally {
    setIsLoggingIn(false);
  }
};
  useEffect(() => {
    if (currentUser?.role === "Admin" && activeTab === "usuarios") {
      fetchRegisteredUsers();
    }
  }, [currentUser, activeTab]);

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccess("");
    setSubmittingUser(true);

    try {
      let response;
      if (editingUsername) {
        response = await fetch(`/api/users/${editingUsername}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userForm.name,
            password: userForm.password,
            email: userForm.email,
            role: userForm.role
          })
        });
      } else {
        response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm)
        });
      }

      const result = await response.json();
      if (result.success) {
        setUserSuccess(editingUsername ? "Usuário atualizado com sucesso!" : "Novo usuário cadastrado com sucesso!");
        setUserForm({
          name: "",
          username: "",
          password: "",
          email: "",
          role: "Colaborador"
        });
        setEditingUsername(null);
        fetchRegisteredUsers();
      } else {
        setUserError(result.message || "Erro para salvar usuário.");
      }
    } catch (err) {
      console.error("User save request failed:", err);
      setUserError("Erro técnico de comunicação ao gerir conta.");
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (uName: string) => {
    if (uName === "cristiano.kuhn") {
      setUserError("O administrador master não pode ser excluído.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja remover o usuário "${uName}"?`)) {
      return;
    }

    setUserError("");
    setUserSuccess("");

    try {
      const response = await fetch(`/api/users/${uName}`, {
        method: "DELETE"
      });
      const result = await response.json();
      if (result.success) {
        setUserSuccess("Usuário deletado do sistema.");
        fetchRegisteredUsers();
        if (editingUsername === uName) {
          setEditingUsername(null);
          setUserForm({
            name: "",
            username: "",
            password: "",
            email: "",
            role: "Colaborador"
          });
        }
      } else {
        setUserError(result.message || "Erro ao deletar usuário.");
      }
    } catch (err) {
      console.error("Delete user exception:", err);
      setUserError("Erro de comunicação com o servidor.");
    }
  };

  const handleSendInviteEmail = async (u: any) => {
    setUserError("");
    setUserSuccess("");
    try {
      const response = await fetch("/api/users/request-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          name: u.name,
          role: u.role
        })
      });
      const result = await response.json();
      if (result.success) {
        setUserSuccess(result.message);
        setSimulatedEmail({
          email: u.email,
          name: u.name,
          timestamp: result.timestamp,
          body: result.simulatedBody
        });
      } else {
        setUserError(result.message || "Erro ao simular envio de e-mail.");
      }
    } catch (err) {
      console.error("Send invite connection failed:", err);
      setUserError("Erro ao enviar e-mail de requisição.");
    }
  };

  // Data state
  const [dataState, setDataState] = useState<{
    success: boolean;
    source: string;
    demands: RawDemand[];
    error: string | null;
  }>({
    success: false,
    source: "demo",
    demands: [],
    error: null
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [technicianList, setTechnicianList] = useState<string[]>([]);

  // User management states
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    role: "Colaborador"
  });
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [userError, setUserError] = useState<string>("");
  const [userSuccess, setUserSuccess] = useState<string>("");
  const [submittingUser, setSubmittingUser] = useState<boolean>(false);
  const [fetchingUsers, setFetchingUsers] = useState<boolean>(false);
  const [simulatedEmail, setSimulatedEmail] = useState<any | null>(null);

  // Audit states
  const [auditPage, setAuditPage] = useState(1);

const auditItemsPerPage = 10;
  const [auditDemands, setAuditDemands] = useState<RawDemand[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [fetchingAuditRecords, setFetchingAuditRecords] = useState<boolean>(false);
  const [submittingAuditRecord, setSubmittingAuditRecord] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string>("");
  const [auditSuccess, setAuditSuccess] = useState<string>("");
  const [selectedAuditDemand, setSelectedAuditDemand] = useState<RawDemand | null>(null);
  const [auditFilters, setAuditFilters] = useState<{
    date_start: string;
    date_end: string;
    protocol: string;
    triedToConfirm: string;
    clientConfirmed: string;
    schedulingError: string;
    whoErrored: string;
    errorReason: string;
  }>({
    date_start: "",
    date_end: "",
    protocol: "",
    triedToConfirm: "all",
    clientConfirmed: "all",
    schedulingError: "all",
    whoErrored: "all",
    errorReason: "all",
  });
  const [auditForm, setAuditForm] = useState<AuditRecord>({
    date: "",
    protocol: "",
    triedToConfirm: "",
    clientConfirmed: "",
    schedulingError: "",
    whoErrored: "",
    errorReason: "",
  });
const paginatedAuditDemands = auditDemands.slice(
  (auditPage - 1) * auditItemsPerPage,
  auditPage * auditItemsPerPage
);

const totalAuditPages = Math.ceil(
  auditDemands.length / auditItemsPerPage
);
const fetchAuditRecords = async () => {
  setFetchingAuditRecords(true);
  try {
    const queryParams = new URLSearchParams();
    if (auditFilters.date_start) queryParams.append("date_start", auditFilters.date_start);
    if (auditFilters.date_end) queryParams.append("date_end", auditFilters.date_end);
    if (auditFilters.protocol) queryParams.append("protocol", auditFilters.protocol);
    if (auditFilters.triedToConfirm !== "all") queryParams.append("triedToConfirm", auditFilters.triedToConfirm);
    if (auditFilters.clientConfirmed !== "all") queryParams.append("clientConfirmed", auditFilters.clientConfirmed);
    if (auditFilters.schedulingError !== "all") queryParams.append("schedulingError", auditFilters.schedulingError);
    if (auditFilters.whoErrored !== "all") queryParams.append("whoErrored", auditFilters.whoErrored);
    if (auditFilters.errorReason !== "all") queryParams.append("errorReason", auditFilters.errorReason);
    const response = await fetch(`/api/audit?${queryParams.toString()}`);
    const result = await response.json();
    if (result.success) {
      setAuditRecords(result.records || []);
    } else {
      setAuditError(result.message || "Erro ao carregar registros de auditoria.");
    }
  } catch (err) {
    console.error("Failed to fetch audit records:", err);
    setAuditError("Erro de comunicação ao carregar auditorias.");
  } finally {
    setFetchingAuditRecords(false);
  }
};
useEffect(() => {
  if (activeTab === "auditoria") {
    fetchAuditRecords();
    fetchAuditedRecordsFromSheet(); // NOVO — só esta linha foi adicionada aqui dentro
  }
}, [activeTab, auditFilters]);

const handleAuditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setAuditForm(prev => ({ ...prev, [name]: value }));
};

const handleSaveAuditRecord = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmittingAuditRecord(true);
  setAuditError("");
  setAuditSuccess("");
  try {
    const response = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auditForm),
    });
    const result = await response.json();
    if (result.success) {
      setAuditSuccess("Registro de auditoria salvo com sucesso!");
      setAuditForm({
        date: "",
        protocol: "",
        triedToConfirm: "",
        clientConfirmed: "",
        schedulingError: "",
        whoErrored: "",
        errorReason: "",
      });
      setSelectedAuditDemand(null);
      fetchAuditRecords();
      fetchAuditedRecordsFromSheet(); // NOVO — atualiza os indicadores após salvar
    } else {
      setAuditError(result.message || "Erro ao salvar registro de auditoria.");
    }
  } catch (err) {
    console.error("Failed to save audit record:", err);
    setAuditError("Erro de comunicação ao salvar auditoria.");
  } finally {
    setSubmittingAuditRecord(false);
  }
};
  
  // UI States
  const [selectedRecord, setSelectedRecord] = useState<RawDemand | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  const fetchRegisteredUsers = async () => {
    setFetchingUsers(true);
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setRegisteredUsers(result.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dashboard_user");
    setCurrentUser(null);
  };

  // Filters State
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: "",
    endDate: "",
    technician: "all",
    status: "all",
    category: "all",
    displacementLevel: "com_deslocamento",
    reason: "all",
    city: "all"
  });

  // Load spreadsheet data from the backend proxy
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append("schedule_date_start", filters.startDate);
      if (filters.endDate) queryParams.append("schedule_date_end", filters.endDate);
      if (filters.technician !== "all") queryParams.append("name", filters.technician);
      if (filters.status !== "all") queryParams.append("status", filters.status);
      if (filters.category !== "all") queryParams.append("TipoOS_category", filters.category); // Using a custom filter for category
      if (filters.displacementLevel !== "all") queryParams.append("nivel", filters.displacementLevel);
      if (filters.reason !== "all") queryParams.append("reason", filters.reason);
      if (filters.city !== "all") queryParams.append("city", filters.city);

      const response = await fetch(`/api/data?${queryParams.toString()}`);
      const result = await response.json();
      
      let rawData = result.data || [];
      let rowsToProcess: any[] = [];
      
      if (Array.isArray(rawData)) {
        rowsToProcess = rawData;
      } else if (rawData && typeof rawData === "object") {
        if (Array.isArray(rawData.data)) {
          rowsToProcess = rawData.data;
        } else if (Array.isArray(rawData.rows)) {
          rowsToProcess = rawData.rows;
        } else {
          // Fallback guess
          const arrayField = Object.keys(rawData).find(k => Array.isArray(rawData[k]));
          rowsToProcess = arrayField ? rawData[arrayField] : [];
        }
      }

      // Check if first row is headers (array of strings, where keys represent meta)
      let parsedRows: RawDemand[] = [];
      // The Apps Script now returns an array of objects, so no need to skip header row or guess structure
      for (let i = 0; i < rowsToProcess.length; i++) {
        parsedRows.push(parseSheetRow(rowsToProcess[i], i));
      }

      // Set unique technicians list
      const uniqueTechs: string[] = Array.from(
        new Set(
          parsedRows
            .map(d => d.technician)
            .filter(t => t && t.trim() !== "" && !t.toLowerCase().includes("tecnico"))
        )
      ).sort();
      setTechnicianList(uniqueTechs);

      setDataState({
        success: result.success,
        source: result.source,
        demands: parsedRows,
        error: result.error
      });
    } catch (err: any) {
      console.error("Client fetch error:", err);
      setDataState(prev => ({
        ...prev,
        success: false,
        source: "demo",
        error: err.message
      }));
    } finally {
      setLoading(false);
    }
  };
const handleImportAuditRecords = async () => {
  try {
    const response = await fetch("/api/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "importAuditRecords",
      }),
    });

    const result = await response.json();

    alert(result.message || "Requisição enviada.");
  } catch (err: any) {
    console.error(err);
    alert("Erro ao chamar API.");
  }
};
  useEffect(() => {
    fetchData();
  }, [filters]); // Re-fetch data when filters change

  // Quick helper to reset all filter values
  const handleClearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      technician: "all",
      status: "all",
      category: "all"
    });
    setSearchQuery("");
  };

  // Quick preset dates
  const handleSetDatePreset = (preset: "30days" | "month" | "all") => {
    const today = new Date();
    if (preset === "all") {
      setFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
    } else if (preset === "30days") {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFilters(prev => ({
        ...prev,
        startDate: past.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10)
      }));
    } else if (preset === "month") {
      // Current month start and end
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilters(prev => ({
        ...prev,
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10)
      }));
    }
  };

  // State to switch between Unique Protocols (Efetividade por Protocolo) and All Assignments (Atividades da Agenda)
  const [calculationMode, setCalculationMode] = useState<"protocol" | "assignment">("protocol");

  // Group fetched rows into protocols to prevent multi-technician double counting
  const groupedProtocols = useMemo(() => {
    return groupDemandsByProtocol(dataState.demands);
  }, [dataState.demands]);

  // Select base dataset according to calculation mode
  const baseDemands = useMemo(() => {
    return calculationMode === "protocol" ? groupedProtocols : dataState.demands;
  }, [calculationMode, groupedProtocols, dataState.demands]);

  // Filter demands dynamically based on filter and search query state
  const filteredDemands = useMemo(() => {
    return baseDemands.filter(item => {
      // 1. Search Query (Client, technician, demand, reason, city or protocol matching)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesClient = (item.client || "").toLowerCase().includes(query);
        const matchesTech = (item.technician || "").toLowerCase().includes(query);
        const matchesDemand = (item.demand || "").toLowerCase().includes(query);
        const matchesReason = (item.reason || "").toLowerCase().includes(query);
        const matchesCity = (item.city || "").toLowerCase().includes(query);
        const matchesProtocol = (item.protocol_number || "").toLowerCase().includes(query);
        if (!matchesClient && !matchesTech && !matchesDemand && !matchesReason && !matchesCity && !matchesProtocol) {
          return false;
        }
      }

      // 2. Category Filter
      if (filters.category !== "all" && item.category !== filters.category) {
        return false;
      }

      // 3. Status Filter (normalizes 'concluido' variations)
      if (filters.status !== "all") {
        const s = item.status.toLowerCase();
        const filterVal = filters.status.toLowerCase();
        
        if (filterVal === "concluido") {
          if (!isStatusCompleted(item.status)) return false;
        } else if (filterVal === "não realizado") {
          if (!s.includes("não realizado") && !s.includes("nao realizado") && !s.includes("não realizada") && !s.includes("nao realizada")) return false;
        } else if (filterVal === "reagendado") {
          if (!s.includes("reagendado")) return false;
        } else if (filterVal === "pendente") {
          if (!s.includes("pendente")) return false;
        }
      }

      // 4. Technician Filter
      if (filters.technician !== "all") {
        if (item.technicians) {
          if (!item.technicians.includes(filters.technician)) return false;
        } else if (item.technician !== filters.technician) {
          return false;
        }
      }

      // 5. Date Period Filter (Robust parsing of various date styles)
      if (filters.startDate || filters.endDate) {
        const itemDate = parseDate(item.date);
        if (itemDate) {
          if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [baseDemands, filters, searchQuery]);

  // Audit Demands filtering logic
  useEffect(() => {
    if (activeTab === "auditoria") {
      const filtered = filteredDemands.filter(demand => {
        const statusLower = demand.status.toLowerCase();
        const nivelLower = demand.nivel?.toLowerCase() || "";
        const motivoLower = demand.reason?.toLowerCase() || "";

        const matchesStatus = statusLower.includes(filters.status.toLowerCase());
        const matchesNivel = filters.displacementLevel === "all" || nivelLower.includes(filters.displacementLevel?.toLowerCase() || "");
        
        const motivosElegiveis = [
          "cliente não estava",
          "cliente solicitou reagenda",
          "erro de confirmação - sem retorno - remoção da agenda",
          "erro de confirmação - contato desatualizado - remoção da agenda",
          "erro de confirmação - sem retorno - remoção da agenda - equipe foi deslocada",
          "agendamento ok - cliente reagendou",
          "antecipado por ser externo",
          "erro de confirmação - chamado contato errado - remoção da agenda",
          "não deu tempo - reagendado pela equipe técnica",
          "motivo - chuva - equipe deslocada",
          "motivo - chuva - equipe não deslocada",
        ];

        const matchesMotivo = filters.reason === "all" 
          ? motivosElegiveis.some(m => motivoLower.includes(m))
          : motivoLower.includes(filters.reason?.toLowerCase() || "");

        return matchesStatus && matchesNivel && matchesMotivo;
      });
      setAuditDemands(filtered);
    }
  }, [filteredDemands, activeTab, filters.status, filters.displacementLevel, filters.reason]);

  // Compute stats dynamically based on current filtered dataset
  const generalMetrics = useMemo(() => {
    return calculateGeneralMetrics(filteredDemands);
  }, [filteredDemands]);

  const recolhimentoMetrics = useMemo(() => {
    return calculateRecolhimentoMetrics(filteredDemands);
  }, [filteredDemands]);

  // NOVAS MÉTRICAS DE EFICIÊNCIA OPERACIONAL E ADERÊNCIA
  const operationalEfficiencyMetrics = useMemo(() => {
    return calculateOperationalEfficiencyMetrics(filteredDemands);
  }, [filteredDemands]);

  const schedulingAdherenceMetrics = useMemo(() => {
    return calculateSchedulingAdherenceMetrics(filteredDemands);
  }, [filteredDemands]);

  // Temporal and distribution chart datasets
  // 1. Demands trend over time (group by dynamic date string)
  const chartTrendData = useMemo(() => {
    const groups: { [key: string]: { total: number; concluido: number; falhas: number; reagendado: number } } = {};
    
    // Sort items chronologically before grouping
    const sorted = [...filteredDemands].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      return (da?.getTime() || 0) - (db?.getTime() || 0);
    });

    sorted.forEach(item => {
      // Group by formatted date dd/mm or YYYY-MM
      const dObj = parseDate(item.date);
      const dateKey = dObj 
        ? `${dObj.getDate().toString().padStart(2, "0")}/${(dObj.getMonth() + 1).toString().padStart(2, "0")}`
        : item.date || "N/A";
      
      if (!groups[dateKey]) {
        groups[dateKey] = { total: 0, concluido: 0, falhas: 0, reagendado: 0 };
      }
      
      groups[dateKey].total++;
      const s = item.status.toLowerCase();
      if (isStatusCompleted(item.status)) {
        groups[dateKey].concluido++;
      } else if (s.includes("reagendado")) {
        groups[dateKey].reagendado++;
      } else if (s.includes("não") || s.includes("nao")) {
        groups[dateKey].falhas++;
      }
    });

    // Take the last 15 points if the series is long, to keep visuals breathtaking
    return Object.keys(groups).map(key => ({
      name: key,
      ...groups[key]
    })).slice(-15);
  }, [filteredDemands]);

  // 2. Category share dataset for custom visuals
const chartCategoryData = useMemo(() => {
  return [
    { name: "Suporte", value: generalMetrics.totalSuporte, completed: generalMetrics.completedSuporte, color: "#6366F1" }, // Indigo
    { name: "Ativações", value: generalMetrics.totalAtivacoes, completed: generalMetrics.completedAtivacoes, color: "#0EA5E9" }, // Sky
    { name: "Infraestrutura", value: generalMetrics.totalInfraestrutura, completed: generalMetrics.completedInfraestrutura, color: "#10B981" }, // Emerald
    { name: "Recolhimentos", value: generalMetrics.totalRecolhimentos, completed: generalMetrics.completedRecolhimentos, color: "#F59E0B" }, // Amber
    { name: "Entrega de Carnê", value: generalMetrics.totalEntregaCarne, completed: generalMetrics.completedEntregaCarne, color: "#EC4899" } // Pink
  ].filter(item => item.value > 0);
}, [generalMetrics]);

  // 3. Status distribution dataset (completed, failed, rescheduled)
  const chartStatusData = useMemo(() => {
    const counts = { concluido: 0, reagendado: 0, nao_realizado: 0, pendente: 0 };
    filteredDemands.forEach(d => {
      const s = d.status.toLowerCase();
      if (isStatusCompleted(d.status)) counts.concluido++;
      else if (s.includes("reagendado")) counts.reagendado++;
      else if (s.includes("não") || s.includes("nao")) counts.nao_realizado++;
      else counts.pendente++;
    });

    return [
      { name: "Concluído", value: counts.concluido, color: "#10B981" },
      { name: "Reagendado", value: counts.reagendado, color: "#F59E0B" },
      { name: "Não Realizado", value: counts.nao_realizado, color: "#EF4444" },
      { name: "Pendente", value: counts.pendente, color: "#64748B" }
    ].filter(item => item.value > 0);
  }, [filteredDemands]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-y-auto block relative">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Outer Bento Glass Container */}
        <div className="w-full max-w-4xl bg-slate-900/40 border border-slate-800/85 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 relative z-10 my-4 mx-auto">
          
          {/* LEFT PRESENTATION COLUMN (7 COL-GRID) */}
          <div className="col-span-12 md:col-span-7 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 sm:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-850 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 mb-8">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider font-mono">Sincronização Ativa</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display mb-4">
                Portal de Auditoria de Operações
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md font-sans">
                Acesse o painel integrado de campo para analisar o desempenho dos técnicos de suporte, ativação de infraestrutura e recolhimento de Capex.
              </p>
            </div>

            {/* Quick Micro Feature Grid list in Left Panel */}
            <div className="mt-12 space-y-4 relative z-10 font-sans">
              {[
                { title: "Sincronização Direta", text: "Registros coletados diretamente da planilha oficial de campo com status unificado." },
                { title: "Diagnóstico de Justificativas", text: "Tratamento ortográfico de justificativas e segmentação de responsabilidade operacional." },
                { title: "Métricas de Capex", text: "Indicadores imediatos de equipamentos recolhidos, não realizados e encaminhados para faturamento de multa." }
              ].map((f, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-500/20 font-mono">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-display">{f.title}</h4>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 leading-relaxed">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-500 font-mono mt-8 relative z-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Sincronizado via Google Apps Script API
            </div>
          </div>

          {/* RIGHT ACTION FORM (5 FORM-GRID) */}
          <div className="col-span-12 md:col-span-5 p-8 sm:p-10 flex flex-col justify-center bg-slate-900/60 relative">
            <div className="w-full font-sans">
              <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-mono font-bold block mb-1">Acesso Restrito</span>
              <h3 className="text-xl font-bold text-white tracking-tight font-display mb-6">Autenticação de Usuário</h3>

              {loginError && (
                <div className="mb-5 p-3 rounded-xl bg-rose-550/10 border border-rose-500/20 flex gap-2 text-rose-300 text-xs items-start leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-450" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 font-mono">Usuário</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition font-sans"
                      placeholder="Ex: cristiano.kuhn"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 font-mono">Senha</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition font-sans"
                      placeholder="Sua senha de acesso"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 cursor-pointer transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-600/20"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validando acesso...</span>
                    </>
                  ) : (
                    <span>Entrar no Painel</span>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans flex flex-col md:flex-row antialiased">
      
      {/* PERSISTENT SIDEBAR - BENTO THEME EXECUTIVE NAVIGATION */}
      <aside className="w-full md:w-26 bg-[#0F172A] flex flex-row md:flex-col items-center justify-between md:justify-start py-4 md:py-8 px-6 md:px-0 gap-6 md:gap-8 border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
        <div className="flex items-center gap-3 md:flex-col md:gap-8 w-full md:w-auto justify-between md:justify-center">
          {/* Logo / Brand block */}
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <LayoutGrid className="w-5 h-5 text-white animate-pulse" />
          </div>
          
          <div className="md:hidden flex items-center gap-2">
            <div className="text-right">
              <h2 className="text-white text-xs font-bold font-display tracking-wide">{currentUser?.name.split(" ")[0]}</h2>
              <p className="text-[8px] text-emerald-400 font-mono uppercase tracking-wider">{currentUser?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-450 bg-white/5 rounded-lg cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Navigation Suite */}
        <nav className="flex flex-row md:flex-col gap-2 md:gap-5">
          <button
            onClick={() => { setActiveTab("geral"); if(filters.category === "Recolhimentos") setFilters(p => ({ ...p, category: "all" })); }}
            className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
              activeTab === "geral"
                ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Panorama Geral"
          >
            <Layers className="w-5 h-5" />
            <span className="text-[9px] font-mono hidden md:block">Geral</span>
          </button>

          <button
            onClick={() => { setActiveTab("eficiencia"); }}
            className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
              activeTab === "eficiencia"
                ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Eficiência Operacional"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[9px] font-mono hidden md:block">Eficiência</span>
          </button>

          <button
            onClick={() => { setActiveTab("recolhimentos"); setFilters(p => ({ ...p, category: "Recolhimentos" })); }}
            className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
              activeTab === "recolhimentos"
                ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Controle de Recolhimentos"
          >
            <PackageCheck className="w-5 h-5" />
            <span className="text-[9px] font-mono hidden md:block">Recolhimentos</span>
          </button>

          <button
            onClick={() => { setActiveTab("motivos"); }}
            className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
              activeTab === "motivos"
                ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Motivos & Gargalos"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-[9px] font-mono hidden md:block">Gargalos</span>
          </button>

          {currentUser?.role === "Admin" && (
            <button
              onClick={() => setActiveTab("usuarios")}
              className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
                activeTab === "usuarios"
                  ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title="Gerenciar Usuários"
            >
              <Users className="w-5 h-5" />
              <span className="text-[9px] font-mono hidden md:block">Usuários</span>
            </button>
          )}

          {currentUser?.role === "Admin" && (
            <button
              onClick={() => setActiveTab("auditoria")}
              className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
                activeTab === "auditoria"
                  ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title="Auditoria de Reagendamentos"
            >
              <Search className="w-5 h-5" />
              <span className="text-[9px] font-mono hidden md:block">Auditoria</span>
            </button>
          )}

        </nav>

        {/* Technical Profile Footer in Sidebar */}
        <div className="hidden md:flex flex-col items-center mt-auto gap-4 w-full px-2 border-t border-slate-800/80 pt-6">
          {currentUser && (
            <div className="relative group flex flex-col items-center gap-3">
              {/* Initials badge */}
              <div 
                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold font-mono text-xs ring-1 ring-white/10 hover:ring-indigo-400 cursor-pointer transition shadow-md"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>

              {/* Secure Log-Out button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl cursor-pointer transition"
                title="Sair do Painel"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN BENTO CANVAS */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        
        {/* EXECUTIVE METRIC HEADER SECTION */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
              Dashboard Executivo de Operações
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Olá, <span className="font-bold text-indigo-650">{currentUser?.name}</span> • Sincronização em Tempo Real • {dataState.demands.length} registros auditados da planilha
            </p>
          </div>

          {/* Action Header Panel */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              dataState.source === "live" 
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60" 
                : "text-amber-700 bg-amber-50 border border-amber-200/60"
            }`}>
              <span className={`w-2 h-2 rounded-full ${dataState.source === "live" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
              {dataState.source === "live" ? "Via Google Sheet" : "Offline / Mock"}
            </div>

            <button
              id="btn-recarrregar"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors pointer-cursor disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Sincronizando..." : "Sincronizar Planilha"}
            </button>

            <a
              href="https://script.google.com/macros/s/AKfycbxVKg9Ga7CSv8KwGVV0GAPzpa1G9vy_DqMtxmljVwj8spgIPLxtClSVkU02bUvJCBPFFg/exec"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 text-slate-600 hover:text-slate-900 text-xs transition duration-200 hover:bg-slate-100 cursor-pointer"
            >
              <span>Script API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        {/* RESILIENCE EXPLANATION */}
        {dataState.error && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs sm:text-sm flex gap-3 shadow-sm flex-col sm:flex-row">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Nota de Conexão (Google Sheets):</span> 
                <span>Usando base local offline para garantir que você possa usar o Dashboard mesmo se o script do Google Sheet demorar a carregar. Sinta-se à vontade para clicar em <b>Sincronizar Planilha</b> acima.</span>
              </div>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-auto w-full sm:w-auto shrink-0 font-mono text-[10px] bg-amber-100/60 border border-amber-200 p-2.5 rounded-lg text-amber-955 break-words max-w-full">
              <strong>Mensagem Retornada:</strong><br />
              <div className="mt-1 leading-relaxed select-all max-w-[450px] whitespace-pre-wrap">{dataState.error}</div>
            </div>
          </div>
        )}

        {/* BENTO GRID: FILTERS MODULE (ROW 1) */}
        {activeTab !== "usuarios" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-2 font-mono">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                Matriz de Filtros de Campo Gerais
              </span>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                  className="sm:hidden text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  Filtros <ChevronDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleClearFilters}
                  className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Quick Filter Controls GRID */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${showFiltersMobile ? 'block' : 'hidden sm:grid'}`}>
              
              {/* Filter: Period Start */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  📅 Período Inicial
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                />
              </div>

              {/* Filter: Period End */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  📅 Período Final
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                />
              </div>

              {/* Filter: Technical */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  🔧 Técnico Responsável
                </label>
                <select
                  value={filters.technician}
                  onChange={(e) => setFilters(p => ({ ...p, technician: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                >
                  <option value="all">Sinergia Técnica (Todos)</option>
                  {technicianList.map((tech, i) => (
                    <option key={i} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              {/* Filter: Status */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  💡 Status da OS (Col 2)
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="concluido">Concluído</option>
                  <option value="não realizado">Não Realizado</option>
                  <option value="reagendado">Reagendado</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

              {/* Filter: Category Area */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  🗂️ Área Operacional
                </label>
                <select
                  value={filters.category}
                  disabled={activeTab === "recolhimentos"}
                  onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {activeTab === "recolhimentos" ? (
                    <option value="Recolhimentos">Exclusivo Recolhimento</option>
                  ) : (
                    <>
                      <option value="all">Todas as Áreas</option>
                      <option value="Ativações">Ativações</option>
                      <option value="Suporte">Suporte Técnico</option>
                      <option value="Infraestrutura">Infraestrutura & Eng.</option>
                      <option value="Recolhimentos">Recolhimentos / Cancelamento</option>
                    </>
                  )}
                </select>
              </div>

              {/* Filter: City */}
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  🏙️ Cidade
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                >
                  <option value="all">Todas as Cidades</option>
                  {/* You'll need to populate this dynamically from your data if cities are not fixed */}
                  {/* For now, adding a placeholder. You might need to extract unique cities from your dataState.demands */}
                  <option value="Gramado">Gramado</option>
                  <option value="Canela">Canela</option>
                  <option value="Nova Petrópolis">Nova Petrópolis</option>
                </select>
              </div>

            </div>

            {/* Quick shortcuts + String search input */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider font-mono">Atalhos Período:</span>
                <button
                  onClick={() => handleSetDatePreset("month")}
                  className="px-3 py-1 text-2xs font-semibold bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-700 rounded-lg transition cursor-pointer"
                >
                  Este Mês
                </button>
                <button
                  onClick={() => handleSetDatePreset("30days")}
                  className="px-3 py-1 text-2xs font-semibold bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-700 rounded-lg transition cursor-pointer"
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => handleSetDatePreset("all")}
                  className="px-3 py-1 text-2xs font-semibold bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-700 rounded-lg transition cursor-pointer"
                >
                  Ver Tudo
                </button>
              </div>

              {/* Text search */}
              <div className="relative max-w-sm w-full lg:ml-auto">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Pesquisar por Cliente, Demanda, Detalhes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>
            </div>

          </div>
        </div>
        )}

        {/* INTELIGENCIA ANALÍTICA BANNER - RESOLVES DEDUPLICATION & METRIC DISCREPANCIES */}
        {!loading && activeTab !== "usuarios" && (
          <div className="bg-white border-2 border-indigo-100/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Cálculo de Efetividade Unificada</h4>
                <p className="text-[10px] text-slate-500 font-medium">Os indicadores consideram {groupedProtocols.length} protocolos únicos para evitar duplicidade técnica.</p>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setCalculationMode("protocol")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${calculationMode === "protocol" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Efetividade Protocolo
              </button>
              <button 
                onClick={() => setCalculationMode("assignment")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${calculationMode === "assignment" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Atividades da Agenda
              </button>
            </div>
          </div>
        )}

        {/* BENTO GRID: VIEW 1 - PANORAMA GERAL */}
        {!loading && activeTab === "geral" && (
          <div className="space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card: Total Demands */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Volume Total</span>
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100"><FileSpreadsheet className="w-4 h-4 text-slate-400" /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{generalMetrics.totalDemands}</span>
                  <span className="text-2xs font-bold text-slate-400 uppercase">OS</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Total de agendamentos no período selecionado.</p>
              </div>

              {/* Card: Efficiency */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between ring-1 ring-indigo-500/10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-mono">Efetividade Geral</span>
                  <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100"><TrendingUp className="w-4 h-4 text-indigo-500" /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600 tracking-tight">{generalMetrics.schedulingEfficiency.toFixed(1)}%</span>
                  <div className={`flex items-center text-[10px] font-bold ${generalMetrics.schedulingEfficiency > 75 ? "text-emerald-600" : "text-amber-600"}`}>
                    {generalMetrics.schedulingEfficiency > 75 ? "ALTA" : "MÉDIA"}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Relação de demandas concluídas vs agendadas.</p>
              </div>

              {/* Card: Concluded */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-mono">Demandas Concluídas</span>
                  <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">{generalMetrics.totalCompleted}</span>
                  <span className="text-2xs font-bold text-slate-400 uppercase">OS</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Serviços executados com sucesso em campo.</p>
              </div>

              {/* Card: Capex/Recolhimento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Taxa de Recolhimento</span>
                  <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-100"><PackageCheck className="w-4 h-4 text-amber-500" /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600 tracking-tight">{recolhimentoMetrics.retrievalEffectiveness.toFixed(1)}%</span>
                  <span className="text-2xs font-bold text-slate-400 uppercase">EFETIVO</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Recuperação de equipamentos em cancelamentos.</p>
              </div>
            </div>

            {/* Charts Section Row */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Chart: Temporal Trend (COL-8) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    📈 Tendência Temporal de Produtividade
                  </h4>
                  <div className="flex items-center gap-4 text-[10px] font-bold font-mono uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5 text-indigo-500"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Agendado</div>
                    <div className="flex items-center gap-1.5 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Concluído</div>
                  </div>
                </div>
                
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartTrendData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConcluido" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}
                        itemStyle={{ fontSize: '10px', padding: '2px 0' }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="Agendamentos" />
                      <Area type="monotone" dataKey="concluido" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorConcluido)" name="Concluídos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart: Category Mix (COL-4) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">
                  🥧 Mix de Áreas Operacionais
                </h4>
                
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {chartCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Volume</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">{generalMetrics.totalDemands}</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="mt-6 space-y-3 flex-1">
                  {chartCategoryData.map((item, i) => {
                    const pct = (item.value / generalMetrics.totalDemands) * 100;
                    const eff = item.value > 0 ? (item.completed / item.value) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-2xs font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">{pct.toFixed(0)}%</span>
                          <span className={`text-[8px] font-bold uppercase ${eff > 75 ? "text-emerald-500" : "text-amber-500"}`}>
                            {eff.toFixed(0)}% Eficaz
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* BENTO GRID: VIEW - EFICIÊNCIA OPERACIONAL 2.0 */}
        {!loading && activeTab === "eficiencia" && operationalEfficiencyMetrics && schedulingAdherenceMetrics && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <span className="text-3xs uppercase tracking-widest text-blue-600 font-bold font-mono">Análise de Desempenho Operacional</span>
              <h3 className="text-2xl font-bold text-slate-900 font-display mt-1">Eficiência e Aderência do Agendamento</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
                Este painel utiliza os dados das colunas <b>Nível</b> e <b>Grupos</b> do novo relatório para medir a precisão real da equipe técnica em campo, desconsiderando atividades administrativas ou sem deslocamento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Eficiência Operacional Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-blue-800 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider"><TrendingUp size={18} /> Eficiência Operacional</h3>
                  <p className="text-3xs text-slate-500 mb-4 font-mono uppercase tracking-tight">Relação de serviços concluídos com deslocamento</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-5xl font-black text-blue-600 tracking-tighter">{operationalEfficiencyMetrics.operationalEfficiency.toFixed(1)}%</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                        {operationalEfficiencyMetrics.completedDemandsWithDisplacement} Concluídos
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">de {operationalEfficiencyMetrics.totalDemandsWithDisplacement} totais</div>
                    </div>
                  </div>
                  <div className="w-24 h-24">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie 
                          data={[
                            { value: operationalEfficiencyMetrics.operationalEfficiency }, 
                            { value: 100 - operationalEfficiencyMetrics.operationalEfficiency }
                          ]} 
                          innerRadius={30} 
                          outerRadius={45} 
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell fill="#2563eb" />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 italic">
                  * Considera apenas linhas marcadas como "com_deslocamento" no relatório.
                </div>
              </div>

              {/* Aderência do Agendamento Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-emerald-800 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider"><CheckCircle2 size={18} /> Aderência do Agendamento</h3>
                  <p className="text-3xs text-slate-500 mb-4 font-mono uppercase tracking-tight">Qualidade do planejamento técnico</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-5xl font-black text-emerald-600 tracking-tighter">{schedulingAdherenceMetrics.schedulingAdherence.toFixed(1)}%</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100">
                        {schedulingAdherenceMetrics.adherentDemands} Aderentes
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">de {schedulingAdherenceMetrics.totalDemandsForAdherence} elegíveis</div>
                    </div>
                  </div>
                  <div className="w-24 h-24">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie 
                          data={[
                            { value: schedulingAdherenceMetrics.schedulingAdherence }, 
                            { value: 100 - schedulingAdherenceMetrics.schedulingAdherence }
                          ]} 
                          innerRadius={30} 
                          outerRadius={45} 
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 italic">
                  * Exclui Recolhimentos, Cancelamentos e Entregas de Carnê para medir o nível de acerto da equipe.
                </div>
              </div>
            </div>

            {/* Informational Banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                <Info size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-tight">Por que estas métricas importam?</h4>
                <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                  Diferente da Eficiência Geral, a <b>Eficiência Operacional</b> foca apenas em demandas onde houve deslocamento físico, eliminando o ruído de tarefas administrativas. Já a <b>Aderência</b> valida se a equipe de agendamento está direcionando os técnicos para serviços com alta probabilidade de execução, filtrando tipos de serviço que historicamente possuem maior taxa de insucesso por parte do cliente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BENTO GRID SPACE: VIEW 2 - CONTROLE DE RECOLHIMENTOS (CAPEX) */}
        {!loading && activeTab === "recolhimentos" && (
          <div className="space-y-6">
            
            {/* KPI Cards Row for Recolhimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">Total de Tentativas</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight">{recolhimentoMetrics.totalAttempts}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ring-1 ring-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-mono block mb-1">Efetividade Capex</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{recolhimentoMetrics.retrievalEffectiveness.toFixed(1)}%</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ring-1 ring-amber-500/10">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono block mb-1">Encaminhado Multa</span>
                <span className="text-3xl font-black text-amber-600 tracking-tight">{recolhimentoMetrics.sentToBilling}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">Equipamentos Recuperados</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight">{recolhimentoMetrics.effectiveRetrievals}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              
              {/* Funnel chart simulated / Reasons for loss (COL-8) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  ⚠️ Análise de Perda de Equipamento (Não Recuperados)
                </h4>
                
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Cobrança Financeira", value: recolhimentoMetrics.sentToBilling, fill: "#F59E0B" },
                        { name: "Cliente Ausente", value: recolhimentoMetrics.clientAusente, fill: "#6366F1" },
                        { name: "Equipe Não Compareceu", value: recolhimentoMetrics.teamDidNotGo, fill: "#EF4444" },
                        { name: "Cliente Recusou Devolver", value: recolhimentoMetrics.clientRefused, fill: "#475569" }
                      ].sort((a, b) => b.value - a.value)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Loss breakdown summary (COL-4) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">
                    📉 Impacto de Faturamento
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Encaminhado para Multa</span>
                      <span className="text-2xl font-black text-amber-700">{recolhimentoMetrics.sentToBilling} Unidades</span>
                      <p className="text-[10px] text-amber-800 mt-2 leading-relaxed">Equipamentos que não foram recuperados e já possuem justificativa para lançamento de multa contratual no próximo ciclo.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Perda por Falha Operacional</span>
                      <span className="text-2xl font-black text-rose-700">{recolhimentoMetrics.teamDidNotGo} Unidades</span>
                      <p className="text-[10px] text-rose-800 mt-2 leading-relaxed">Equipamentos não recolhidos porque a equipe técnica não compareceu ao local agendado no dia.</p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100 mt-4">
                  Meta Empresarial de Perda de Capex: &lt; 15%
                </div>
              </div>

            </div>

          </div>
        )}

        {/* BENTO GRID SPACE: VIEW 3 - DIAGNÓSTICO DE FALHAS E JUSTIFICATIVAS */}
        {!loading && activeTab === "motivos" && (
          <div className="space-y-6">
            
            {/* INTRODUCTORY CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <span className="text-3xs uppercase tracking-widest text-indigo-600 font-bold font-mono">Pesquisa Diagnóstica de Campo</span>
              <h3 className="text-2xl font-bold text-slate-900 font-display mt-1">Gargalos logísticos e causas raízes de reagendamentos</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
                Este painel identifica por que as Ordens de Serviço falham ou são reagendadas. A terceira coluna da planilha contêm as justificativas digitadas pelos técnicos no aplicativo, que são consolidadas abaixo para auditar responsabilidade operacional e gargalos do provedor.
              </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              
              {/* Pareto chart / Categorized failure distribution (COL-8) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  💡 Principais Justificativas Citadas (Não Realizados & Reagendados)
                </h4>
                
                {(() => {
                  const reasonMap: { [key: string]: number } = {};
                  filteredDemands.forEach(d => {
                    const isCompleted = isStatusCompleted(d.status);
                    if (!isCompleted && d.reason && d.reason.trim() !== "") {
                      let r = d.reason.trim();
                      if (r.toLowerCase().includes("ausente") || r.toLowerCase().includes("não estava") || r.toLowerCase().includes("nao estava") || r.toLowerCase().includes("fechado")) r = "Cliente Ausente / Não Encontrado";
                      else if (r.toLowerCase().includes("não foi") || r.toLowerCase().includes("nao foi") || r.toLowerCase().includes("não fomos") || r.toLowerCase().includes("atraso")) r = "Equipe Técnica Não Compareceu";
                      else if (r.toLowerCase().includes("cobranca") || r.toLowerCase().includes("cobrança")) r = "Equipamento Cobrado Financeiramente";
                      else if (r.toLowerCase().includes("recus") || r.toLowerCase().includes("devolve") || r.toLowerCase().includes("não permitiu")) r = "Cliente se recusa a devolver / Cooperar";
                      else if (r.toLowerCase().includes("viabilidade") || r.toLowerCase().includes("fibra")) r = "Sem viabilidade técnica física";
                      else if (r.toLowerCase().includes("desistiu") || r.toLowerCase().includes("solicitou cancelamento") || r.toLowerCase().includes("cancelou")) r = "Cliente Desistiu / Cancelou OS";
                      else if (r.toLowerCase().includes("contato")) r = "Sem contato telefônico no dia";
                      
                      reasonMap[r] = (reasonMap[r] || 0) + 1;
                    }
                  });

                  const sortedReasons = Object.entries(reasonMap)
                    .map(([reason, count]) => ({ reason, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6);

                  const totalFailures = sortedReasons.reduce((acc, cr) => acc + cr.count, 0);

                  if (sortedReasons.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 font-mono text-xs">
                        Nenhuma falha ou justificativa registrada no escopo selecionado.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sortedReasons}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 140, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                            <YAxis 
                              dataKey="reason" 
                              type="category" 
                              stroke="#475569" 
                              fontSize={9} 
                              tickLine={false} 
                              width={140}
                            />
                            <Tooltip formatter={(value) => `${value} ocorrências`} />
                            <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={14} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Diagnostic Summary list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        {sortedReasons.map((obj, i) => {
                          const pct = totalFailures > 0 ? (obj.count / totalFailures) * 100 : 0;
                          return (
                            <div key={i} className="p-3 bg-slate-50/75 rounded-xl border border-slate-100 flex items-center justify-between">
                              <span className="text-2xs text-slate-700 font-semibold truncate max-w-[200px]" title={obj.reason}>
                                {i + 1}. {obj.reason}
                              </span>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-slate-900 block">{obj.count} OS</span>
                                <span className="text-[9px] text-slate-500 font-mono block">{pct.toFixed(1)}% das falhas</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Responsabilidade operacional card (COL-4) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">
                    🔍 Auditoria de Responsabilidade
                  </h4>

                  {(() => {
                    let totalFailuresEx = 0;
                    let companyInternalFailures = 0; // "Equipe não foi"
                    let customerFailures = 0; // "Ausente" etc.

                    filteredDemands.forEach(d => {
                      const isCompleted = isStatusCompleted(d.status);
                      if (!isCompleted && d.reason && d.reason.trim() !== "") {
                        totalFailuresEx++;
                        const r = d.reason.toLowerCase();
                        if (r.includes("não foi") || r.includes("nao foi") || r.includes("não fomos") || r.includes("atraso") || r.includes("equipe não")) {
                          companyInternalFailures++;
                        } else if (r.includes("ausente") || r.includes("fechado") || r.includes("não estava") || r.includes("contato") || r.includes("recusou")) {
                          customerFailures++;
                        }
                      }
                    });

                    const internalPct = totalFailuresEx > 0 ? (companyInternalFailures / totalFailuresEx) * 100 : 0;
                    const customerPct = totalFailuresEx > 0 ? (customerFailures / totalFailuresEx) * 100 : 0;

                    return (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                          <h5 className="text-xs font-bold text-orange-950">Falhas por Logística Interna</h5>
                          <span className="text-3xl font-black text-orange-700 block mt-1">{companyInternalFailures} OS</span>
                          <p className="text-3xs text-orange-800 mt-1.5 leading-relaxed font-mono">
                            {internalPct.toFixed(1)}% das falhas registradas ocorrem devido à ausência ou atraso da equipe técnica (&quot;Não fomos&quot;). Representa passivo imediato junto ao SLA contratual.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                          <h5 className="text-xs font-bold text-blue-950">Falhas por Impedimento de Cliente</h5>
                          <span className="text-3xl font-black text-blue-700 block mt-1">{customerFailures} OS</span>
                          <p className="text-3xs text-blue-800 mt-1.5 leading-relaxed font-mono">
                            {customerPct.toFixed(1)}% das falhas ocorrem por impedimentos do usuário (Ausente, Fechado, Não devolveu). Recomenda-se pré-notificação via SMS/WhatsApp ativa.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-3xs uppercase text-slate-500 font-mono font-bold block">Outros Fatores / Não Categorizados</span>
                          <span className="text-lg font-bold text-slate-800 mt-1">{(totalFailuresEx - companyInternalFailures - customerFailures)} OS</span>
                        </div>
                      </div>
                    );
                  })()}

                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100 mt-4">
                  Distribuição baseada no preenchimento de campo
                </div>
              </div>

            </div>

          </div>
        )}

        {/* BENTO GRID SPACE: VIEW 4 - GERENCIAMENTO DE USUÁRIOS (ADMIN ONLY) */}
        {!loading && activeTab === "usuarios" && currentUser?.role === "Admin" && (
          <div className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              
              {/* User Creation Form (COL-5) */}
              <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserIcon className="w-4 h-4 text-indigo-500" />
                  {editingUsername ? "Editar Usuário" : "Cadastrar Novo Usuário"}
                </h4>

                <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono">Nome Completo</label>
                      <input 
                        type="text" 
                        value={userForm.name}
                        onChange={e => setUserForm({...userForm, name: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500"
                        placeholder="Ex: Cristiano Kuhn"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono">Usuário (Login)</label>
                      <input 
                        type="text" 
                        value={userForm.username}
                        disabled={!!editingUsername}
                        onChange={e => setUserForm({...userForm, username: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                        placeholder="cristiano.kuhn"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono">Senha</label>
                      <input 
                        type="password" 
                        value={userForm.password}
                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500"
                        placeholder="********"
                        required={!editingUsername}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono">E-mail Corporativo</label>
                      <input 
                        type="email" 
                        value={userForm.email}
                        onChange={e => setUserForm({...userForm, email: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500"
                        placeholder="cristiano@empresa.com.br"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono">Nível de Acesso</label>
                      <select 
                        value={userForm.role}
                        onChange={e => setUserForm({...userForm, role: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Admin">Administrador (Total)</option>
                        <option value="Gerente">Gerente (Relatórios)</option>
                        <option value="Colaborador">Colaborador (Visualização)</option>
                      </select>
                    </div>
                  </div>

                  {userError && <p className="text-2xs text-rose-600 font-bold bg-rose-50 p-2 rounded border border-rose-100">{userError}</p>}
                  {userSuccess && <p className="text-2xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded border border-emerald-100">{userSuccess}</p>}

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit" 
                      disabled={submittingUser}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {submittingUser ? "Salvando..." : (editingUsername ? "Salvar Alterações" : "Criar Conta")}
                    </button>
                    {editingUsername && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingUsername(null);
                          setUserForm({name: "", username: "", password: "", email: "", role: "Colaborador"});
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Users List (COL-7) */}
              <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-widest">Contas Registradas</h4>
                  <span className="text-2xs text-slate-400 font-mono">{registeredUsers.length} usuários</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-2 pr-4">Nome</th>
                        <th className="pb-2 pr-4">Usuário</th>
                        <th className="pb-2 pr-4">Nível</th>
                        <th className="pb-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <button 
  onClick={fetchRegisteredUsers}
  className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded text-xs"
>
  Recarregar usuários
</button>
                      {fetchingUsers ? (
                        <tr><td colSpan={4} className="py-8 text-center text-xs text-slate-400">Carregando lista...</td></tr>
                      ) : registeredUsers.map((u, i) => (
                        <tr key={i} className="group hover:bg-slate-50 transition">
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{u.name}</span>
                              <span className="text-[10px] text-slate-400">{u.email}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-[10px] text-indigo-600">{u.username}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              u.role === "Admin" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                              u.role === "Gerente" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              "bg-slate-50 text-slate-600 border-slate-100"
                            }`}>{u.role}</span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                              <button 
                                onClick={() => {
                                  setEditingUsername(u.username);
                                  setUserForm({
                                    name: u.name,
                                    username: u.username,
                                    password: "",
                                    email: u.email,
                                    role: u.role
                                  });
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                title="Editar"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.username)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* BENTO GRID: VIEW 5 - GERENCIAMENTO DE USUÁRIOS */}
        {!loading && activeTab === "usuarios" && currentUser?.role === "Admin" && (
          <div className="space-y-6">
            {/* Conteúdo da aba de Usuários */}
          </div>
        )}



        {/* HIGH CONTRAST DETAILED RECORDS MATRIX TABLE */}

        {/* BENTO GRID: VIEW 6 - AUDITORIA DE REAGENDAMENTOS */}
        {!loading && activeTab === "auditoria" && currentUser?.role === "Admin" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
  <div>
    <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
      Auditoria de Reagendamentos
    </h2>
    <p className="text-sm text-slate-500">
      Analise e audite atividades reagendadas com deslocamento para identificar padrões e responsabilidades.
    </p>
  </div>

  <button
    onClick={handleImportAuditRecords}
    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
  >
    Importar Protocolos
  </button>
</div>

            {auditError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-550/10 border border-rose-500/20 flex gap-2 text-rose-300 text-xs items-start leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-450" />
                <span>{auditError}</span>
              </div>
            )}
            {auditSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-550/10 border border-emerald-500/20 flex gap-2 text-emerald-300 text-xs items-start leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-450" />
                <span>{auditSuccess}</span>
              </div>
            )}

            {/* Filtros para Auditoria */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-2 font-mono">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                      Filtros de Auditoria
                    </span>
                    <button
                      onClick={() => setAuditFilters({
                        date_start: "",
                        date_end: "",
                        protocol: "",
                        triedToConfirm: "all",
                        clientConfirmed: "all",
                        schedulingError: "all",
                        whoErrored: "all",
                        errorReason: "all",
                      })}
                      className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        📅 Data Início
                      </label>
                      <input
                        type="date"
                        value={auditFilters.date_start}
                        onChange={(e) => setAuditFilters(p => ({ ...p, date_start: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        📅 Data Fim
                      </label>
                      <input
                        type="date"
                        value={auditFilters.date_end}
                        onChange={(e) => setAuditFilters(p => ({ ...p, date_end: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        # Protocolo
                      </label>
                      <input
                        type="text"
                        value={auditFilters.protocol}
                        onChange={(e) => setAuditFilters(p => ({ ...p, protocol: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        placeholder="Ex: 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        Tentou Confirmar?
                      </label>
                      <select
                        value={auditFilters.triedToConfirm}
                        onChange={(e) => setAuditFilters(p => ({ ...p, triedToConfirm: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="all">Todos</option>
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        Cliente Confirmou?
                      </label>
                      <select
                        value={auditFilters.clientConfirmed}
                        onChange={(e) => setAuditFilters(p => ({ ...p, clientConfirmed: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="all">Todos</option>
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        Erro Agendamento?
                      </label>
                      <select
                        value={auditFilters.schedulingError}
                        onChange={(e) => setAuditFilters(p => ({ ...p, schedulingError: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="all">Todos</option>
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        Quem Errou?
                      </label>
                      <input
                        type="text"
                        value={auditFilters.whoErrored}
                        onChange={(e) => setAuditFilters(p => ({ ...p, whoErrored: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        placeholder="Ex: Técnico, Cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                        Motivo do Erro
                      </label>
                      <input
                        type="text"
                        value={auditFilters.errorReason}
                        onChange={(e) => setAuditFilters(p => ({ ...p, errorReason: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        placeholder="Ex: Chuva, Ausente"
                      />
                    </div>
                  </div>
                </div>
            </div>

            {/* Tabela de Demandas para Auditoria */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-md font-bold text-slate-700 mb-4">Protocolos Filtrados ({auditDemands.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Protocolo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Motivo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {auditDemands.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">Nenhuma demanda encontrada para auditoria com os filtros selecionados.</td>
                      </tr>
                    ) : (
                      paginatedAuditDemands.map((demand, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{demand.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{demand.protocol}</td>
<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
  {demand.triedToConfirm ? "Auditado" : "Pendente"}
</td>
<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
  {demand.errorReason || "-"}
</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {setSelectedAuditDemand(demand);

  setAuditForm({
    date: demand.date,
    protocol: demand.protocol,
    triedToConfirm: "",
    clientConfirmed: "",
    schedulingError: "",
    whoErrored: "",
    errorReason: "",
  });

}}
                              className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold"
                            >
                              Auditar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="flex justify-center items-center gap-4 mt-4">
  <button
    disabled={auditPage === 1}
    onClick={() => setAuditPage(p => p - 1)}
    className="px-3 py-1 border rounded disabled:opacity-50"
  >
    Anterior
  </button>

  <span>
    Página {auditPage} de {totalAuditPages}
  </span>

  <button
    disabled={auditPage === totalAuditPages}
    onClick={() => setAuditPage(p => p + 1)}
    className="px-3 py-1 border rounded disabled:opacity-50"
  >
    Próxima
  </button>
</div>
              </div>
            </div>

            {/* Formulário de Auditoria */}
            {selectedAuditDemand && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-md font-bold text-slate-700 mb-4">
  Auditar Protocolo: {selectedAuditDemand.protocol}
</h3>
                <form onSubmit={handleSaveAuditRecord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Tentamos Confirmar?</label>
                    <select
                      name="triedToConfirm"
                      value={auditForm.triedToConfirm}
                      onChange={handleAuditFormChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="SIM">SIM</option>
                      <option value="NÃO">NÃO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Cliente Havia Confirmado?</label>
                    <select
                      name="clientConfirmed"
                      value={auditForm.clientConfirmed}
                      onChange={handleAuditFormChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="SIM">SIM</option>
                      <option value="NÃO">NÃO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Agendamento Errou?</label>
                    <select
                      name="schedulingError"
                      value={auditForm.schedulingError}
                      onChange={handleAuditFormChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="SIM">SIM</option>
                      <option value="NÃO">NÃO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Quem Errou?</label>
                    <select
                      name="whoErrored"
                      value={auditForm.whoErrored}
                      onChange={handleAuditFormChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="Adrieli">Adrieli</option>
                      <option value="Ariani">Ariani</option>
                      <option value="Tatiane">Tatiane</option>
                      <option value="Graziela">Graziela</option>
                      <option value="Victória">Victória</option>
                      <option value="Tayane">Tayane</option>
                      <option value="Jéssica">Jéssica</option>
                      <option value="Stéfani">Stéfani</option>
                      <option value="Laís">Laís</option>
                      <option value="Tudo Certo">Tudo Certo</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Motivo do Erro</label>
                    <select
                      name="errorReason"
                      value={auditForm.errorReason}
                      onChange={handleAuditFormChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="Erro de Confirmação - Sem Retorno - Remoção da Agenda">Erro de Confirmação - Sem Retorno - Remoção da Agenda</option>
                      <option value="Erro de Confirmação - Contato desatualizado - Remoção da Agenda">Erro de Confirmação - Contato desatualizado - Remoção da Agenda</option>
                      <option value="Erro de Confirmação - Sem Retorno - Remoção da Agenda - Equipe foi deslocada">Erro de Confirmação - Sem Retorno - Remoção da Agenda - Equipe foi deslocada</option>
                      <option value="Agendamento Ok - Cliente Reagendou">Agendamento Ok - Cliente Reagendou</option>
                      <option value="Antecipado por ser Externo">Antecipado por ser Externo</option>
                      <option value="Erro de Confirmação - Chamado contato errado - Remoção da Agenda">Erro de Confirmação - Chamado contato errado - Remoção da Agenda</option>
                      <option value="Não deu tempo - Reagendado pela equipe técnica">Não deu tempo - Reagendado pela equipe técnica</option>
                      <option value="Motivo - Chuva - Equipe deslocada">Motivo - Chuva - Equipe deslocada</option>
                      <option value="Motivo - Chuva - Equipe não deslocada">Motivo - Chuva - Equipe não deslocada</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingAuditRecord}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-600/20"
                    >
                      {submittingAuditRecord ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <span>Salvar Auditoria</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Indicadores de Auditoria */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-md font-bold text-slate-700 mb-4">Indicadores de Auditoria</h3>
              {auditRecords.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum registro de auditoria para exibir indicadores.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Exemplo de Indicador: % de Reagendamentos Confirmados */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-500">% Confirmados</p>
                    <p className="text-2xl font-black text-indigo-600">{((auditRecords.filter(r => r.triedToConfirm === "SIM").length / auditRecords.length) * 100 || 0).toFixed(1)}%</p>
                  </div>
                  {/* Adicionar mais indicadores aqui */}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab !== "usuarios" && activeTab !== "auditoria" && (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-950 font-display uppercase tracking-widest flex items-center gap-2">
                📋 Registro Gerais e Relatório de Auditoria
              </h3>
              <p className="text-3xs text-slate-500 font-mono mt-0.5">
                Mostrando {filteredDemands.length} ordens filtradas de {dataState.demands.length} do banco de dados
              </p>
            </div>
            
            <span className="text-3xs text-slate-400 font-mono">
              Clique em qualquer registro para visualizar detalhes de campo e justificativa do técnico
            </span>
          </div>

          {/* Core Table View Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] font-bold uppercase select-none bg-slate-50/50">
                  <th className="py-3 px-5">📅 Data (Col 7)</th>
                  <th className="py-3 px-5">👤 Protocolo (Col 1)</th>
                  <th className="py-3 px-5">🗂️ Área Categoria</th>
                  <th className="py-3 px-5">📄 Descrição da Demanda (Col 4)</th>
                  <th className="py-3 px-5">💡 Status (Col 2)</th>
                  <th className="py-3 px-5">📝 Justificativa / Motivo (Col 3)</th>
                  <th className="py-3 px-5">🔧 Técnico (Col 5)</th>
                  <th className="py-3 px-5">📍 Cidade (Col 6)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredDemands.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Nenhum registro encontrado para os filtros ativos. Use a barra para refinar.
                    </td>
                  </tr>
                ) : (
                  // Limit list preview to 40 items to keep performance at absolute theoretical limit
                  filteredDemands.slice(0, 40).map((item, index) => {
                    const s = item.status.toLowerCase();
                    const isCompleted = isStatusCompleted(item.status);
                    const isFailed = s.includes("não") || s.includes("nao") || s.includes("fracas") || s.includes("cancel");
                    const isRescheduled = s.includes("reagend");

                    return (
                      <tr 
                        key={index} 
                        className="hover:bg-slate-50/80 transition duration-150 cursor-pointer"
                        onClick={() => setSelectedRecord(item)}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-5 font-mono text-[11px] whitespace-nowrap text-slate-500">
                          {item.date}
                        </td>
                        
                        {/* Protocol */}
                        <td className="py-3.5 px-5 font-semibold text-indigo-650">
                          #{item.protocol_number || "S/P"}
                        </td>
                        
                        {/* Category */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            item.category === "Ativações" ? "bg-sky-50 text-sky-700 border border-sky-100" :
                            item.category === "Suporte" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                            item.category === "Infraestrutura" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        
                        {/* Demand */}
                        <td className="py-3.5 px-5 font-medium text-slate-900 max-w-[200px] truncate" title={item.demand}>
                          {item.demand}
                        </td>
                        
                        {/* Status */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? "bg-emerald-500" : 
                              isRescheduled ? "bg-amber-500" : 
                              isFailed ? "bg-rose-500" : "bg-slate-400"
                            }`} />
                            <span className="font-bold">{item.status}</span>
                          </div>
                        </td>
                        
                        {/* Reason */}
                        <td className="py-3.5 px-5 text-slate-500 italic max-w-[220px] truncate" title={item.reason}>
                          {item.reason || "—"}
                        </td>
                        
                        {/* Technician */}
                        <td className="py-3.5 px-5 font-medium text-slate-600">
                          {item.technician || "N/A"}
                        </td>
                        
                        {/* City */}
                        <td className="py-3.5 px-5 text-slate-500 font-mono text-[10px]">
                          {item.city || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination simulated footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-3xs text-slate-400 font-mono uppercase font-bold">
              Visualizando 40 de {filteredDemands.length} registros (Performance Ativa)
            </span>
            <div className="flex gap-1">
               <button className="px-2 py-1 bg-white border border-slate-200 rounded text-2xs text-slate-400 cursor-not-allowed">Anterior</button>
               <button className="px-2 py-1 bg-white border border-slate-200 rounded text-2xs text-indigo-600 hover:bg-indigo-50 transition cursor-pointer">Próxima</button>
            </div>
          </div>
        </div>
        )}

        {/* MODAL: RECORD DRILL-DOWN (EXECUTIVE DETAIL VIEW) */}
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/40">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-display tracking-tight">Dossiê de Ordem de Serviço</h3>
                  <p className="text-2xs text-slate-400 font-mono uppercase mt-1">Identificador Protocolo: #{selectedRecord.protocol_number || "S/P"}</p>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">📅 Data do Agendamento</span>
                      <p className="text-sm font-bold text-slate-900">{selectedRecord.date}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">🗂️ Área Operacional</span>
                      <p className="text-sm font-bold text-slate-900">{selectedRecord.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">🔧 Técnico Responsável</span>
                      <p className="text-sm font-bold text-slate-900">{selectedRecord.technician}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">📍 Cidade / Unidade</span>
                      <p className="text-sm font-bold text-slate-900">{selectedRecord.city || "Não informado"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">💡 Status Final de Campo</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                        isStatusCompleted(selectedRecord.status) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {selectedRecord.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">📄 Tipo de Demanda</span>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed">{selectedRecord.demand}</p>
                    </div>
                  </div>
                </div>

                {/* Justification highlight box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-500" />
                    Justificativa de Campo (Técnico)
                  </h4>
                  <div className="bg-white border border-slate-100 p-4 rounded-xl text-xs text-slate-600 leading-relaxed italic shadow-sm">
                    &quot;{selectedRecord.reason || "Nenhuma justificativa ou observação foi registrada para este atendimento na Coluna 3 da planilha."}&quot;
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-lg shadow-slate-900/20"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* GLOBAL LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900">Sincronizando com Google Sheets</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">Aguarde a validação da API...</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
