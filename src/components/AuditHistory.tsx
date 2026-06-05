/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search, Calendar, User, Sliders, Edit, Trash2, Copy, Eye, FileText, CheckCircle, XCircle, ArrowRight
} from 'lucide-react';
import { Audit, ProductType } from '../types';

interface AuditHistoryProps {
  audits: Audit[];
  onEditAudit: (audit: Audit) => void;
  onDeleteAudit: (id: string) => Promise<boolean>;
  onDuplicateAudit: (audit: Audit) => void;
  currentUserRole?: string;
}

export default function AuditHistory({
  audits,
  onEditAudit,
  onDeleteAudit,
  onDuplicateAudit,
  currentUserRole
}: AuditHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [productFilter, setProductFilter] = useState<string>('Todos');
  const [auditorFilter, setAuditorFilter] = useState<string>('Todos');
  const [lineFilter, setLineFilter] = useState<string>('Todos');
  const [shiftFilter, setShiftFilter] = useState<string>('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detailed Modal view state
  const [viewAudit, setViewAudit] = useState<Audit | null>(null);

  // Auditors unique list for filter helper
  const uniqueAuditors = useMemo(() => {
    const list = new Set<string>();
    audits.forEach(a => { if (a.auditor) list.add(a.auditor); });
    return ['Todos', ...Array.from(list)];
  }, [audits]);

  // Production lines list
  const uniqueLines = useMemo(() => {
    const list = new Set<string>();
    audits.forEach(a => { if (a.linha) list.add(a.linha); });
    return ['Todos', ...Array.from(list)];
  }, [audits]);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const matchSearch =
        a.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchProduct = productFilter === 'Todos' || a.produto_tipo === productFilter;
      const matchAuditor = auditorFilter === 'Todos' || a.auditor === auditorFilter;
      const matchLine = lineFilter === 'Todos' || a.linha === lineFilter;
      const matchShift = shiftFilter === 'Todos' || a.turno === shiftFilter;

      let matchDates = true;
      if (startDate) {
        matchDates = matchDates && new Date(a.data) >= new Date(startDate);
      }
      if (endDate) {
        matchDates = matchDates && new Date(a.data) <= new Date(endDate);
      }

      return matchSearch && matchProduct && matchAuditor && matchLine && matchShift && matchDates;
    });
  }, [audits, searchTerm, productFilter, auditorFilter, lineFilter, shiftFilter, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
      {/* Filters Control Center */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Main Search input */}
          <div className="flex flex-1 items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-3 py-2 border border-slate-200 dark:border-slate-755 rounded-lg">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por número de lote, modelo de produto ou observações de teste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1.5 px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer ${showFilters ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-emerald-500' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Painel de Filtros Avançados</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters panel */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-150 dark:border-slate-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-200 text-xs">
            {/* Produto Type select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tipo de Produto</label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-80 w border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Ventilador">Ventiladores</option>
                <option value="Liquidificador">Liquidificadores</option>
                <option value="Panela de Pressão">Panelas de Pressão</option>
              </select>
            </div>

            {/* Auditor select option */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Auditor do Lançamento</label>
              <select
                value={auditorFilter}
                onChange={(e) => setAuditorFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {uniqueAuditors.map(aud => (
                  <option key={aud} value={aud}>{aud === 'Todos' ? 'Qualquer Auditor' : aud}</option>
                ))}
              </select>
            </div>

            {/* Linha filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Linha de Produção</label>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {uniqueLines.map(line => (
                  <option key={line} value={line}>{line === 'Todos' ? 'Qualquer Linha' : line}</option>
                ))}
              </select>
            </div>

            {/* Turno filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Turno de Trabalho</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Turno 1">Turno 1</option>
                <option value="Turno 2">Turno 2</option>
                <option value="Turno 3">Turno 3</option>
              </select>
            </div>

            {/* Date ranges start */}
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Período Selecionado (Data Inicial / Final)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <ArrowRight className="w-4 h-4 text-slate-450" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
            
            {/* Reset advanced button */}
            <div className="flex items-end col-span-2">
              <button
                onClick={() => {
                  setProductFilter('Todos');
                  setAuditorFilter('Todos');
                  setLineFilter('Todos');
                  setShiftFilter('Todos');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                Limpar Todos os Parâmetros de Filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Grid of past checklist audits */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
            Histórico Consolidado de Laudos Técnicos ({filteredAudits.length})
          </span>
          <span className="text-[11px] text-slate-400">Inspeções de controle de qualidade</span>
        </div>

        <div className="overflow-x-auto text-xs">
          {filteredAudits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Data / Hora</th>
                  <th className="py-3.5 px-5">Lote</th>
                  <th className="py-3.5 px-5">Modelo Comercial</th>
                  <th className="py-3.5 px-5">Amostragem (Aprov/Rej)</th>
                  <th className="py-3.5 px-5">Rendimento FPY</th>
                  <th className="py-3.5 px-5">Responsável / Linha</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAudits.map((a) => {
                  const fpyVal = a.quantidade_auditada > 0 ? (a.quantidade_aprovada / a.quantidade_auditada) * 100 : 100;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/55 transition-colors">
                      {/* Status indicator */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {a.status === 'Aprovado' ? <CheckCircle className="w-3.5 h-3.5 mr-0.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 mr-0.5 text-rose-500" />}
                          {a.status}
                        </span>
                      </td>

                      {/* Date details */}
                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{a.data.split('-').reverse().join('/')}</span>
                        <p className="text-[10px] font-mono text-slate-400">{a.hora}</p>
                      </td>

                      {/* Lote number */}
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {a.lote}
                        </span>
                      </td>

                      {/* Modelo matched */}
                      <td className="py-3.5 px-5">
                        <span className="font-medium text-slate-850 dark:text-slate-200 truncate max-w-[150px] inline-block">{a.modelo}</span>
                        <p className="text-[9px] font-mono text-slate-400 uppercase">{a.produto_tipo}</p>
                      </td>

                      {/* Sampling rates */}
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">N={a.quantidade_auditada}</span>
                        <p className="text-[10px] font-mono">
                          Aprov: {a.quantidade_aprovada} | <span className="text-red-500 font-bold">Rej: {a.quantidade_rejeitada}</span>
                        </p>
                      </td>

                      {/* Exact yield value FPY */}
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-slate-200">
                        <span className={fpyVal >= 95 ? 'text-emerald-500' : 'text-amber-500'}>
                          {fpyVal.toFixed(1)}%
                        </span>
                      </td>

                      {/* Line & Owner */}
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-750 dark:text-slate-300">{a.auditor}</span>
                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]" title={a.linha}>{a.linha}</p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewAudit(a)}
                            className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Visualizar laudo técnico"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditAudit(a)}
                            className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Modificar informações"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateAudit(a)}
                            className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Duplicar para novo turno/lote"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {currentUserRole === 'Auditor' ? (
                            <button
                              disabled
                              className="p-1 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50"
                              title="Seu perfil de Auditor não possui permissão para excluir relatórios"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onDeleteAudit(a.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition animate-in zoom-in-0 duration-400"
                              title="Excluir do histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma auditoria registrada coincide com os filtros do painel.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Modal view layout */}
      {viewAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-xs leading-normal">
            
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-slate-550 uppercase">Laudo de Liberação de Lote: {viewAudit.lote}</span>
              <button onClick={() => setViewAudit(null)} className="text-xs text-slate-450 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Main row fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-150 dark:border-slate-850">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold font-mono">Lote Comercial</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{viewAudit.lote}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold font-mono">Produto Aferido</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewAudit.modelo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold font-mono">Data / Hora</p>
                  <p className="text-sm font-medium text-slate-850 dark:text-slate-200">{viewAudit.data.split('-').reverse().join('/')} - {viewAudit.hora}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold font-mono">Linha / Turno</p>
                  <p className="text-sm font-semibold text-slate-750 dark:text-slate-350">{viewAudit.linha.split(' ').pop()} - {viewAudit.turno}</p>
                </div>
              </div>

              {/* Sampling KPIs display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Tamanho da Amostra (N)</p>
                  <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{viewAudit.quantidade_auditada}</p>
                  <p className="text-[10px] text-slate-400">unidades testadas mecanicamente</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-500 font-mono">Peças Aprovadas</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{viewAudit.quantidade_aprovada}</p>
                  <p className="text-[10px] text-slate-400">Totalmente conforme ISO 9001</p>
                </div>
                <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-rose-500 font-mono">Peças Rejeitadas</p>
                  <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{viewAudit.quantidade_rejeitada}</p>
                  <p className="text-[10px] text-slate-400">Contendo não-conformidades</p>
                </div>
              </div>

              {/* Checklist visual results */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 rounded-xl">
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-2">Checklist de Verificação Dimensional</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.keys(viewAudit.checklist).map(key => (
                    <div key={key} className="flex items-center space-x-2 py-1">
                      {viewAudit.checklist[key] ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[240px]" title={key}>{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes or details */}
              {viewAudit.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Observações Operacionais</p>
                  <div className="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10 text-slate-650 dark:text-slate-300 italic whitespace-pre-wrap">
                    "{viewAudit.notes}"
                  </div>
                </div>
              )}

              {/* Close Button actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 font-mono">
                  Registrado por {viewAudit.auditor} em {new Date(viewAudit.created_at || '').toLocaleString()}
                </span>
                <button
                  onClick={() => setViewAudit(null)}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-840 text-white rounded-lg font-bold cursor-pointer"
                >
                  OK, Entendido
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
