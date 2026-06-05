/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertOctagon, HelpCircle, CheckCircle, BarChart, Printer, Download, Star, Award
} from 'lucide-react';
import { Audit, Defect, AuditDefect } from '../types';
import { generateQualityPDF } from '../services/pdfGenerator';

interface ReportsManagerProps {
  audits: Audit[];
  defects: Defect[];
  auditDefects: AuditDefect[];
}

export default function ReportsManager({ audits, defects, auditDefects }: ReportsManagerProps) {
  
  // Calculate Reports Insights
  const reportData = useMemo(() => {
    const totalDefectsMap: { [defectId: string]: number } = {};
    const productDefectsMap: { [product: string]: { [id: string]: number } } = {
      'Ventilador': {}, 'Liquidificador': {}, 'Panela de Pressão': {}
    };
    const lineDefectsMap: { [line: string]: number } = {};
    const shiftDefectsMap: { [shift: string]: number } = {};
    const auditorDefectsMap: { [auditor: string]: number } = {};

    let totalInspected = 0;
    let totalFailed = 0;

    // Map audits
    audits.forEach(a => {
      totalInspected += a.quantidade_auditada;
      totalFailed += a.quantidade_rejeitada;
    });

    // Populate defects counts
    auditDefects.forEach(ad => {
      // Find audit
      const audit = audits.find(a => a.id === ad.audit_id);
      if (!audit) return;

      const count = ad.quantidade;
      const defectId = ad.defect_id;

      // 1. Total global
      totalDefectsMap[defectId] = (totalDefectsMap[defectId] || 0) + count;

      // 2. By Product
      const prodType = audit.produto_tipo;
      if (productDefectsMap[prodType]) {
        productDefectsMap[prodType][defectId] = (productDefectsMap[prodType][defectId] || 0) + count;
      }

      // 3. By Line
      lineDefectsMap[audit.linha] = (lineDefectsMap[audit.linha] || 0) + count;

      // 4. By Shift
      shiftDefectsMap[audit.turno] = (shiftDefectsMap[audit.turno] || 0) + count;

      // 5. By Auditor
      auditorDefectsMap[audit.auditor] = (auditorDefectsMap[audit.auditor] || 0) + count;
    });

    // Sort global defects to rank them
    const globalRank = Object.keys(totalDefectsMap).map(id => {
      const def = defects.find(d => d.id === id);
      return {
        codigo: def?.codigo || 'Err',
        nome: def?.nome || 'Não Especificado',
        categoria: def?.categoria || 'Geral',
        severidade: def?.severidade || 'Menor',
        quantidade: totalDefectsMap[id]
      };
    }).sort((a, b) => b.quantidade - a.quantidade);

    // Sum of all defects
    const totalDefectsCount = globalRank.reduce((sum, d) => sum + d.quantidade, 0);

    // Pareto 80/20 critical cutoff list
    let accumulated = 0;
    const paretoGroup = globalRank.map((item) => {
      accumulated += item.quantidade;
      const percentage = totalDefectsCount > 0 ? (accumulated / totalDefectsCount) * 100 : 0;
      return {
        ...item,
        isCritical80: percentage <= 80
      };
    });

    // Top defect for each product type
    const topByProduct = Object.keys(productDefectsMap).map(type => {
      const subMap = productDefectsMap[type];
      const sorted = Object.keys(subMap).map(id => {
        const def = defects.find(d => d.id === id);
        return {
          nome: def?.nome || 'N/A',
          codigo: def?.codigo || '',
          quantidade: subMap[id]
        };
      }).sort((a, b) => b.quantidade - a.quantidade);

      return {
        produto: type,
        topDefeito: sorted[0] || null
      };
    });

    // Find worst Line and Turno
    const worstLine = Object.keys(lineDefectsMap).map(k => ({ name: k, count: lineDefectsMap[k] })).sort((a, b) => b.count - a.count)[0] || null;
    const worstShift = Object.keys(shiftDefectsMap).map(k => ({ name: k, count: shiftDefectsMap[k] })).sort((a, b) => b.count - a.count)[0] || null;
    const worstAuditor = Object.keys(auditorDefectsMap).map(k => ({ name: k, count: auditorDefectsMap[k] })).sort((a, b) => b.count - a.count)[0] || null;

    // FPY average
    const fpy = totalInspected > 0 ? ((totalInspected - totalFailed) / totalInspected) * 100 : 100;

    // Detect critical non-conformity deviation alarm triggers (severity: 'Crítico')
    const criticalAlarms = audits.filter(a => {
      // Find if this audit had critical defects
      const ads = auditDefects.filter(ad => ad.audit_id === a.id);
      return ads.some(ad => {
        const def = defects.find(d => d.id === ad.defect_id);
        return def?.severidade === 'Crítico';
      });
    }).slice(0, 5); // Return top 5 critical occurrences

    return {
      fpy,
      totalInspected,
      totalFailed,
      totalDefectsCount,
      globalRank,
      paretoGroup,
      topByProduct,
      worstLine,
      worstShift,
      worstAuditor,
      criticalAlarms
    };
  }, [audits, defects, auditDefects]);

  const fpyTarget = 95.0; // Corporate industry ISO standard 

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 printable-area">
      
      {/* KPI Header Panel */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300">Inteligência Gerencial de Qualidade</h2>
          </div>
          <p className="text-xl font-bold font-sans">Relatóro de Pareto ISO 9001 & Análise de Tendência</p>
          <p className="text-xs text-slate-400 max-w-xl">
            Painel contendo notificações automáticas de desvio crítico na linha de produção, ranking de falhas 80/20 e classificação de auditorias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => generateQualityPDF(audits, defects, auditDefects)}
            id="btn-export-reports-pdf"
            className="flex items-center space-x-1 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 border border-sky-450 rounded-lg text-xs font-bold text-slate-950 cursor-pointer select-none"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Gerar PDF Digital</span>
          </button>

          <button
            onClick={handlePrint}
            id="btn-print-reports"
            className="flex items-center space-x-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-705 border border-slate-700/60 rounded-lg text-xs font-semibold cursor-pointer select-none"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir Página</span>
          </button>
        </div>
      </div>

      {/* Critical Deviations & Alerts Section */}
      {reportData.criticalAlarms.length > 0 && (
        <div className="p-5 bg-rose-500/10 dark:bg-rose-955/20 border border-rose-500/20 rounded-xl space-y-3 animate-pulse duration-2000">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <AlertOctagon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Notificações Críticas Ativas (Desvio de Processo ou Segurança)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
            Foram registradas falhas classificadas como <b>Críticas</b> (risco à integridade física do cliente ou inoperabilidade total de motor) nas últimas auditorias. Recomenda-se parada imediata da linha para re-calibração.
          </p>
          <div className="divide-y divide-rose-500/10 text-xs">
            {reportData.criticalAlarms.map((alm) => (
              <div key={alm.id} className="py-2.5 flex items-center justify-between text-[11px] leading-relaxed">
                <div>
                  <span className="font-mono font-bold text-rose-500">{alm.lote}</span> | <span className="font-semibold text-slate-750 dark:text-slate-200">{alm.modelo}</span>
                  <p className="text-[10px] text-slate-400 font-mono">Linha: {alm.linha} | Responsável: {alm.auditor}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold font-sans rounded">
                    Risco Crítico
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{alm.data.split('-').reverse().join('/')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pareto 80/20 Explanation Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pareto explanation module */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-3 col-span-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-mono flex items-center">
            <BarChart className="w-4.5 h-4.5 mr-1.5 text-emerald-500" /> Diagrama de Pareto 80/20 dos Defeitos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O princípio de Pareto afirma que <b>80% dos problemas provêm de 20% das causas</b>. Concentrar esforços corretivos nesses poucos problemas vitais reduz drasticamente o índice geral de re-trabalho industriais.
          </p>

          <div className="overflow-x-auto text-xs pt-2">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-850 font-mono font-bold text-[10px] text-slate-400 uppercase">
                  <th className="py-2">Rank</th>
                  <th className="py-2">Código</th>
                  <th className="py-2">Falha Registrada</th>
                  <th className="py-2">Ocorrências</th>
                  <th className="py-2 text-right">Foco Corretivo 80/20?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {reportData.paretoGroup.slice(0, 5).map((item, index) => (
                  <tr key={index} className="py-3">
                    <td className="py-2 font-mono font-bold">#{index + 1}</td>
                    <td className="py-2 font-mono font-semibold text-rose-500">{item.codigo}</td>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{item.nome}</td>
                    <td className="py-2 font-bold font-mono">{item.quantidade} pcs</td>
                    <td className="py-2 text-right">
                      {item.isCritical80 ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-450 font-bold rounded">
                          Sim, Vital
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded">
                          Trivial
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Indicator Tendency Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-mono">
            Indicador de Tendência de Qualidade
          </h3>

          <div className="space-y-4 text-xs font-sans">
            {/* Average FPY Indicator Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Médio do Fundo de Linha</span>
                <span className={`font-bold font-mono ${reportData.fpy >= fpyTarget ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {reportData.fpy.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${reportData.fpy >= fpyTarget ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${Math.min(100, Math.max(0, reportData.fpy))}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Meta Mínima: {fpyTarget}%</span>
                <span>Auditados Geral: {reportData.totalInspected.toLocaleString()}</span>
              </div>
            </div>

            {/* Micro rankings list */}
            <div className="pt-2 border-t border-slate-150 dark:border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Linha com maior desvio:</span>
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono uppercase">{reportData.worstLine ? reportData.worstLine.name.split(' ').pop() : 'Nenhuma'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Turno com maior desvio:</span>
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">{reportData.worstShift ? reportData.worstShift.name : 'Nenhum'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auditor Mais Ativo:</span>
                <span className="font-bold text-slate-850 dark:text-slate-200">{reportData.worstAuditor ? reportData.worstAuditor.name : 'N/A'}</span>
              </div>
            </div>
            
            {/* Status sign */}
            <div className={`p-3 rounded-lg border text-center font-bold ${
              reportData.fpy >= fpyTarget 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {reportData.fpy >= fpyTarget ? 'PROCESSO SOB CONTROLE ESTATÍSTICO' : 'PROCESSO SOB ALERTA CORPORATIVO'}
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Product Specific Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportData.topByProduct.map((item, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm text-xs">
            <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.produto}</span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 mb-3">Ranking de Não-Conformidade</h4>
            
            {item.topDefeito ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Principal Causa:</span>
                  <span className="font-mono font-bold text-red-500">{item.topDefeito.codigo}</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{item.topDefeito.nome}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Total de {item.topDefeito.quantidade} ocorrências registradas em linha.</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">Nenhuma falha registrada para esta classe no período.</p>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
