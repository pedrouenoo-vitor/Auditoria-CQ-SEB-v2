/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileCode, Plus, Search, Trash2, Edit2, Download, Upload, AlertCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Product, ProductType } from '../types';

interface ProductsManagerProps {
  products: Product[];
  onSaveProduct: (product: Omit<Product, 'id'> & { id?: string }) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onImportCSV: (data: Omit<Product, 'id'>[]) => Promise<{ success: number; errors: string[] }>;
}

export default function ProductsManager({
  products,
  onSaveProduct,
  onDeleteProduct,
  onImportCSV
}: ProductsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todos');
  
  // Form modal state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form field states
  const [tipo, setTipo] = useState<ProductType>('Ventilador');
  const [modelo, setModelo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [potencia, setPotencia] = useState('');
  const [cor, setCor] = useState('');
  const [versao, setVersao] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [material, setMaterial] = useState('');
  const [localBurnIn, setLocalBurnIn] = useState('');

  // CSV Import States
  const [csvText, setCsvText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: number; errors: string[] } | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = selectedTypeFilter === 'Todos' || p.tipo === selectedTypeFilter;
      return matchSearch && matchType;
    });
  }, [products, searchTerm, selectedTypeFilter]);

  // Open modal for new
  const handleOpenNew = () => {
    setEditId(null);
    setTipo('Ventilador');
    setModelo('');
    setCodigo('');
    setPotencia('');
    setCor('');
    setVersao('');
    setCapacidade('');
    setMaterial('');
    setLocalBurnIn('');
    setIsOpenModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (p: Product) => {
    setEditId(p.id);
    setTipo(p.tipo);
    setModelo(p.modelo);
    setCodigo(p.codigo);
    setPotencia(p.potencia || '');
    setCor(p.cor || '');
    setVersao(p.versao || '');
    setCapacidade(p.capacidade || '');
    setMaterial(p.material || '');
    setLocalBurnIn(p.localBurnIn || '');
    setIsOpenModal(true);
  };

  // Submit Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelo || !codigo) return;

    const payload: Omit<Product, 'id'> & { id?: string } = {
      tipo,
      modelo,
      codigo
    };

    if (editId) payload.id = editId;
    if (localBurnIn) payload.localBurnIn = localBurnIn;

    if (tipo === 'Ventilador') {
      if (potencia) payload.potencia = potencia;
      if (cor) payload.cor = cor;
      if (versao) payload.versao = versao;
    } else if (tipo === 'Liquidificador') {
      if (potencia) payload.potencia = potencia;
      if (capacidade) payload.capacidade = capacidade;
      if (cor) payload.cor = cor;
    } else if (tipo === 'Panela de Pressão') {
      if (capacidade) payload.capacidade = capacidade;
      if (material) payload.material = material;
      if (versao) payload.versao = versao;
    }

    await onSaveProduct(payload);
    setIsOpenModal(false);
  };

  // Export Products to CSV File
  const handleExportCSV = () => {
    const headers = ['Tipo', 'Modelo', 'Codigo', 'Potencia', 'Cor', 'Capacidade', 'Material', 'Versao'];
    const rows = products.map(p => [
      p.tipo,
      p.modelo,
      p.codigo,
      p.potencia || '',
      p.cor || '',
      p.capacidade || '',
      p.material || '',
      p.versao || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'qualicontrol_produtos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Products from CSV Handler
  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    
    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const parsedData: Omit<Product, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle split by comma respecting quoted strings
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!matches) continue;
      
      const values = matches.map(v => v.replace(/^["']|["']$/g, '').replace(/""/g, '"'));
      
      const rowObj: any = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || '';
        const key = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        rowObj[key] = val;
      });

      // Prepare final type mapping from matching headings
      const tipoMapeado = rowObj.tipo === 'Ventilador' || rowObj.tipo === 'Liquidificador' || rowObj.tipo === 'Panela de Pressao' || rowObj.tipo === 'Panela de Pressão'
        ? (rowObj.tipo === 'Panela de Pressao' ? 'Panela de Pressão' : rowObj.tipo)
        : 'Ventilador';

      parsedData.push({
        tipo: tipoMapeado as ProductType,
        modelo: rowObj.modelo || '',
        codigo: rowObj.codigo || '',
        potencia: rowObj.potencia || undefined,
        cor: rowObj.cor || undefined,
        versao: rowObj.versao || undefined,
        capacidade: rowObj.capacidade || undefined,
        material: rowObj.material || undefined
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
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm fade-in">
        <div className="flex flex-1 items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por modelo ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtering buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {['Todos', 'Ventilador', 'Liquidificador', 'Panela de Pressão'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-3 py-1 rounded text-xs transition-all pointer-events-auto cursor-pointer ${selectedTypeFilter === type ? 'bg-white dark:bg-slate-950 shadow-xs font-semibold text-emerald-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                {type === 'Todos' ? 'Todos' : type + 's'}
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
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* CSV Import Area */}
      {showImportArea && (
        <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-xl space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono">
                Importação em Massa via CSV
              </h4>
              <p className="text-[11px] text-slate-500">
                Cole linhas formatadas. Cabeçalhos suportados: <code className="font-mono bg-slate-200 dark:bg-slate-830 px-1 rounded">Tipo, Modelo, Codigo, Potencia, Cor, Capacidade, Material, Versao</code>
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
            placeholder={`Tipo, Modelo, Codigo, Potencia, Cor, Capacidade, Material, Versao
Ventilador,Ventilador Coluna V50,VENT-COL50,180W,Azul,,,V1.0
Liquidificador,Liquidificador Premium,LIQ-PREM,1000W,Preto,2.2L,,
Panela de Pressão,Panela Safe 9L,PAN-SAFE9,,,9.0L,Inox Polido,V2.3`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handleImportCSV}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Enviar e Validar Lotes
            </button>

            <span className="text-[10px] text-slate-400">
              * O sistema valida conflitos de duplicação de códigos antes de gravar.
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

      {/* Products Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
            Linha de Produtos Cadastrados ({filteredProducts.length})
          </span>
          <span className="text-[11px] text-slate-400">Equipamentos e Utensílios Ativos</span>
        </div>

        <div className="overflow-x-auto">
          {filteredProducts.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-5">Tipo</th>
                  <th className="py-3 px-5">Modelo / Nome Comercial</th>
                  <th className="py-3 px-5">Prefixo/Código</th>
                  <th className="py-3 px-5">Especificações Industriais</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/55 transition-colors">
                    {/* Component Type tag */}
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.tipo === 'Ventilador' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400' :
                        p.tipo === 'Liquidificador' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {p.tipo}
                      </span>
                    </td>
                    
                    {/* Modelo name */}
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">
                      {p.modelo}
                    </td>

                    {/* Industrial Code */}
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-600 dark:text-slate-400">
                      {p.codigo}
                    </td>

                    {/* Advanced specs based on template */}
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap gap-1">
                        {p.tipo === 'Ventilador' && (
                          <>
                            {p.potencia && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Potência: {p.potencia}</span>}
                            {p.cor && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Cor: {p.cor}</span>}
                            {p.versao && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Versão: {p.versao}</span>}
                          </>
                        )}
                        {p.tipo === 'Liquidificador' && (
                          <>
                            {p.potencia && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Potência: {p.potencia}</span>}
                            {p.capacidade && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Capacidade: {p.capacidade}</span>}
                            {p.cor && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Cor: {p.cor}</span>}
                          </>
                        )}
                        {p.tipo === 'Panela de Pressão' && (
                          <>
                            {p.capacidade && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Capacidade: {p.capacidade}</span>}
                            {p.material && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Material: {p.material}</span>}
                            {p.versao && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">Versão: {p.versao}</span>}
                          </>
                        )}
                        {p.localBurnIn && (
                          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded font-semibold font-mono text-[10px]">
                            Burn-in: {p.localBurnIn}
                          </span>
                        )}
                        {!p.potencia && !p.cor && !p.versao && !p.capacidade && !p.material && !p.localBurnIn && (
                          <span className="text-slate-400 italic">Nenhum adicional informado</span>
                        )}
                      </div>
                    </td>

                    {/* Operations row actions */}
                    <td className="py-3.5 px-5 text-right font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Editar specs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Remover produto"
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
              Nenhum produto cadastrado coincide com os filtros ativos.
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
                {editId ? 'Editar Detalhes do Produto' : 'Cadastrar Novo Produto'}
              </span>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Product Category Type tab helper */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tipo do Produto</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Ventilador', 'Liquidificador', 'Panela de Pressão'] as ProductType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={!!editId} // lock type for editing
                      onClick={() => setTipo(type)}
                      className={`py-2 px-1 border rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap text-center ${
                        tipo === type
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      } ${editId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard inputs block */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Modelo Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Liquidificador Turbo Blend"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Código de Linha / MPN *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LIQ-TB500"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono w-full block">Local Burn-in</label>
                  <input
                    type="text"
                    placeholder="Ex: Bancada de Teste 04 / Estufa de Ensaio 3"
                    value={localBurnIn}
                    onChange={(e) => setLocalBurnIn(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Dynamic specs based on product type */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-lg space-y-3">
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase">Especificações Técnicas de Processo</p>

                {tipo === 'Ventilador' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Potência</label>
                      <input type="text" placeholder="Ex: 150W" value={potencia} onChange={(e) => setPotencia(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Cor</label>
                      <input type="text" placeholder="Preto" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Versão</label>
                      <input type="text" placeholder="V1.2" value={versao} onChange={(e) => setVersao(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                  </div>
                )}

                {tipo === 'Liquidificador' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Potência</label>
                      <input type="text" placeholder="Ex: 800W" value={potencia} onChange={(e) => setPotencia(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Capacidade</label>
                      <input type="text" placeholder="Ex: 2.0L" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Cor</label>
                      <input type="text" placeholder="Vermelho" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded" />
                    </div>
                  </div>
                )}

                {tipo === 'Panela de Pressão' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Capacidade</label>
                      <input type="text" placeholder="Ex: 5.0L" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                    <div className="space-y-1 fill-inherit">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Material</label>
                      <input type="text" placeholder="Alumínio" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Versão</label>
                      <input type="text" placeholder="V2.1" value={versao} onChange={(e) => setVersao(e.target.value)} className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono" />
                    </div>
                  </div>
                )}
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-md cursor-pointer"
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
