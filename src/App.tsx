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
import { parseSheetRow, calculateGeneralMetrics, calculateRecolhimentoMetrics, parseDate, groupDemandsByProtocol, isStatusCompleted } from "./utils";
import { RawDemand, DashboardFilters, User } from "./types";

export default function App() {
  // User authentication states
  const [activeTab, setActiveTab] = useState<"geral" | "recolhimentos" | "motivos" | "usuarios">("geral");
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
    category: "all"
  });

  // Load spreadsheet data from the backend proxy
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/data");
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
      let startIndex = 0;
      if (rowsToProcess.length > 0 && Array.isArray(rowsToProcess[0])) {
        const testHeader = rowsToProcess[0].join(" ").toLowerCase();
        if (
          testHeader.includes("status") || 
          testHeader.includes("demanda") || 
          testHeader.includes("data") || 
          testHeader.includes("servi") ||
          testHeader.includes("técnico") ||
          testHeader.includes("motivo")
        ) {
          startIndex = 1; // skip header row
        }
      }

      for (let i = startIndex; i < rowsToProcess.length; i++) {
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

  useEffect(() => {
    fetchData();
  }, []);

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
        } else if (s !== filterVal) {
          return false;
        }
      }

      // 4. Technician Filter (checks if technician was part of the protocol team)
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

  // Compute stats dynamically based on current filtered dataset
  const generalMetrics = useMemo(() => {
    return calculateGeneralMetrics(filteredDemands);
  }, [filteredDemands]);

  const recolhimentoMetrics = useMemo(() => {
    return calculateRecolhimentoMetrics(filteredDemands);
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
      { name: "Recolhimentos", value: generalMetrics.totalRecolhimentos, completed: generalMetrics.completedRecolhimentos, color: "#F59E0B" }  // Amber
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
              onClick={() => { setActiveTab("usuarios"); }}
              className={`p-3 rounded-xl transition duration-200 cursor-pointer flex flex-col items-center gap-1 group ${
                activeTab === "usuarios"
                  ? "text-indigo-400 bg-white/10 ring-1 ring-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title="Gerenciamento de Usuários"
            >
              <Users className="w-5 h-5" />
              <span className="text-[9px] font-mono hidden md:block">Usuários</span>
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
              href="https://script.google.com/macros/s/AKfycbyt9oKLdVTEoBlFW9NThj7usEkYYzRbDJZOY_DY9cnnrxT-L-ZrWJj8UuSuBf4BgTBKdQ/exec"
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
          <div className="bg-white border-2 border-indigo-100/70 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center flex-wrap gap-2">
                  <span>Filtro de Inteligência de Auditoria Sênior</span>
                  <span className="bg-green-50 text-green-700 text-3xs px-2.5 py-0.5 font-bold rounded-full font-mono border border-green-200">
                    DEDUPLICAÇÃO ATIVA (RECOMENDADO)
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-2xl leading-normal">
                  Uma única Ordem de Serviço física (definida pelo <b>número de protocolo</b>) pode ter 2 ou mais técnicos atuando juntos em co-autoria. A planilha exportada da agenda possui múltiplos registros síncronos para o mesmo protocolo correspondendo a cada técnico. Ative a visão de <b>Protocolos Únicos</b> para consolidar os dados operacionais e medir a eficiência de forma real (sem distorções de equipe).
                </p>
              </div>
            </div>

            {/* Selector Toggle */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded-xl shrink-0 self-stretch md:self-auto border border-slate-200">
              <button
                id="btn-modo-protocolo"
                onClick={() => setCalculationMode("protocol")}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition duration-150 cursor-pointer ${
                  calculationMode === "protocol"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🎯 Protocolos Únicos
              </button>
              <button
                id="btn-modo-bruto"
                onClick={() => setCalculationMode("assignment")}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition duration-150 cursor-pointer ${
                  calculationMode === "assignment"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📋 Agenda Bruta (Linhas)
              </button>
            </div>
          </div>
        )}

        {/* LOADING ANIMATION */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <span className="text-sm font-bold text-slate-900 font-display">Calculando Agregados Operacionais</span>
            <span className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos...</span>
          </div>
        )}

        {/* BENTO GRID SPACE: VIEW 1 - PANORAMA GERAL DO NEGÓCIO */}
        {!loading && activeTab === "geral" && (
          <div className="grid grid-cols-12 gap-6">
            
            {/* CARD 1: GLOBAL SCHEDULING EFFICIENCY (BENTO COL-4) */}
            <div className="col-span-12 md:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[180px] hover:border-indigo-400 transition duration-150 group">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Eficiência Global</span>
                  <p className="text-3xs text-slate-400 font-mono mt-0.5">Visitas Concluídas / Escopo Planejado</p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              
              <div className="my-auto">
                <h2 className="text-4xl font-bold font-display text-slate-900">
                  {generalMetrics.schedulingEfficiency.toFixed(1)}%
                </h2>
                <p className="text-2xs text-slate-500 mt-1 font-mono">
                  {generalMetrics.totalCompleted} ordens concluídas de {generalMetrics.totalDemands} planejadas
                </p>
              </div>

              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-550" 
                  style={{ width: `${generalMetrics.schedulingEfficiency}%` }}
                />
              </div>
            </div>

            {/* CARD 2: CONCLUDED VOLUMES AREA COMPOSE (BENTO COL-8) */}
            <div className="col-span-12 md:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition duration-150">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Distribuição de Demandas Concluídas</span>
                  <p className="text-3xs text-slate-400 font-mono">Métricas de entrega segmentadas por setor das OS síncronas</p>
                </div>
                <span className="text-3xs text-slate-400 font-mono">MÉTRICAS POR SETOR</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 items-center pb-2">
                <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-500">Ativações</span>
                  <span className="text-2xl font-bold text-sky-600 mt-1">{generalMetrics.completedAtivacoes}</span>
                  <span className="text-4xs font-mono text-slate-400 mt-0.5">de {generalMetrics.totalAtivacoes} agendamentos</span>
                </div>

                <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-500">Suporte Técnico</span>
                  <span className="text-2xl font-bold text-indigo-600 mt-1">{generalMetrics.completedSuporte}</span>
                  <span className="text-4xs font-mono text-slate-400 mt-0.5">de {generalMetrics.totalSuporte} agendamentos</span>
                </div>

                <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-500">Infra & Eng.</span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1">{generalMetrics.completedInfraestrutura}</span>
                  <span className="text-4xs font-mono text-slate-400 mt-0.5">de {generalMetrics.totalInfraestrutura} agendamentos</span>
                </div>

                <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-500">Recolhimento</span>
                  <span className="text-2xl font-bold text-amber-600 mt-1">{generalMetrics.completedRecolhimentos}</span>
                  <span className="text-4xs font-mono text-slate-400 mt-0.5">de {generalMetrics.totalRecolhimentos} agendamentos</span>
                </div>
              </div>
            </div>

            {/* CARD 3: TEMPORAL CHRONOLOGICAL LOGISTIC LINE PROGRESS (BENTO COL-8) */}
            <div className="col-span-12 md:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Cronologia Logística Real-Time
                  </h3>
                  <p className="text-3xs text-slate-400 font-mono">Variações e tendências das últimas datas agregados</p>
                </div>
                
                <div className="flex items-center gap-3 text-3xs font-mono">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs" /> Concluído</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Falhas</span>
                </div>
              </div>

              <div className="h-[250px]">
                {chartTrendData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
                    Sem dados históricos condizentes disponíveis.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorConcluido" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorFalha" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }}
                      />
                      <Area type="monotone" dataKey="concluido" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConcluido)" name="Concluídos" />
                      <Area type="monotone" dataKey="falhas" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFalha)" name="Não Realizados" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* CARD 4: CATEGORY BREAKDOWN COMPOSITION (BENTO COL-4) */}
            <div className="col-span-12 md:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-1">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Composição de OS
                </h3>
                <p className="text-3xs text-slate-400 font-mono">Fatias por Área de Atendimento</p>
              </div>

              <div className="h-[180px] flex items-center justify-center relative">
                {chartCategoryData.length === 0 ? (
                  <span className="text-xs text-slate-400 font-mono">Sem dados</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartCategoryData}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} chamados`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center text metrics */}
                <div className="absolute text-center">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">VOLUME</p>
                  <p className="text-2xl font-bold font-display text-slate-800">{generalMetrics.totalDemands}</p>
                </div>
              </div>

              {/* Grid Legends */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                {chartCategoryData.map((item, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-600 font-medium truncate" title={`${item.name} (${item.value})`}>
                      {item.name}: <b>{item.value}</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 5: DETAILED STATUS METRICS (BENTO COL-12) */}
            <div className="col-span-12 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Auditoria de Status da Equipe Operacional
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-2xs font-semibold text-emerald-800 uppercase block font-mono">✓ Concluído com Sucesso</span>
                  <span className="text-3xl font-bold text-emerald-700 block mt-1">{generalMetrics.totalCompleted}</span>
                  <span className="text-3xs text-emerald-600 font-mono leading-normal block mt-1">Alta sinergia e resolutividade</span>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <span className="text-2xs font-semibold text-amber-800 uppercase block font-mono">⚠️ Reagendado pela Equipe</span>
                  <span className="text-3xl font-bold text-amber-700 block mt-1">
                    {filteredDemands.filter(d => d.status.toLowerCase().includes("reagendado")).length}
                  </span>
                  <span className="text-3xs text-amber-600 font-mono leading-normal block mt-1">Gargalos operacionais ou de clima</span>
                </div>

                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <span className="text-2xs font-semibold text-rose-800 uppercase block font-mono">❌ Não Realizado no Período</span>
                  <span className="text-3xl font-bold text-rose-700 block mt-1">
                    {filteredDemands.filter(d => d.status.toLowerCase().includes("não") || d.status.toLowerCase().includes("nao")).length}
                  </span>
                  <span className="text-3xs text-rose-600 font-mono leading-normal block mt-1">Fracassos ou envio direto a cobrança</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-2xs font-semibold text-slate-700 uppercase block font-mono">⏳ Pendentes na Fila</span>
                  <span className="text-3xl font-bold text-slate-800 block mt-1">
                    {filteredDemands.filter(d => d.status.toLowerCase().includes("pendente") || d.status.trim() === "").length}
                  </span>
                  <span className="text-3xs text-slate-500 font-mono leading-normal block mt-1">Chamados em aguardo de resposta</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* BENTO GRID SPACE: VIEW 2 - PORTAL EXCLUSIVO DE RECOLHIMENTOS */}
        {!loading && activeTab === "recolhimentos" && (
          <div className="space-y-6">
            
            {/* INCREDIBLE BENTO COMPLEX DESIGN: GLOWING DEEP SLATE PANEL (COL-12) */}
            <div className="bg-[#0F172A] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row gap-6 justify-between items-stretch">
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest font-mono">PORTAL DE PROTEÇÃO DE CAPEX</span>
                  <h3 className="text-white text-3xl font-bold font-display mt-2">Visão Geral de Recolhimento & Cancelamentos</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                    Mapeamento refinado de tentativas de recuperação de equipamentos. Medição de performance de reagendamentos ("equipe não foi") e perdas financeiras direcionadas para a cobrança automática.
                  </p>
                </div>

                {/* Progress metrics */}
                <div className="mt-6 md:mt-12 bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md">
                  <div className="flex justify-between items-center text-xs text-slate-300 mb-2 font-medium">
                    <span>Recuperação de Materiais Efetiva</span>
                    <span className="font-bold text-emerald-400">{recolhimentoMetrics.retrievalEffectiveness.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-2.5 rounded-full transition-all duration-550" 
                      style={{ width: `${recolhimentoMetrics.retrievalEffectiveness}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bento cards stack */}
              <div className="w-full md:w-80 flex flex-col gap-3">
                
                {/* Mini Card 1 - Efetivos */}
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex hover:bg-white/10 transition">
                  <div className="mr-3 p-2 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-3xs uppercase font-mono">Recolhidos Efetivos</span>
                    <h4 className="text-xl font-bold text-white mt-0.5">{recolhimentoMetrics.effectiveRetrievals}</h4>
                    <p className="text-[10px] text-slate-550 font-mono mt-0.5">Equipamentos recuperados</p>
                  </div>
                </div>

                {/* Mini Card 2 - Ausência de Cliente */}
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex hover:bg-white/10 transition">
                  <div className="mr-3 p-2 bg-blue-500/10 text-blue-400 rounded-xl flex items-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-3xs uppercase font-mono">Cliente Ausente</span>
                    <h4 className="text-xl font-bold text-blue-400 mt-0.5">{recolhimentoMetrics.clientAusente}</h4>
                    <p className="text-[10px] text-slate-550 font-mono mt-0.5">Endereço fechado / Ausente</p>
                  </div>
                </div>

                {/* Mini Card 3 - Recusa do Usuário */}
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex hover:bg-white/10 transition">
                  <div className="mr-3 p-2 bg-violet-500/10 text-violet-400 rounded-xl flex items-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-3xs uppercase font-mono">Recusas / Retenções</span>
                    <h4 className="text-xl font-bold text-violet-400 mt-0.5">{recolhimentoMetrics.clientRefused}</h4>
                    <p className="text-[10px] text-slate-550 font-mono mt-0.5">Não devolve / Se recusou</p>
                  </div>
                </div>

                {/* Mini Card 4 - Cobrança */}
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex hover:bg-white/10 transition">
                  <div className="mr-3 p-2 bg-rose-500/10 text-rose-400 rounded-xl flex items-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-3xs uppercase font-mono">Enviados Cobrança</span>
                    <h4 className="text-xl font-bold text-rose-400 mt-0.5">{recolhimentoMetrics.sentToBilling}</h4>
                    <p className="text-[10px] text-slate-550 font-mono mt-0.5">Fracasso + Fatura de Multa</p>
                  </div>
                </div>

                {/* Mini Card 5 - Ausências de Equipe */}
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex hover:bg-white/10 transition">
                  <div className="mr-3 p-2 bg-amber-500/10 text-amber-400 rounded-xl flex items-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-3xs uppercase font-mono">Equipe &quot;Não Foi&quot;</span>
                    <h4 className="text-xl font-bold text-amber-400 mt-0.5">{recolhimentoMetrics.teamDidNotGo}</h4>
                    <p className="text-[10px] text-slate-550 font-mono mt-0.5">Falha de campo operacional</p>
                  </div>
                </div>

              </div>

            </div>

            {/* BENTO STATS BREAKDOWNS (ROW 2) */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* CARD 1: EXECUTIVES BAR METRICS FOR MOTIVE AUDITS (COL-8) */}
              <div className="col-span-12 md:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <Wrench className="w-4 h-4 text-slate-600" />
                  Auditoria de Tentativas de Recolhimento por Razões de Campo
                </h3>
                
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Total Tentativas", valor: recolhimentoMetrics.totalAttempts, fill: "#64748B" },
                        { name: "Recuperado", valor: recolhimentoMetrics.effectiveRetrievals, fill: "#10B981" },
                        { name: "Ausência Cliente", valor: recolhimentoMetrics.clientAusente, fill: "#3B82F6" },
                        { name: "Recusa / Retido", valor: recolhimentoMetrics.clientRefused, fill: "#8B5CF6" },
                        { name: "Equipe Não Foi", valor: recolhimentoMetrics.teamDidNotGo, fill: "#F59E0B" },
                        { name: "Multa Cobrança", valor: recolhimentoMetrics.sentToBilling, fill: "#EF4444" }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip formatter={(value) => `${value} ordens`} />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        <Cell fill="#64748B" />
                        <Cell fill="#10B981" />
                        <Cell fill="#3B82F6" />
                        <Cell fill="#8B5CF6" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CARD 2: ADMONISHMENTS PANELS (COL-4) */}
              <div className="col-span-12 md:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between font-sans">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Medidas Logísticas de Ativos
                  </h3>
                  
                  <div className="space-y-3 mt-3">
                    <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-3xs">
                      <h4 className="text-xs font-bold text-red-900">Ausência da Equipe Técnica</h4>
                      <p className="text-[10px] text-red-750 leading-relaxed mt-1 font-sans">
                        Identificamos <b>{recolhimentoMetrics.teamDidNotGo} reagendamentos</b> por culpa interna (&quot;equipe não foi&quot;). Representa desperdício financeiro direto em deslocamentos.
                      </p>
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-3xs">
                      <h4 className="text-xs font-bold text-blue-900">Ausentismos & Recusas</h4>
                      <p className="text-[10px] text-blue-750 leading-relaxed mt-1 font-sans">
                        <b>{recolhimentoMetrics.clientAusente} clientes ausentes</b> e <b>{recolhimentoMetrics.clientRefused} recusas</b> de devolução mostram a necessidade de agendamentos mais firmes.
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-3xs">
                      <h4 className="text-xs font-bold text-amber-900">Direcionamento à Cobrança</h4>
                      <p className="text-[10px] text-amber-750 leading-relaxed mt-1 font-sans">
                        Os <b>{recolhimentoMetrics.sentToBilling} chamados</b> direcionados à cobrança contratual evitam o prolongamento e geram faturamento compensatório de Capex.
                      </p>
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

        {/* HIGH CONTRAST DETAILED RECORDS MATRIX TABLE */}
        {activeTab !== "usuarios" && (
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
                        
                        {/* Demand name */}
                        <td className="py-3.5 px-5 font-medium text-slate-900 max-w-[200px] truncate" title={item.demand}>
                          {item.demand}
                        </td>
                        
                        {/* Status */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Concluído
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-md text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Não Realizado
                            </span>
                          )}
                          {isRescheduled && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Reagendado
                            </span>
                          )}
                          {!isCompleted && !isFailed && !isRescheduled && (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              {item.status || "Pendente"}
                            </span>
                          )}
                        </td>
                        
                        {/* Justification Reason */}
                        <td className="py-3.5 px-5 text-slate-500 max-w-[150px] truncate" title={item.reason || "Nenhuma observação informada"}>
                          {item.reason || <span className="text-slate-300 italic">Nenhuma</span>}
                        </td>
                        
                        {/* Technician */}
                        <td className="py-3.5 px-5 font-medium text-slate-600 whitespace-nowrap">
                          {item.technician || <span className="text-slate-300">Não designado</span>}
                        </td>

                        {/* City */}
                        <td className="py-3.5 px-5 text-slate-550 font-medium">
                          {item.city || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-3xs text-slate-400 font-mono">
            <span>Visualizando registros cronológicos (máx. 40 por performance)</span>
            <span>Total Filtrado: {filteredDemands.length} registros</span>
          </div>

        </div>
        )}

        {/* BENTO GRID SPACE: VIEW 4 - GESTÃO DE USUÁRIOS (ADMIN ONLY) */}
        {!loading && activeTab === "usuarios" && currentUser?.role === "Admin" && (
          <div className="space-y-6">
            
            {/* INTRODUCTORY CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in">
              <span className="text-3xs uppercase tracking-widest text-indigo-600 font-bold font-mono">Controle de Segurança e Acessos</span>
              <h3 className="text-2xl font-bold text-slate-900 font-display mt-1">Gestão de Equipes e Permissões</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed font-medium">
                Adicione novos colaboradores, redefina senhas de suporte, gerencie níveis de acesso (Admin, Gerente ou Colaborador) e envie e-mails automáticos com dados de acesso para novos membros.
              </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              
              {/* FORM: ADD OR EDIT USER (COL-4) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
                <h4 className="text-xs font-bold font-mono text-slate-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  {editingUsername ? "✏️ Editar Usuário" : "👤 Novo Usuário"}
                </h4>

                {userError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-750 text-xs rounded-xl flex gap-1.5 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{userError}</span>
                  </div>
                )}

                {userSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-750 text-xs rounded-xl flex gap-1.5 items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{userSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Nome Completo</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-900 focus:outline-none transition font-sans"
                      placeholder="Ex: Cristiano Rafael Kuhn"
                      value={userForm.name}
                      onChange={(e) => setUserForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Username field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Usuário (Login)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-900 focus:outline-none transition font-sans disabled:opacity-50"
                      placeholder="Ex: cristiano.kuhn"
                      value={userForm.username}
                      onChange={(e) => setUserForm(p => ({ ...p, username: e.target.value }))}
                      disabled={!!editingUsername}
                      required
                    />
                    {editingUsername && <p className="text-[9px] text-slate-400 font-mono mt-1">Nome de usuário não editável.</p>}
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Senha de Acesso</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-900 focus:outline-none transition font-mono"
                      placeholder="Ex: Digite uma senha"
                      value={userForm.password}
                      onChange={(e) => setUserForm(p => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Email field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">E-mail Profissional</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-900 focus:outline-none transition font-sans"
                      placeholder="Ex: cristiano@empresa.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Level / Role field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Nível de Acesso</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-900 focus:outline-none transition font-sans font-semibold cursor-pointer"
                      value={userForm.role}
                      onChange={(e) => setUserForm(p => ({ ...p, role: e.target.value }))}
                      required
                    >
                      <option value="Admin">Admin</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Colaborador">Colaborador</option>
                    </select>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {submittingUser ? "Salvando..." : (editingUsername ? "Atualizar" : "Cadastrar")}
                    </button>
                    {editingUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUsername(null);
                          setUserForm({
                            name: "",
                            username: "",
                            password: "",
                            email: "",
                            role: "Colaborador"
                          });
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition duration-150 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* TABLE: ALL MEMBERS LIST & ACTIONS (COL-8) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-xs font-bold font-mono text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Membros do Sistema ({registeredUsers.length})
                  </h4>
                  <span className="text-3xs text-slate-400 font-mono">Cadastrados via Banco Local (server.ts)</span>
                </div>

                {fetchingUsers ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                    <span className="text-3xs text-slate-400 font-mono">Buscando lista de credenciais...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-mono text-[9px] font-bold uppercase select-none bg-slate-50/50">
                          <th className="py-2 px-3">Nome / Usuário</th>
                          <th className="py-2 px-3">Senha</th>
                          <th className="py-2 px-3">Nível</th>
                          <th className="py-2 px-3">E-mail</th>
                          <th className="py-2 px-3 text-right">Ações de Controle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {registeredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                              Nenhum usuário recuperado do servidor. Sincronizando...
                            </td>
                          </tr>
                        ) : (
                          registeredUsers.map((u, idx) => {
                            const isMasterUser = u.username === "cristiano.kuhn";
                            return (
                              <tr key={idx} className="hover:bg-slate-50/40 transition duration-150">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{u.name}</div>
                                  <div className="text-3xs text-slate-400 font-mono font-bold">@{u.username}</div>
                                </td>
                                <td className="py-3 px-3 font-mono text-indigo-700 font-bold select-all bg-indigo-50/20 rounded px-1.5 py-0.5">
                                  {u.password}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    u.role === "Admin" ? "bg-purple-100 text-purple-700 border border-purple-200/50" :
                                    u.role === "Gerente" ? "bg-cyan-50 text-cyan-700 border border-cyan-100" :
                                    "bg-slate-100 text-slate-700 border border-slate-200/50"
                                  }`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-500 text-[11px] truncate max-w-[120px]" title={u.email}>
                                  {u.email}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-right space-x-1">
                                  {/* Email Requisition Trigger */}
                                  <button
                                    onClick={() => handleSendInviteEmail(u)}
                                    className="inline-flex items-center gap-1 px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono transition font-bold cursor-pointer"
                                    title="Disparar e-mail de requisição com credenciais"
                                  >
                                    Convite ✉️
                                  </button>

                                  {/* Edit Button */}
                                  <button
                                    onClick={() => {
                                      setEditingUsername(u.username);
                                      setUserForm({
                                        name: u.name,
                                        username: u.username,
                                        password: u.password,
                                        email: u.email,
                                        role: u.role
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded text-[10px] font-mono transition font-bold cursor-pointer"
                                    title="Editar perfil"
                                  >
                                    Editar
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteUser(u.username)}
                                    disabled={isMasterUser}
                                    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-mono transition font-bold ${
                                      isMasterUser 
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                                        : "bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                                    }`}
                                    title={isMasterUser ? "Administrador master não pode ser excluído" : "Deletar usuário"}
                                  >
                                    Deletar
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* SIMULATED EMAIL MODAL LOG */}
            {simulatedEmail && (
              <div className="bg-indigo-950/90 border border-indigo-800 rounded-2xl p-5 text-indigo-100 flex flex-col md:flex-row gap-5 items-start mt-6 shadow-xl relative animate-fade-in">
                <button 
                  onClick={() => setSimulatedEmail(null)}
                  className="absolute top-4 right-4 text-indigo-300 hover:text-white font-bold cursor-pointer font-mono"
                >
                  Fechar [X]
                </button>
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center justify-center shrink-0 text-xl font-bold font-mono">
                  ✉️
                </div>
                <div className="space-y-2 flex-1 font-sans">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-300">
                    Log de Serviço Local — E-mail de credencial despachado com sucesso!
                  </h4>
                  <p className="text-[11px] leading-relaxed text-indigo-200">
                    O servidor simula com sucesso o envio de um convite de segurança com as credenciais. Abaixo está a composição do e-mail que o usuário <b>{simulatedEmail.name}</b> recebeu:
                  </p>
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 font-mono text-xs text-indigo-300 max-w-full overflow-x-auto whitespace-pre-wrap select-all">
                    <b>Assunto:</b> Credenciais de Acesso — Auditoria de Operações-Campo<br/>
                    <b>Destinatário:</b> {simulatedEmail.email} ({simulatedEmail.name})<br/>
                    <b>Remetente Administrador:</b> {currentUser.name}<br/>
                    <b>Data do Disparo:</b> {new Date(simulatedEmail.timestamp).toLocaleString("pt-BR")}<br/>
                    ----------------------------------------------------------------------<br/><br/>
                    {simulatedEmail.body}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER METRICS SYSTEM INFO */}
      <footer className="bg-[#0F172A] text-slate-400 border-t border-slate-800 py-6 text-center text-xs md:hidden">
        <div className="px-4 flex flex-col items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-white font-bold font-display">Dashboard de Agendamentos</span>
            <span className="text-slate-600">|</span>
            <span>Métricas e Capex</span>
          </div>
          <span className="font-mono text-3xs text-slate-500">
            Conexão Google Apps Script • AKfycbyt...
          </span>
        </div>
      </footer>

      {/* HIGH-QUALITY MODAL FOR OS AUDITING DETAILED VIEW */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition duration-150 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="bg-indigo-600 text-white p-5 shadow-md">
              <span className="text-[9px] font-mono font-bold tracking-widest text-indigo-200 uppercase block">
                AUDITORIA DE ORDEM DE SERVIÇO
              </span>
              <h3 className="text-md font-bold font-display text-white mt-1">
                Cliente ID: {selectedRecord.client || "Não qualificado"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                    📅 Data do Agendamento
                  </span>
                  <span className="text-slate-800 font-semibold">{selectedRecord.date}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                    ⚙️ Área de OS
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider ${
                    selectedRecord.category === "Ativações" ? "bg-sky-50 text-sky-700" :
                    selectedRecord.category === "Suporte" ? "bg-indigo-50 text-indigo-700" :
                    selectedRecord.category === "Infraestrutura" ? "bg-emerald-50 text-emerald-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>
                    {selectedRecord.category}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                  📄 Demanda Registrada (Coluna 4)
                </span>
                <span className="text-slate-900 font-semibold text-xs leading-relaxed block bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  {selectedRecord.demand}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                    💡 Status OS (Coluna 2)
                  </span>
                  <span className="text-slate-800 font-semibold text-xs capitalize flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      isStatusCompleted(selectedRecord.status) ? "bg-emerald-500" :
                      selectedRecord.status.toLowerCase().includes("reagendado") ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                    🔧 Técnico de Campo (Coluna 6)
                  </span>
                  <span className="text-slate-800 font-semibold">{selectedRecord.technician || "Sem roteamento"}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                  📝 Motivação Comercial / Justificativa (Coluna 5)
                </span>
                <span className="text-slate-900 block bg-slate-50 p-3 rounded-lg border border-slate-150 leading-normal">
                  {selectedRecord.reason || <span className="italic text-slate-400 text-3xs">Técnico não reportou justificativa nessa execução.</span>}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 bg-slate-50 p-3 rounded-lg text-[10px] font-mono text-slate-400">
                <span className="block font-bold uppercase text-slate-500">ESTRUTURA DE AUDITORIA:</span>
                <span className="block max-h-[80px] overflow-y-auto mt-1 break-all scrollbar-thin">
                  {JSON.stringify(selectedRecord.raw || selectedRecord)}
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-150">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition shadow-sm"
              >
                Concluir Inspeção
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
