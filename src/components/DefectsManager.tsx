/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileWarning, Plus, Search, Trash2, Edit2, Download, Upload, AlertCircle, CheckCircle2, Sliders
} from 'lucide-react';
import { Defect } from '../types';

interface DefectsManagerProps {
  defects: Defect[];
  onSaveDefect: (defect: Omit<Defect, 'id'> & { id?: string }) => Promise<Defect>;
  onDeleteDefect: (id: string) => Promise<boolean>;
  onImportCSV: (data: Omit<Defect, 'id'>[]) => Promise<{ success: number; errors: string[] }>;
}

export default function DefectsManager({
  defects,
  onSaveDefect,
  onDeleteDefect,
  onImportCSV
}: DefectsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('Todos');

  // Form modal state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [severidade, setSeveridade] = useState<'Crítico' | 'Maior' | 'Menor'>('Crítico');

  // CSV Import States
  const [csvText, setCsvText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: number; errors: string[] } | null>(null);

  // Unique categories for list helper
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    defects.forEach(d => { if (d.categoria) cats.add(d.categoria); });
    return Array.from(cats);
  }, [defects]);

  // Filtered defects
  const filteredDefects = useMemo(() => {
    return defects.filter(d => {
      const matchSearch =
        d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSeverity = severityFilter === 'Todos' || d.severidade === severityFilter;
      return matchSearch && matchSeverity;
    });
  }, [defects, searchTerm, severityFilter]);

  // Open modal for new
  const handleOpenNew = () => {
    setEditId(null);
    setCodigo('');
    setNome('');
    setDescricao('');
    setCategoria('Mecânico');
    setSeveridade('Crítico');
    setIsOpenModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (d: Defect) => {
    setEditId(d.id);
    setCodigo(d.codigo);
    setNome(d.nome);
    setDescricao(d.descricao);
    setCategoria(d.categoria);
    setSeveridade(d.severidade);
    setIsOpenModal(true);
  };

  // Submit defect
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nome || !categoria) return;

    const payload: Omit<Defect, 'id'> & { id?: string } = {
      codigo: codigo.toUpperCase(),
      nome,
      descricao,
      categoria,
      severidade
    };

    if (editId) payload.id = editId;

    await onSaveDefect(payload);
    setIsOpenModal(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Codigo', 'Nome', 'Descricao', 'Categoria', 'Severidade'];
    const rows = defects.map(d => [
      d.codigo,
      d.nome,
      d.descricao,
      d.categoria,
      d.severidade
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'qualicontrol_defeitos_categorizados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from CSV
  const handleImportCSV = async () => {
    if (!csvText.trim()) return;

    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const parsedData: Omit<Defect, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!matches) continue;

      const values = matches.map(v => v.replace(/^["']|["']$/g, '').replace(/""/g, '"'));

      const rowObj: any = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || '';
        const key = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        rowObj[key] = val;
      });

      // Severity check
      const rawSev = rowObj.severidade || 'Menor';
      const parsedSev = rawSev.toLowerCase().includes('crit') ? 'Crítico' : (rawSev.toLowerCase().includes('maior') ? 'Maior' : 'Menor');

      parsedData.push({
        codigo: (rowObj.codigo || '').toUpperCase(),
        nome: rowObj.nome || '',
        descricao: rowObj.descricao || '',
        categoria: rowObj.categoria || 'Geral',
        severidade: parsedSev
      });
    }

    const result = await onImportCSV(parsedData);
    setImportStatus(result);
    if (result.success > 0) {
      setCsvText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm fade-in">
        <div className="flex flex-1 items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar defeito, código ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Gravidade Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {['Todos', 'Crítico', 'Maior', 'Menor'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${severityFilter === sev ? 'bg-white dark:bg-slate-950 font-bold text-rose-500 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* CSV Import Layout */}
      {showImportArea && (
        <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-xl space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono">
                Cadastro de Defeitos via CSV
              </h4>
              <p className="text-[11px] text-slate-500">
                Cole linhas formatadas. Cabeçalhos suportados: <code className="font-mono bg-slate-200 dark:bg-slate-830 px-1 rounded">Codigo, Nome, Descricao, Categoria, Severidade</code>
              </p>
            </div>
            <button
              onClick={() => { setShowImportArea(false); setImportStatus(null); }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <textarea
            rows={5}
            placeholder={`Codigo, Nome, Descricao, Categoria, Severidade
L005,Motor Superaquecendo,Temperatura acima de 90°C em 5 minutos de teste continuado,Elétrico,Crítico
P005,Defeito na gaxeta de silicone,Falta de estanqueidade ou anel ressecado,Segurança,Crítico
V006,Suporte da grade quebrado,Presilha traseira trincada após prensagem,Mecânico,Menor`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handleImportCSV}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Processar Linhas
            </button>

            <span className="text-[10px] text-slate-400">
              * Severidades aceitas: Crítico, Maior ou Menor.
            </span>
          </div>

          {importStatus && (
            <div className={`p-4 rounded-lg border text-xs space-y-1.5 ${
              importStatus.errors.length > 0 ? 'bg-rose-50/50 dark:bg-rose-955/20 border-rose-200 text-rose-800 dark:text-rose-300' : 'bg-emerald-50/50 dark:bg-emerald-955/20 border-emerald-200 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                {importStatus.errors.length > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Processamento: {importStatus.success} itens importados com sucesso.</span>
              </div>
              {importStatus.errors.length > 0 && (
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {importStatus.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid Layout of Categories */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
            Códigos de Conformidade e Falha ISO 9001 ({filteredDefects.length})
          </span>
          <span className="text-[11px] text-slate-400">Gatilhos do Checklist de Produção</span>
        </div>

        <div className="overflow-x-auto">
          {filteredDefects.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-5">Código</th>
                  <th className="py-3 px-5">Falha Identificada</th>
                  <th className="py-3 px-5">Gravidade / Criticidade</th>
                  <th className="py-3 px-5">Categoria Física</th>
                  <th className="py-3 px-5">Descrição Operacional</th>
                  <th className="py-3 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredDefects.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/55 transition-colors">
                    {/* Defect Code */}
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-red-500 dark:text-red-400">
                        {d.codigo}
                      </span>
                    </td>

                    {/* Defect Name */}
                    <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                      {d.nome}
                    </td>

                    {/* Severity Badge */}
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        d.severidade === 'Crítico' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50' :
                        d.severidade === 'Maior' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                      }`}>
                        {d.severidade === 'Crítico' && <span className="w-1.5 h-1.5 mr-1 bg-rose-500 rounded-full animate-ping" />}
                        {d.severidade}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-[11px] text-slate-600 dark:text-slate-400">
                        {d.categoria}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={d.descricao}>
                      {d.descricao || <span className="italic text-slate-300">Sem descrição detalhada</span>}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(d)}
                          className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Fazer alterações"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteDefect(d.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Remover falha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma falha operacional coincide com as buscas.
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal Overlay */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono tracking-wider">
                {editId ? 'Modificar Registro de Defeito' : 'Cadastrar Novo Código de Defeito'}
              </span>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Código ISO *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: V006"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold uppercase focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nome da Falha *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hélice fissurada"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category selector list */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Categoria Física</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="Mecânico">Mecânico</option>
                    <option value="Elétrico">Elétrico</option>
                    <option value="Estético">Estético</option>
                    <option value="Funcional">Funcional</option>
                    <option value="Segurança">Segurança / NR-12</option>
                    <option value="Geral">Outros</option>
                  </select>
                </div>

                {/* Severidade list */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Criticidade / Gravidade</label>
                  <select
                    value={severidade}
                    onChange={(e) => setSeveridade(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="Crítico">Crítico (Impede Uso)</option>
                    <option value="Maior">Maior (Prejudica Processo)</option>
                    <option value="Menor">Menor (Apenas Visual)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Descrição Operacional / Detalhes de Inspeção</label>
                <textarea
                  rows={3}
                  placeholder="Instruções para o auditor detectar esta não-conformidade..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Operations triggers */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-all shadow-md cursor-pointer"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
