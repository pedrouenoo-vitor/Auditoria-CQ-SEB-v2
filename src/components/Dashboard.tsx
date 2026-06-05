/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, ClipboardCheck, AlertTriangle, Cpu, Users, BarChart2, Calendar, ShieldCheck, Zap, Download
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Audit, Defect, AuditDefect } from '../types';
import { generateQualityPDF } from '../services/pdfGenerator';

interface DashboardProps {
  audits: Audit[];
  defects: Defect[];
  auditDefects: AuditDefect[];
}

export default function Dashboard({ audits, defects, auditDefects }: DashboardProps) {
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('Todos');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('Todos');
  const [timePeriod, setTimePeriod] = useState<string>('30'); // '7', '30', 'all'

  // Available unique lines
  const availableLines = useMemo(() => {
    const lines = new Set<string>();
    audits.forEach(a => { if (a.linha) lines.add(a.linha); });
    return ['Todos', ...Array.from(lines)];
  }, [audits]);

  // General Filtered Audits
  const filteredAudits = useMemo(() => {
    let result = [...audits];
    
    // Time Period Filter
    const today = new Date();
    if (timePeriod !== 'all') {
      const limitDate = new Date();
      limitDate.setDate(today.getDate() - parseInt(timePeriod));
      result = result.filter(a => new Date(a.data) >= limitDate);
    }

    // Product Filter
    if (selectedProductFilter !== 'Todos') {
      result = result.filter(a => a.produto_tipo === selectedProductFilter);
    }

    // Line Filter
    if (selectedLineFilter !== 'Todos') {
      result = result.filter(a => a.linha === selectedLineFilter);
    }

    return result;
  }, [audits, selectedProductFilter, selectedLineFilter, timePeriod]);

  // Extract linked defects for filtered selection
  const filteredAuditDefects = useMemo(() => {
    const auditIds = new Set(filteredAudits.map(a => a.id));
    return auditDefects.filter(ad => auditIds.has(ad.audit_id));
  }, [auditDefects, filteredAudits]);

  // 1. MAIN KPI CALCULATIONS
  const stats = useMemo(() => {
    const totalAudits = filteredAudits.length;
    let totalPiecesAudited = 0;
    let totalPiecesPassed = 0;
    let totalPiecesFailed = 0;

    filteredAudits.forEach(a => {
      totalPiecesAudited += a.quantidade_auditada;
      totalPiecesPassed += a.quantidade_aprovada;
      totalPiecesFailed += a.quantidade_rejeitada;
    });

    // Sum of defect quantities found in the audits
    const totalDefectsCount = filteredAuditDefects.reduce((acc, curr) => acc + curr.quantidade, 0);

    // PPM (Partes por Milhão) = (Total Peças Rejeitadas / Total Peças Auditadas) * 1.000.000
    const ppm = totalPiecesAudited > 0 ? Math.round((totalPiecesFailed / totalPiecesAudited) * 1000000) : 0;

    // FPY (First Pass Yield) % = (Total Peças Aprovadas / Total Peças Auditadas) * 100%
    const fpy = totalPiecesAudited > 0 ? (totalPiecesPassed / totalPiecesAudited) * 100 : 100;

    const approvalRate = totalPiecesAudited > 0 ? (totalPiecesPassed / totalPiecesAudited) * 100 : 100;
    const rejectionRate = totalPiecesAudited > 0 ? (totalPiecesFailed / totalPiecesAudited) * 100 : 0;

    // FPY indicator trend calculation (e.g. comparing first half vs second half of the filtered list)
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (filteredAudits.length >= 4) {
      const mid = Math.floor(filteredAudits.length / 2);
      const secondHalf = filteredAudits.slice(0, mid);
      const firstHalf = filteredAudits.slice(mid);

      const firstHalfTotal = firstHalf.reduce((sum, a) => sum + a.quantidade_auditada, 0);
      const firstHalfPassed = firstHalf.reduce((sum, a) => sum + a.quantidade_aprovada, 0);
      const firstYield = firstHalfTotal > 0 ? firstHalfPassed / firstHalfTotal : 1;

      const secondHalfTotal = secondHalf.reduce((sum, a) => sum + a.quantidade_auditada, 0);
      const secondHalfPassed = secondHalf.reduce((sum, a) => sum + a.quantidade_aprovada, 0);
      const secondYield = secondHalfTotal > 0 ? secondHalfPassed / secondHalfTotal : 1;

      if (secondYield > firstYield + 0.005) trendDirection = 'up';
      else if (secondYield < firstYield - 0.005) trendDirection = 'down';
    }

    return {
      totalAudits,
      totalPiecesAudited,
      totalPiecesPassed,
      totalPiecesFailed,
      totalDefectsCount,
      ppm,
      fpy,
      approvalRate,
      rejectionRate,
      trendDirection
    };
  }, [filteredAudits, filteredAuditDefects]);

  // 2. RECHARTS: AUDITS BY PRODUCT TYPE
  const auditsByProductData = useMemo(() => {
    const dataMap: { [key: string]: number } = { 'Ventilador': 0, 'Liquidificador': 0, 'Panela de Pressão': 0 };
    filteredAudits.forEach(a => {
      if (dataMap[a.produto_tipo] !== undefined) {
        dataMap[a.produto_tipo] += a.quantidade_auditada;
      }
    });

    return Object.keys(dataMap).map(key => ({
      name: key,
      value: dataMap[key]
    }));
  }, [filteredAudits]);

  // 3. RECHARTS: AUDITS BY PRODUCTION LINE
  const auditsByLineData = useMemo(() => {
    const lineMap: { [key: string]: { auditadas: number; aprovadas: number; rejeitadas: number } } = {};
    filteredAudits.forEach(a => {
      if (!lineMap[a.linha]) {
        lineMap[a.linha] = { auditadas: 0, aprovadas: 0, rejeitadas: 0 };
      }
      lineMap[a.linha].auditadas += a.quantidade_auditada;
      lineMap[a.linha].aprovadas += a.quantidade_aprovada;
      lineMap[a.linha].rejeitadas += a.quantidade_rejeitada;
    });

    return Object.keys(lineMap).map(key => ({
      name: key,
      'Auditadas': lineMap[key].auditadas,
      'Aprovadas': lineMap[key].aprovadas,
      'Rejeitadas': lineMap[key].rejeitadas
    }));
  }, [filteredAudits]);

  // 4. RECHARTS: AUDITS BY SHIFT (TURNO)
  const auditsByShiftData = useMemo(() => {
    const shiftMap: { [key: string]: number } = { 'Turno 1': 0, 'Turno 2': 0, 'Turno 3': 0 };
    filteredAudits.forEach(a => {
      if (shiftMap[a.turno] !== undefined) {
        shiftMap[a.turno] += a.quantidade_auditada;
      }
    });

    return Object.keys(shiftMap).map(key => ({
      name: key,
      value: shiftMap[key]
    }));
  }, [filteredAudits]);

  // 5. RECHARTS: PARETO 80/20 & DEFEITOS RATING
  const paretoData = useMemo(() => {
    // Count exact defects quantities by defect object
    const defectCounts: { [defectId: string]: number } = {};
    filteredAuditDefects.forEach(ad => {
      defectCounts[ad.defect_id] = (defectCounts[ad.defect_id] || 0) + ad.quantidade;
    });

    // Match defect details
    const mapped = Object.keys(defectCounts).map(defectId => {
      const defDefect = defects.find(d => d.id === defectId);
      return {
        id: defectId,
        codigo: defDefect?.codigo || 'Falha',
        nome: defDefect?.nome || 'Não Especificado',
        categoria: defDefect?.categoria || 'Geral',
        quantidade: defectCounts[defectId]
      };
    });

    // Sort descending by quantity
    mapped.sort((a, b) => b.quantidade - a.quantidade);

    const totalDefectsValue = mapped.reduce((sum, d) => sum + d.quantidade, 0);

    // Calculate accumulated percentages
    let accSum = 0;
    const finalPareto = mapped.map(item => {
      accSum += item.quantidade;
      const accPercent = totalDefectsValue > 0 ? (accSum / totalDefectsValue) * 100 : 0;
      return {
        ...item,
        'Quantidade': item.quantidade,
        'Acumulado (%)': Math.round(accPercent)
      };
    });

    return {
      list: finalPareto.slice(0, 10), // TOP 10
      total: totalDefectsValue
    };
  }, [filteredAuditDefects, defects]);

  // 6. MONTHLY TREND MATRIX
  const trendData = useMemo(() => {
    // Group audits by date
    const dateMap: { [date: string]: { total: number; passed: number; qty: number } } = {};
    
    // Fill gaps or use existing dates sorted
    filteredAudits.forEach(a => {
      if (!dateMap[a.data]) {
        dateMap[a.data] = { total: 0, passed: 0, qty: 0 };
      }
      dateMap[a.data].total += a.quantidade_auditada;
      dateMap[a.data].passed += a.quantidade_aprovada;
      dateMap[a.data].qty += 1;
    });

    return Object.keys(dateMap)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => {
        const formattedDate = date.split('-').reverse().slice(0, 2).join('/'); // dd/mm
        const yieldVal = dateMap[date].total > 0 ? (dateMap[date].passed / dateMap[date].total) * 100 : 100;
        return {
          date: formattedDate,
          'FPY (%)': parseFloat(yieldVal.toFixed(1)),
          'Pecas': dateMap[date].total,
          'Auditorias': dateMap[date].qty
        };
      });
  }, [filteredAudits]);

  // CHART CONSTANTS
  const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      {/* Filters Strip */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm fade-in">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase font-mono tracking-wider">
            Filtros Consolidados
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Period Selection */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTimePeriod('7')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${timePeriod === '7' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setTimePeriod('30')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${timePeriod === '30' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setTimePeriod('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${timePeriod === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Total Ativo
            </button>
          </div>

          {/* Product Type Filter */}
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Todos">Todos os Produtos</option>
            <option value="Ventilador">Ventiladores</option>
            <option value="Liquidificador">Liquidificadores</option>
            <option value="Panela de Pressão">Panelas de Pressão</option>
          </select>

          {/* Production Line Filter */}
          <select
            value={selectedLineFilter}
            onChange={(e) => setSelectedLineFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {availableLines.map(line => (
              <option key={line} value={line}>{line === 'Todos' ? 'Todas as Linhas' : line}</option>
            ))}
          </select>

          {/* Export PDF Actions */}
          <button
            onClick={() => generateQualityPDF(filteredAudits, defects, filteredAuditDefects)}
            id="btn-export-dashboard-pdf"
            className="flex items-center space-x-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer select-none border border-sky-400"
            title="Baixar Laudo Técnico Completo em PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Gerar Laudo PDF</span>
          </button>
        </div>
      </div>

      {/* Main KPIs Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-300">
        
        {/* KPI: Audits Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Auditorias de Lote
            </span>
            <p className="text-2xl font-bold font-sans text-slate-900 dark:text-white" id="kpi-total-auditorias">
              {stats.totalAudits}
            </p>
            <p className="text-[10px] text-slate-400">
              Registros no período
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-700 dark:text-slate-300">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Quality Rate FPY */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              FPY (First Pass Yield)
            </span>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold font-sans text-slate-900 dark:text-white" id="kpi-fpy">
                {stats.fpy.toFixed(1)}%
              </p>
              {stats.trendDirection === 'up' && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Alta
                </span>
              )}
              {stats.trendDirection === 'down' && (
                <span className="text-[10px] text-rose-500 font-bold flex items-center animate-pulse">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> Queda
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Taxa de aceitação sem re-trabalho
            </p>
          </div>
          <div className={`p-2.5 rounded-lg text-white ${stats.fpy >= 95 ? 'bg-emerald-600' : 'bg-amber-500'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Defect Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Defeitos Encontrados
            </span>
            <p className="text-2xl font-bold font-sans text-slate-900 dark:text-white" id="kpi-total-defeitos">
              {stats.totalDefectsCount}
            </p>
            <p className="text-[10px] text-slate-400">
              {stats.totalPiecesFailed} unidades rejeitadas
            </p>
          </div>
          <div className={`p-2.5 rounded-lg ${stats.totalDefectsCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Industrial PPM */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              PPM (Partes por Milhão)
            </span>
            <p className="text-2xl font-bold font-sans text-slate-900 dark:text-white" id="kpi-ppm">
              {stats.ppm.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">
              Total de {stats.totalPiecesAudited.toLocaleString()} auditados
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-700 dark:text-slate-300">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Second KPIs breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yield metrics */}
        <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-xl border border-emerald-550/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Aprovação Final</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.approvalRate.toFixed(1)}%</span>
        </div>
        <div className="p-4 bg-rose-500/10 dark:bg-rose-950/20 rounded-xl border border-rose-550/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Reprovação / Descarte</span>
          <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">{stats.rerejectionRate === undefined ? stats.rejectionRate.toFixed(1) : parseFloat('0.0').toFixed(1)}%</span>
        </div>
        <div className="p-4 bg-indigo-500/10 dark:bg-indigo-950/20 rounded-xl border border-indigo-550/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Lotes Totais Auditados</span>
          <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">{stats.totalAudits} Lotes</span>
        </div>
      </div>

      {/* Main Charts Row 1: Monthly trend and Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart A: Pareto Quality Issues Curve & Bars */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <Zap className="mr-2 w-4.5 h-4.5 text-amber-500" />
              Diagrama de Pareto 80/20 (TOP Defeitos)
            </h3>
            <p className="text-[11px] text-slate-400">Classificação descrescente por volume acumulado de ocorrências</p>
          </div>
          <div className="h-72 w-full">
            {paretoData.list.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData.list} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="codigo" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" label={{ value: 'Ocorrências', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10 } }} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: 'Acumulado %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="Quantidade" fill="#ef4444" radius={[4, 4, 0, 0]} name="Defeitos" />
                  <Line yAxisId="right" type="monotone" dataKey="Acumulado (%)" stroke="#3b82f6" strokeWidth={2.5} name="Curva Pareto %" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum defeito registrado no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Chart B: Quality Trend (FPY over timeline) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <TrendingUp className="mr-2 w-4.5 h-4.5 text-emerald-500" />
              Tendência Diária da Qualidade (FPY %)
            </h3>
            <p className="text-[11px] text-slate-400">Evolução do First Pass Yield ao longo do tempo</p>
          </div>
          <div className="h-72 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <defs>
                    <linearGradient id="colorPms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" domain={[60, 100]} label={{ value: 'FPY %', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Peças Auditadas', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="right" dataKey="Pecas" fill="#cbd5e1" className="dark:fill-slate-700" opacity={0.5} name="Total Inspeções" />
                  <Line yAxisId="left" type="monotone" dataKey="FPY (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Rendimento FPY %" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aguardando registro de dados históricos.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Distribution by Production components */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Chart C: Product Proportion Allocation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center mb-3">
            <Cpu className="mr-1.5 w-4 h-4 text-emerald-500" /> Auditorias por Tipo de Produto
          </h4>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={auditsByProductData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {auditsByProductData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} peças`} contentStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend indicator */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {auditsByProductData.map((d, idx) => (
              <div key={d.name} className="flex items-center space-x-1.5 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart D: Bar distribution by Assembly lines */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center mb-3">
            <BarChart2 className="mr-1.5 w-4 h-4 text-emerald-500" /> Defeitos Comparativos por Linha
          </h4>
          <div className="h-56 w-full">
            {auditsByLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditsByLineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} />
                  <Tooltip contentStyle={{ fontSize: '11.5px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Aprovadas" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} name="Aprovado" />
                  <Bar dataKey="Rejeitadas" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} name="Rejeitado" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum dado por linha disponível.
              </div>
            )}
          </div>
        </div>

        {/* Chart E: Distribution by Shift */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center mb-3">
            <Users className="mr-1.5 w-4 h-4 text-emerald-500" /> Atividades por Turno
          </h4>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={auditsByShiftData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {auditsByShiftData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} peças`} contentStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-[10px] text-slate-400">
            Comparativo de volume total inspecionado por turno de trabalho
          </div>
        </div>

      </div>
    </div>
  );
}
