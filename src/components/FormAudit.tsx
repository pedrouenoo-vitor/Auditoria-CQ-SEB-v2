/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Save, AlertTriangle, Plus, Minus, Camera, Upload, Trash2, ShieldCheck, RefreshCw, Layers, Calendar
} from 'lucide-react';
import { Product, Defect, Audit, User } from '../types';
import { databaseService } from '../services/db';

interface AuditFormProps {
  products: Product[];
  defects: Defect[];
  currentUser: User;
  onSaveAudit: (
    audit: Omit<Audit, 'id' | 'created_at'> & { id?: string },
    defects?: { defect_id: string; quantidade: number }[],
    images?: string[]
  ) => Promise<Audit>;
  initialAuditToEdit?: Audit | null;
  onCancelEdit?: () => void;
}

export default function AuditForm({
  products,
  defects,
  currentUser,
  onSaveAudit,
  initialAuditToEdit,
  onCancelEdit
}: AuditFormProps) {
  // Current calendar states
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(() => new Date().toTimeString().slice(0, 5));
  const [auditor, setAuditor] = useState(currentUser.nome);

  // Prefill auditor from currently signed profile
  useEffect(() => {
    if (!initialAuditToEdit) {
      setAuditor(currentUser.nome);
    }
  }, [currentUser, initialAuditToEdit]);

  // Selected product state
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const processLines = useMemo(() => {
    return databaseService.getProcessLines();
  }, []);

  // Basic Audit info
  const [lote, setLote] = useState('');
  const [linha, setLinha] = useState(() => {
    const lines = databaseService.getProcessLines();
    return lines[0] || 'Linha de Montagem A';
  });
  const [turno, setTurno] = useState<'Turno 1' | 'Turno 2' | 'Turno 3'>('Turno 1');

  // Quantities states
  const [quantidadeAuditada, setQuantidadeAuditada] = useState<number>(100);
  const [quantidadeAprovada, setQuantidadeAprovada] = useState<number>(98);
  const [quantidadeRejeitada, setQuantidadeRejeitada] = useState<number>(2);

  // Auto-calculated fields
  const fpy = useMemo(() => {
    if (quantidadeAuditada <= 0) return 100;
    return (quantidadeAprovada / quantidadeAuditada) * 100;
  }, [quantidadeAuditada, quantidadeAprovada]);

  // Checklist Items states (Pre-configured defaults)
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    'Isolação dielétrica / Teste de Fuga': true,
    'Funcionalidade e Rotações de Motor': true,
    'Ausência de trincas ou riscos visíveis': true,
    'Segurança mecânica e fixações de cabos': true
  });

  // Multiple defects counter linked to this audit
  // Map of defectId -> quantity
  const [selectedDefects, setSelectedDefects] = useState<{ [defectId: string]: number }>({});
  
  // Attached Base64 photos
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Loaded if editing
  useEffect(() => {
    if (initialAuditToEdit) {
      setData(initialAuditToEdit.data);
      setHora(initialAuditToEdit.hora);
      setAuditor(initialAuditToEdit.auditor);
      setSelectedProductId(initialAuditToEdit.produto_id);
      setLote(initialAuditToEdit.lote);
      setLinha(initialAuditToEdit.linha);
      setTurno(initialAuditToEdit.turno);
      setQuantidadeAuditada(initialAuditToEdit.quantidade_auditada);
      setQuantidadeAprovada(initialAuditToEdit.quantidade_aprovada);
      setQuantidadeRejeitada(initialAuditToEdit.quantidade_rejeitada);
      setChecklist(initialAuditToEdit.checklist);
      setNotes(initialAuditToEdit.notes || '');

      // Load linked products or other sub items? Let's check with standard loaders
      // For editing defects in audit, we pass them down if needed or load async
    } else {
      // Re-seed defaults
      setLote('');
      setQuantidadeAuditada(100);
      setQuantidadeAprovada(100);
      setQuantidadeRejeitada(0);
      setSelectedDefects({});
      setImages([]);
      setNotes('');
    }
  }, [initialAuditToEdit]);

  // Auto-sync reject quantity to sum of defects entered for consistency!
  useEffect(() => {
    const sumDefects = Object.keys(selectedDefects).reduce((acc, key) => acc + (selectedDefects[key] || 0), 0);
    // Only adjust reject count if higher than 0 and sumDefects has values
    if (sumDefects > 0) {
      setQuantidadeRejeitada(sumDefects);
      const diff = quantidadeAuditada - sumDefects;
      setQuantidadeAprovada(diff > 0 ? diff : 0);
    }
  }, [selectedDefects, quantidadeAuditada]);

  // Find the selected product object to render specs and matched defects
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Auto prefill selected product's model and code inside standard lists
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Recommend specific defects based on active product's category type
  const recommendedDefects = useMemo(() => {
    if (!activeProduct) return [];
    
    return defects.filter(d => {
      // Match categories / types based on codes
      if (activeProduct.tipo === 'Ventilador') return d.codigo.startsWith('V');
      if (activeProduct.tipo === 'Liquidificador') return d.codigo.startsWith('L');
      if (activeProduct.tipo === 'Panela de Pressão') return d.codigo.startsWith('P');
      return true;
    });
  }, [activeProduct, defects]);

  const handleDefectCountChange = (defectId: string, delta: number) => {
    setSelectedDefects(curr => {
      const copy = { ...curr };
      const nextVal = (copy[defectId] || 0) + delta;
      if (nextVal <= 0) {
        delete copy[defectId];
      } else {
        copy[defectId] = nextVal;
      }
      return copy;
    });
  };

  // Turn files to Base64 in runtime
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(curr => [...curr, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImages(curr => curr.filter((_, i) => i !== index));
  };

  // Submit complete audit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !lote || !linha) return;

    const matchedProd = products.find(p => p.id === selectedProductId);
    if (!matchedProd) return;

    // Convert selectedDefects to list format expected by db
    const defectsList = Object.keys(selectedDefects).map(defectId => ({
      defect_id: defectId,
      quantidade: selectedDefects[defectId]
    }));

    const auditPayload: Omit<Audit, 'id' | 'created_at'> & { id?: string } = {
      data,
      hora,
      auditor,
      produto_tipo: matchedProd.tipo,
      produto_id: selectedProductId,
      modelo: matchedProd.modelo,
      lote,
      linha,
      turno,
      quantidade_auditada: quantidadeAuditada,
      quantidade_aprovada: quantidadeAprovada,
      quantidade_rejeitada: quantidadeRejeitada,
      checklist,
      notes,
      status: quantidadeRejeitada > 0 ? 'Rejeitado' : 'Aprovado'
    };

    if (initialAuditToEdit?.id) {
      auditPayload.id = initialAuditToEdit.id;
    }

    await onSaveAudit(auditPayload, defectsList, images);
    
    // Clear and reset form after save
    if (!initialAuditToEdit) {
      setLote('');
      setSelectedDefects({});
      setImages([]);
      setNotes('');
    }
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1: Standard inspection metadata info */}
        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-left duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center space-x-2 border-b border-slate-150 dark:border-slate-850 pb-3 mb-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase font-mono tracking-wider">
                {initialAuditToEdit ? 'Revisar Laudo Operacional' : 'Nova Inspeção de Qualidade de Lote'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product selector list link */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Produto em Produção *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Selecione o produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.modelo} / Tipo: {p.tipo}</option>
                  ))}
                </select>
              </div>

              {/* Lote number */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Lote Operacional *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: L-VT2605"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white uppercase font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Production line list */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Linha de Processo *</label>
                <select
                  value={linha}
                  onChange={(e) => setLinha(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold cursor-pointer"
                >
                  {processLines.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                  {processLines.length === 0 && (
                    <option value="">Nenhuma linha cadastrada</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              {/* Date selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Data do Laudo *</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Hora selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Hora do Laudo *</label>
                <input
                  type="time"
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-bold tracking-widest focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Work shift selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Turno Operacional *</label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white font-semibold cursor-pointer"
                >
                  <option value="Turno 1">Turno 1 (Manhã)</option>
                  <option value="Turno 2">Turno 2 (Tarde)</option>
                  <option value="Turno 3">Turno 3 (Noite)</option>
                </select>
              </div>

              {/* Inspector prefilled */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Auditor / Operador</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={auditor}
                  className="w-full text-xs p-2 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Spec details card display based on active item */}
            {activeProduct && (
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-lg border border-emerald-500/20 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 font-mono">Especificações Técnicas de Tolerância</span>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Para o modelo <b className="text-slate-700 dark:text-slate-300 font-sans">{activeProduct.modelo}</b>: 
                  {activeProduct.tipo === 'Ventilador' && ` Potência nominal de ${activeProduct.potencia || '150W'} com hélice rotativa de cor ${activeProduct.cor || 'Branco'}. Inspeção foca em ruídos do mancal dianteiro e aperto de parafusos versão ${activeProduct.versao || 'V1.2'}.`}
                  {activeProduct.tipo === 'Liquidificador' && ` Capacidade aferida de ${activeProduct.capacidade || '2.0L'} com copo resistente e potência de motor ${activeProduct.potencia || '800W'}. Garantir estanqueidade do anel na rotação.`}
                  {activeProduct.tipo === 'Panela de Pressão' && ` Capacidade de pressão de ${activeProduct.capacidade || '5L'}, corpo em ${activeProduct.material || 'Alumínio'}. Foco integral de segurança nas válvulas primária e secundária nível ${activeProduct.versao || 'V2.1'}.`}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Quantities controls */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono tracking-wider">
              Amostragem e Registro de Defeitos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Total Audited */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Tamanho da Amostra (N)</label>
                <div className="flex items-center justify-center space-x-3 mt-1.5">
                  <button type="button" onClick={() => setQuantidadeAuditada(Math.max(1, quantidadeAuditada - 10))} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantidadeAuditada}
                    onChange={(e) => setQuantidadeAuditada(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-16 text-center text-md font-bold font-mono focus:outline-none bg-transparent"
                  />
                  <button type="button" onClick={() => setQuantidadeAuditada(quantidadeAuditada + 10)} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rejeitadas Count (Auto Adjusted normally) */}
              <div className="space-y-1 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 text-center">
                <label className="text-[10px] font-bold text-rose-500 uppercase font-mono">Qtd Rejeitada / Com Defeito</label>
                <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
                  {quantidadeRejeitada}
                </div>
                <div className="text-[10px] text-slate-400">Calculado via soma de falhas</div>
              </div>

              {/* FPY Yield Display */}
              <div className="space-y-1 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-center">
                <label className="text-[10px] font-bold text-emerald-500 uppercase font-mono">Rendimento FPY Local</label>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                  {fpy.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400">Total de {quantidadeAprovada} aprovados</div>
              </div>
            </div>

            {/* Checklist configurável */}
            <div className="border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 text-[10px] font-bold font-mono text-slate-500 uppercase leading-normal">
                Análise Dimensional & Checklist Físico Obrigatório
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-850 p-3">
                {Object.keys(checklist).map(key => (
                  <div key={key} className="flex items-center justify-between py-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{key}</span>
                    <button
                      type="button"
                      onClick={() => setChecklist(curr => ({ ...curr, [key]: !curr[key] }))}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        checklist[key]
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {checklist[key] ? 'CONFORME' : 'NÃO-CONFORME'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Counter of defects based on recommended matching item */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-550 flex items-center font-mono">
                <Layers className="mr-1.5 w-4 h-4 text-emerald-500" /> Catalogar Falhas por Severidade
              </h4>
              
              {recommendedDefects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recommendedDefects.map((def) => {
                    const count = selectedDefects[def.id] || 0;
                    return (
                      <div key={def.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850">
                        <div className="text-left leading-normal">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{def.nome}</p>
                          <p className="text-[9px] font-mono text-slate-400">
                            Código: <span className="text-rose-500 font-bold">{def.codigo}</span> | Gravidade: <span className="font-bold">{def.severidade}</span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDefectCountChange(def.id, -1)}
                            className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-500 hover:text-slate-750 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-6 text-center font-mono font-bold text-xs ${count > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDefectCountChange(def.id, 1)}
                            className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-500 hover:text-slate-750 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Selecione um tipo de produto acima para exibir os defeitos recomendados no checklist.
                </p>
              )}
            </div>

            {/* Inserir observações */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Observações de Laudo / Relatório de Evidências</label>
              <textarea
                rows={3}
                placeholder="Insira detalhes adicionais sobre o lote, condições de máquina, desvio crítico ou rastreabilidade de carcaças..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:bg-white"
              />
            </div>

          </div>
        </div>

        {/* Step 3: Photos checklist upload, summary, save panel */}
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          
          {/* Anexar Fotos */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono tracking-wider">
              Anexar Evidências Fotográficas
            </h3>
            
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-350 dark:border-slate-755 rounded-xl bg-slate-50 dark:bg-slate-950/60 transition-all text-center">
              <div className="space-y-2">
                <div className="flex justify-center text-slate-400">
                  <Camera className="w-8 h-8 text-emerald-500" />
                </div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <span>Adicionar imagens dos defeitos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 leading-none">Formatos aceitos: JPG, PNG, GIF</p>
              </div>
            </div>

            {/* Thumbnail previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 h-20 bg-slate-100">
                    <img src={img} alt="Defeito do Lote" className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Process Action Card */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
            {/* Ambient subtle back lights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-2xl" />

            <h3 className="text-xs font-bold text-emerald-400 uppercase font-mono tracking-wider flex items-center">
              <ShieldCheck className="mr-1.5 w-4.5 h-4.5" /> Enviar Laudo para Registro
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Produto Selecionado:</span>
                <span className="font-bold text-white">{activeProduct?.tipo || 'Nenhum'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tamanho Amostral (N):</span>
                <span className="font-bold text-white font-mono">{quantidadeAuditada} unidades</span>
              </div>
              <div className="flex justify-between">
                <span>Total de Rejeições:</span>
                <span className={`font-bold font-mono ${quantidadeRejeitada > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                  {quantidadeRejeitada} peças
                </span>
              </div>
              <div className="flex justify-between">
                <span>Contatos de Linha:</span>
                <span className="font-mono">{linha.split(' ').pop()} / {turno}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-all text-white shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{initialAuditToEdit ? 'Gravar Alterações' : 'Finalizar e Registrar Laudo'}</span>
              </button>

              {initialAuditToEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-705 text-slate-400 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </form>
  );
}
