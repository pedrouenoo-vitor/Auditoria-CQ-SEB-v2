/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, ShieldCheck, Copy, Check, Save, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { databaseService } from '../services/db';

interface SupabaseSyncOverlayProps {
  onClose: () => void;
}

export default function SupabaseSyncOverlay({ onClose }: SupabaseSyncOverlayProps) {
  const isSupabase = databaseService.isUsingSupabase();
  const currentConfig = databaseService.getSupabaseConnectionDetails();

  const [url, setUrl] = useState(currentConfig?.url || '');
  const [key, setKey] = useState(currentConfig?.key || '');
  const [copied, setCopied] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<boolean | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) return;

    databaseService.saveSupabaseConfig(url, key);
    setSaveStatus(true);
    setTimeout(() => {
      setSaveStatus(null);
    }, 3000);
  };

  const handleClear = () => {
    databaseService.clearSupabaseConfig();
    setUrl('');
    setKey('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlSchema = `
-- =========================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS CONFORME MÓDULO QUALICONTROL
-- Execute no SQL Editor do seu projeto Supabase (PostgreSQL)
-- =========================================================

-- 1. TABELA DE PRODUTOS (products)
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('Ventilador', 'Liquidificador', 'Panela de Pressão')),
  modelo text NOT NULL,
  codigo text NOT NULL UNIQUE,
  potencia text,
  cor text,
  versao text,
  capacidade text,
  material text
);

-- 2. TABELA DE DEFEITOS (defects)
CREATE TABLE IF NOT EXISTS defects (
  id text PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL,
  severidade text NOT NULL CHECK (severidade IN ('Crítico', 'Maior', 'Menor'))
);

-- 3. TABELA DE AUDITORIAS (audits)
CREATE TABLE IF NOT EXISTS audits (
  id text PRIMARY KEY,
  data text NOT NULL,
  hora text NOT NULL,
  auditor text NOT NULL,
  produto_tipo text NOT NULL,
  produto_id text REFERENCES products(id) ON DELETE SET NULL,
  modelo text NOT NULL,
  lote text NOT NULL,
  linha text NOT NULL,
  turno text NOT NULL,
  quantidade_auditada integer NOT NULL,
  quantidade_aprovada integer NOT NULL,
  quantidade_rejeitada integer NOT NULL,
  checklist jsonb DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL CHECK (status IN ('Aprovado', 'Rejeitado')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE VÍNCULO DE DEFEITOS (audit_defects)
CREATE TABLE IF NOT EXISTS audit_defects (
  id text PRIMARY KEY,
  audit_id text REFERENCES audits(id) ON DELETE CASCADE,
  defect_id text REFERENCES defects(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1
);

-- 5. TABELA DE FOTOS E EVIDÊNCIAS (audit_photos)
CREATE TABLE IF NOT EXISTS audit_photos (
  id text PRIMARY KEY,
  audit_id text REFERENCES audits(id) ON DELETE CASCADE,
  imagem_url text NOT NULL
);

-- 6. TABELA DE LOGS DO SISTEMA
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  usuario text NOT NULL,
  perfil text NOT NULL,
  acao text NOT NULL,
  detalhes text NOT NULL
);
`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-xs">
        
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <Database className="w-4 h-4 mr-1.5 text-emerald-500" />
            VINCULAR INTEGRAÇÃO SUPABASE / POSTGRES
          </span>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto leading-relaxed">
          
          {/* Instructions header info */}
          <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
              <span>Modelo Seguro Híbrido Ativo</span>
            </div>
            <p className="text-slate-600 dark:text-slate-350">
              O QualiControl funciona com persistência local instantânea out-of-the-box (LocalStorage) para testes imediatos. Ao inserir os dados do seu projeto Supabase, o sistema ativa a sincronização nativa em tempo real com as tabelas relacionais do seu banco de dados PostgreSQL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Form connection parameters fields */}
            <form onSubmit={handleSave} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">Credenciais do Projeto</h4>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">SUPABASE API URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://xxxxx.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-830 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-905 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">SUPABASE ANON / PUBLIC KEY</label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-830 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-905 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar & Reconectar</span>
                </button>

                {isSupabase && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/10 cursor-pointer"
                    title="Remover conexão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {saveStatus && (
                <p className="text-[11px] text-emerald-500 text-center font-semibold">Configuração salva! Atualizando a página...</p>
              )}
            </form>

            {/* Config connection status logs */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">Status da Conexão</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Persistência Online:</span>
                  <span className={`font-mono font-bold ${isSupabase ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isSupabase ? 'CONECTADO' : 'INATIVO'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Database Engine:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{isSupabase ? 'PostgreSQL' : 'LocalStorage'}</span>
                </div>
                {isSupabase && (
                  <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded text-[11px] text-slate-500">
                    <p className="truncate"><b>Endpoint:</b> {url}</p>
                    <p className="mt-0.5">Sincronização em tempo real de auditorias com Base64 habilitados.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Copyable SQL Schema block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold font-mono">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Script SQL das Tabelas para o Supabase</span>
              </div>
              <button
                onClick={() => handleCopy(sqlSchema, 'sql')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-705 rounded text-[10px] font-bold cursor-pointer"
              >
                {copied === 'sql' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'sql' ? 'Copiado!' : 'Copiar Script SQL'}</span>
              </button>
            </div>
            
            <div className="relative border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-40 bg-slate-950">
              <pre className="p-3 text-[10px] text-emerald-400 font-mono overflow-auto h-full scroll-smooth">
                {sqlSchema}
              </pre>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
