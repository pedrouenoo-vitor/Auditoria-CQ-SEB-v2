/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Defect, Audit, AuditDefect, AuditPhoto, User } from '../types';

// System log structure
export interface ChangeLog {
  id: string;
  timestamp: string;
  usuario: string;
  perfil: string;
  acao: string; // Criou, Editou, Excluiu, Importou, Exportou
  detalhes: string;
}

// Global Storage Keys
const PRODUCTS_KEY = 'qualicontrol_products';
const DEFECTS_KEY = 'qualicontrol_defects';
const AUDITS_KEY = 'qualicontrol_audits';
const AUDIT_DEFECTS_KEY = 'qualicontrol_audit_defects';
const AUDIT_PHOTOS_KEY = 'qualicontrol_audit_photos';
const CHangelog_KEY = 'qualicontrol_changelog';
const CURRENT_USER_KEY = 'qualicontrol_current_user';
const SUPABASE_CONFIG_KEY = 'qualicontrol_supabase_config';
const USERS_KEY = 'qualicontrol_users';
const PROCESS_LINES_KEY = 'qualicontrol_process_lines';

// Loaded from environment first, or fallbacks from browser localStorage config
const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' };
  }
  
  try {
    const localConfigJson = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (localConfigJson) {
      const config = JSON.parse(localConfigJson);
      if (config.url && config.key) {
        return { url: config.url, key: config.key, source: 'local' };
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração local do Supabase', e);
  }
  
  return null;
};

// Initialize Supabase Client
let supabase: SupabaseClient | null = null;
const config = getSupabaseConfig();
if (config) {
  try {
    supabase = createClient(config.url, config.key);
    console.log(`Supabase conectado com sucesso via ${config.source}!`);
  } catch (e) {
    console.error('Falha na inicialização do cliente Supabase', e);
  }
}

// SEED DATA FOR QUALITY MODULES
const initialProducts: Product[] = [
  { id: 'p1', tipo: 'Ventilador', modelo: 'Ventilador V-45 Max', codigo: 'VENT-45', potencia: '150W', cor: 'Branco', versao: 'V1.2' },
  { id: 'p2', tipo: 'Ventilador', modelo: 'Ventilador Turbo Pro 50', codigo: 'VENT-T50', potencia: '200W', cor: 'Preto', versao: 'V2.0' },
  { id: 'p3', tipo: 'Liquidificador', modelo: 'Liquidificador SuperBlend L-12', codigo: 'LIQ-SB12', potencia: '800W', capacidade: '2.0L', cor: 'Vermelho' },
  { id: 'p4', tipo: 'Liquidificador', modelo: 'Liquidificador Chef Pro', codigo: 'LIQ-CP1000', potencia: '1200W', capacidade: '2.5L', cor: 'Cinza Inox' },
  { id: 'p5', tipo: 'Panela de Pressão', modelo: 'Panela de Pressão SafeCook 5L', codigo: 'PAN-SC5', capacidade: '5.0L', material: 'Alumínio Polido', versao: 'V2.1' },
  { id: 'p6', tipo: 'Panela de Pressão', modelo: 'Panela de Pressão Premium Teflon 7L', codigo: 'PAN-PT7', capacidade: '7.0L', material: 'Teflon Antiaderente', versao: 'V3.0' }
];

const initialDefects: Defect[] = [
  // Ventiladores (V001 - V005)
  { id: 'd1', codigo: 'V001', nome: 'Hélice desbalanceada', descricao: 'Hélice com desvio de balanceamento dinâmico na rotação', categoria: 'Mecânico', severidade: 'Crítico' },
  { id: 'd2', codigo: 'V002', nome: 'Vibração excessiva', descricao: 'Vibração medida no bocal da grade superior acima de 4.2mm/s', categoria: 'Mecânico', severidade: 'Maior' },
  { id: 'd3', codigo: 'V003', nome: 'Ruído anormal', descricao: 'Nível de decibéis do motor acima de 65 dB em velocidade máxima', categoria: 'Funcional', severidade: 'Menor' },
  { id: 'd4', codigo: 'V004', nome: 'Grade desalinhada ou torta', descricao: 'Aparência visual e encaixe das travas das grades plásticas', categoria: 'Estético', severidade: 'Menor' },
  { id: 'd5', codigo: 'V005', nome: 'Falha elétrica / Bobina', descricao: 'Teste dielétrico (hipot) falhou ou bobina com fuga de corrente', categoria: 'Elétrico', severidade: 'Crítico' },
  
  // Liquidificadores (L001 - L004)
  { id: 'd6', codigo: 'L001', nome: 'Vazamento no anel ou copo', descricao: 'Fuga de líquido pelo mancal inferior do copo em rotação', categoria: 'Funcional', severidade: 'Crítico' },
  { id: 'd7', codigo: 'L002', nome: 'Copo trincado ou micro-fissura', descricao: 'Presença de trincas visuais ou fadiga no acrílico do copo', categoria: 'Estético', severidade: 'Maior' },
  { id: 'd8', codigo: 'L003', nome: 'Motor inoperante', descricao: 'Motor não inicializa com acoplamento correto sob carga nominal', categoria: 'Elétrico', severidade: 'Crítico' },
  { id: 'd9', codigo: 'L004', nome: 'Tampa danificada ou sem vedação', descricao: 'Peça de borracha da sobretampa solta ou copo expulsa a tampa', categoria: 'Estético', severidade: 'Menor' },
  
  // Panelas de Pressão (P001 - P004)
  { id: 'd10', codigo: 'P001', nome: 'Vazamento na válvula reguladora', descricao: 'Não retém a pressão estipulada de trabalho de 80kPa na válvula de controle', categoria: 'Segurança', severidade: 'Crítico' },
  { id: 'd11', codigo: 'P002', nome: 'Tampa desalinhada', descricao: 'Alça e cabo com desvio no alinhamento central impedindo travamento suave', categoria: 'Mecânico', severidade: 'Maior' },
  { id: 'd12', codigo: 'P003', nome: 'Defeito no pino de segurança / trava', descricao: 'Trava do cabo inoperante ou pino indicador de pressão com travamento', categoria: 'Segurança', severidade: 'Crítico' },
  { id: 'd13', codigo: 'P004', nome: 'Arranhões ou manchas de polimento', descricao: 'Defeito estético na superfície metálica externa ou do cabo', categoria: 'Estético', severidade: 'Menor' }
];

// Seed some audits for realistic historical dashboard indicators spanning the last month
const initialAudits: Audit[] = [
  {
    id: 'a1',
    data: '2026-05-10',
    hora: '09:30',
    auditor: 'Carlos Eduardo',
    produto_tipo: 'Ventilador',
    produto_id: 'p1',
    modelo: 'Ventilador V-45 Max',
    lote: 'L-VT2601',
    linha: 'Linha de Montagem A',
    turno: 'Turno 1',
    quantidade_auditada: 200,
    quantidade_aprovada: 195,
    quantidade_rejeitada: 5,
    checklist: { 'Geral': true, 'Velocidade': true, 'Isolação': true },
    created_at: '2026-05-10T09:30:00Z',
    status: 'Rejeitado', // if there's any defect or reject qty > 0, we track rejects
    notes: 'Encontrada hélice desalinhada em 3 unidades e grade torta em 2.'
  },
  {
    id: 'a2',
    data: '2026-05-14',
    hora: '14:15',
    auditor: 'Juliana Torres',
    produto_tipo: 'Liquidificador',
    produto_id: 'p3',
    modelo: 'Liquidificador SuperBlend L-12',
    lote: 'L-LQ2605',
    linha: 'Linha de Montagem B',
    turno: 'Turno 2',
    quantidade_auditada: 150,
    quantidade_aprovada: 148,
    quantidade_rejeitada: 2,
    checklist: { 'Vazamento': true, 'Velocidade': true },
    created_at: '2026-05-14T14:15:00Z',
    status: 'Rejeitado',
    notes: '2 cups trincados na inspeção visual após a montagem do mancal.'
  },
  {
    id: 'a3',
    data: '2026-05-18',
    hora: '11:00',
    auditor: 'Carlos Eduardo',
    produto_tipo: 'Panela de Pressão',
    produto_id: 'p5',
    modelo: 'Panela de Pressão SafeCook 5L',
    lote: 'L-PL2612',
    linha: 'Linha de Prensas C',
    turno: 'Turno 1',
    quantidade_auditada: 80,
    quantidade_aprovada: 79,
    quantidade_rejeitada: 1,
    checklist: { 'Pressão': true, 'Válvula': true, 'Alça': true },
    created_at: '2026-05-18T11:00:00Z',
    status: 'Rejeitado',
    notes: 'Presença de vazamento na válvula reguladora de pressão de 1 unidade.'
  },
  {
    id: 'a4',
    data: '2026-05-22',
    hora: '08:45',
    auditor: 'Roberto Silva',
    produto_tipo: 'Ventilador',
    produto_id: 'p2',
    modelo: 'Ventilador Turbo Pro 50',
    lote: 'L-VT2605',
    linha: 'Linha de Montagem A',
    turno: 'Turno 1',
    quantidade_auditada: 250,
    quantidade_aprovada: 250,
    quantidade_rejeitada: 0,
    checklist: { 'Geral': true, 'Velocidade': true, 'Isolação': true },
    created_at: '2026-05-22T08:45:00Z',
    status: 'Aprovado',
    notes: 'Lote aprovado com FPY de 100%. Nenhuma não-conformidade relatada.'
  },
  {
    id: 'a5',
    data: '2026-05-25',
    hora: '16:00',
    auditor: 'Juliana Torres',
    produto_tipo: 'Liquidificador',
    produto_id: 'p4',
    modelo: 'Liquidificador Chef Pro',
    lote: 'L-LQ2611',
    linha: 'Linha de Montagem B',
    turno: 'Turno 3',
    quantidade_auditada: 120,
    quantidade_aprovada: 119,
    quantidade_rejeitada: 1,
    checklist: { 'Vazamento': true, 'Encaixe': true },
    created_at: '2026-05-25T16:00:00Z',
    status: 'Rejeitado',
    notes: '1 motor inoperante na linha de testes elétricos dinâmicos.'
  },
  {
    id: 'a6',
    data: '2026-05-28',
    hora: '22:30',
    auditor: 'Roberto Silva',
    produto_tipo: 'Panela de Pressão',
    produto_id: 'p6',
    modelo: 'Panela de Pressão Premium Teflon 7L',
    lote: 'L-PL2618',
    linha: 'Linha de Prensas C',
    turno: 'Turno 3',
    quantidade_auditada: 100,
    quantidade_aprovada: 98,
    quantidade_rejeitada: 2,
    checklist: { 'Segurança': true, 'Acabamento': true },
    created_at: '2026-05-28T22:30:00Z',
    status: 'Rejeitado',
    notes: '2 panelas rejeitadas por arranhaduras profundas no revestimento interno.'
  },
  {
    id: 'a7',
    data: '2026-06-02',
    hora: '10:00',
    auditor: 'Carlos Eduardo',
    produto_tipo: 'Ventilador',
    produto_id: 'p1',
    modelo: 'Ventilador V-45 Max',
    lote: 'L-VT2611',
    linha: 'Linha de Montagem A',
    turno: 'Turno 1',
    quantidade_auditada: 180,
    quantidade_aprovada: 177,
    quantidade_rejeitada: 3,
    checklist: { 'Geral': true, 'Arqueamento': true },
    created_at: '2026-06-02T10:00:00Z',
    status: 'Rejeitado',
    notes: '3 motores com ruídos anormais no rolamento e folga axial.'
  },
  {
    id: 'a8',
    data: '2026-06-04',
    hora: '15:20',
    auditor: 'Juliana Torres',
    produto_tipo: 'Panela de Pressão',
    produto_id: 'p5',
    modelo: 'Panela de Pressão SafeCook 5L',
    lote: 'L-PL2622',
    linha: 'Linha de Prensas C',
    turno: 'Turno 2',
    quantidade_auditada: 90,
    quantidade_aprovada: 88,
    quantidade_rejeitada: 2,
    checklist: { 'Pressão': true, 'Válvula': true },
    created_at: '2026-06-04T15:20:00Z',
    status: 'Rejeitado',
    notes: '2 panelas rejeitadas por problemas na trava do cabo que impediam fixação total.'
  }
];

const initialAuditDefects: AuditDefect[] = [
  // Link to a1 (Carlos - Ventilador p1): 3 hélice desalinhada (d1) and 2 grade desalinhada (d4)
  { id: 'ad1', audit_id: 'a1', defect_id: 'd1', quantidade: 3 },
  { id: 'ad2', audit_id: 'a1', defect_id: 'd4', quantidade: 2 },
  // Link to a2 (Juliana - Liquidificador p3): 2 copo trincado (d7)
  { id: 'ad3', audit_id: 'a2', defect_id: 'd7', quantidade: 2 },
  // Link to a3 (Carlos - Panela p5): 1 vazamento na válvula (d10)
  { id: 'ad4', audit_id: 'a3', defect_id: 'd10', quantidade: 1 },
  // Link to a5 (Juliana - Liquidificador p4): 1 motor inoperante (d8)
  { id: 'ad5', audit_id: 'a5', defect_id: 'd8', quantidade: 1 },
  // Link to a6 (Roberto - Panela p6): 2 arranhões (d13)
  { id: 'ad6', audit_id: 'a6', defect_id: 'd13', quantidade: 2 },
  // Link to a7 (Carlos - Ventilador p1): 3 ruído anormal (d3)
  { id: 'ad7', audit_id: 'a7', defect_id: 'd3', quantidade: 3 },
  // Link to a8 (Juliana - Panela p5): 2 defeito na trava (d12)
  { id: 'ad8', audit_id: 'a8', defect_id: 'd12', quantidade: 2 }
];

const initialAuditPhotos: AuditPhoto[] = [
  // Base64 simulated default photo for demo
];

const initialChangeLog: ChangeLog[] = [
  { id: 'cl1', timestamp: '2026-05-10T09:30:00', usuario: 'Carlos Eduardo', perfil: 'Auditor', acao: 'Criou', detalhes: 'Inspeção de ventiladores Max lote L-VT2601 registrada.' },
  { id: 'cl2', timestamp: '2026-05-14T14:15:00', usuario: 'Juliana Torres', perfil: 'Auditor', acao: 'Criou', detalhes: 'Inspeção de liquidificadores SuperBlend lote L-LQ2605 realizada.' },
  { id: 'cl3', timestamp: '2026-05-22T08:45:00', usuario: 'Roberto Silva', perfil: 'Auditor', acao: 'Criou', detalhes: 'Inspeção 100% aprovada para lote L-VT2605 ventiladores turbo.' },
  { id: 'cl4', timestamp: '2026-06-01T08:00:00', usuario: 'Supervisor Técnico', perfil: 'Supervisor', acao: 'Importou', detalhes: 'Seeding inicial executado para banco de dados local com sucesso.' }
];

const initialUsers: User[] = [
  {
    id: 'usr_admin',
    nome: 'Ana Carolina (Diretora)',
    email: 'ana.carolina@indfios.com.br',
    perfil: 'Administrador',
    senha: 'admin'
  },
  {
    id: 'usr_supervisor',
    nome: 'Lucas Albuquerque',
    email: 'lucas.albuquerque@indfios.com.br',
    perfil: 'Supervisor',
    senha: '123'
  },
  {
    id: 'usr_auditor',
    nome: 'Carlos Eduardo (Inspetor)',
    email: 'carlos.eduardo@indfios.com.br',
    perfil: 'Auditor',
    senha: 'abc'
  }
];

const defaultUser: User = initialUsers[1]; // Lucas as default Supervisor

// INITIALIZE LOCAL STORAGE ROUTINES
const initializeLocalData = () => {
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  }
  if (!localStorage.getItem(DEFECTS_KEY)) {
    localStorage.setItem(DEFECTS_KEY, JSON.stringify(initialDefects));
  }
  if (!localStorage.getItem(AUDITS_KEY)) {
    localStorage.setItem(AUDITS_KEY, JSON.stringify(initialAudits));
  }
  if (!localStorage.getItem(AUDIT_DEFECTS_KEY)) {
    localStorage.setItem(AUDIT_DEFECTS_KEY, JSON.stringify(initialAuditDefects));
  }
  if (!localStorage.getItem(AUDIT_PHOTOS_KEY)) {
    localStorage.setItem(AUDIT_PHOTOS_KEY, JSON.stringify(initialAuditPhotos));
  }
  if (!localStorage.getItem(CHangelog_KEY)) {
    localStorage.setItem(CHangelog_KEY, JSON.stringify(initialChangeLog));
  }
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem(PROCESS_LINES_KEY)) {
    const defaultLines = ['Linha de Montagem A', 'Linha de Montagem B', 'Linha de Prensas C'];
    localStorage.setItem(PROCESS_LINES_KEY, JSON.stringify(defaultLines));
  }
  if (!localStorage.getItem(CURRENT_USER_KEY)) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
  }
};

initializeLocalData();

export const databaseService = {
  // Check if we are integrated with Supabase right now
  isUsingSupabase: (): boolean => {
    return supabase !== null;
  },

  getSupabaseConnectionDetails: () => {
    return getSupabaseConfig();
  },

  saveSupabaseConfig: (url: string, key: string) => {
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
      window.location.reload(); // Refresh to reconnect
    } catch (e) {
      console.error(e);
    }
  },

  clearSupabaseConfig: () => {
    try {
      localStorage.removeItem(SUPABASE_CONFIG_KEY);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  },

  // Log system changes
  addLog: async (log: Omit<ChangeLog, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog: ChangeLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp,
      ...log
    };
    
    // In-memory or LocalStorage Always appended
    try {
      const logs = JSON.parse(localStorage.getItem(CHangelog_KEY) || '[]');
      logs.unshift(newLog);
      localStorage.setItem(CHangelog_KEY, JSON.stringify(logs.slice(0, 200))); // Keep last 200 logs
    } catch (e) {
      console.error('Falha ao gravar Log localmente', e);
    }

    // Try Supabase if authenticated
    if (supabase) {
      try {
        await supabase.from('logs').insert([{
          timestamp: new Date(),
          usuario: log.usuario,
          perfil: log.perfil,
          acao: log.acao,
          detalhes: log.detalhes
        }]);
      } catch (e) {
        console.error('Falha ao enviar Log para o Supabase', e);
      }
    }
  },

  getLogs: (): ChangeLog[] => {
    return JSON.parse(localStorage.getItem(CHangelog_KEY) || '[]');
  },

  // USERS
  getCurrentUser: (): User | null => {
    try {
      const usr = localStorage.getItem(CURRENT_USER_KEY);
      if (usr) return JSON.parse(usr);
    } catch (e) {
      console.error(e);
    }
    return null; // Return null if not logged in to show Login Screen
  },

  getCurrentUserOrFallback: (): User => {
    try {
      const usr = localStorage.getItem(CURRENT_USER_KEY);
      if (usr) return JSON.parse(usr);
    } catch (e) {
      console.error(e);
    }
    return defaultUser;
  },

  saveCurrentUser: async (user: User) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    await databaseService.addLog({
      usuario: user.nome,
      perfil: user.perfil,
      acao: 'Editou',
      detalhes: `Perfil de acesso alterado para ${user.perfil} (${user.nome}).`
    });
  },

  logoutUser: async () => {
    const current = databaseService.getCurrentUser();
    if (current) {
      await databaseService.addLog({
        usuario: current.nome,
        perfil: current.perfil,
        acao: 'Editou',
        detalhes: `Usuário ${current.nome} deslogou do sistema.`
      });
    }
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getUsers: (): User[] => {
    try {
      const usersStr = localStorage.getItem(USERS_KEY);
      if (usersStr) return JSON.parse(usersStr);
    } catch (e) {
      console.error(e);
    }
    return initialUsers;
  },

  saveUser: async (user: Omit<User, 'id'> & { id?: string }): Promise<User> => {
    const users = databaseService.getUsers();
    let saved: User;
    const isEdit = !!user.id;

    if (isEdit) {
      // Find original password if not provided in edit
      const original = users.find(u => u.id === user.id);
      saved = {
        ...user,
        senha: user.senha || original?.senha || '654321'
      } as User;

      const updated = users.map(u => u.id === user.id ? saved : u);
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));

      const adminUser = databaseService.getCurrentUserOrFallback();
      await databaseService.addLog({
        usuario: adminUser.nome,
        perfil: adminUser.perfil,
        acao: 'Editou',
        detalhes: `Usuário ${saved.nome} (${saved.perfil}) atualizado pelo Administrador.`
      });
    } else {
      saved = {
        ...user,
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        senha: user.senha || '123456'
      } as User;
      
      users.push(saved);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      const adminUser = databaseService.getCurrentUserOrFallback();
      await databaseService.addLog({
        usuario: adminUser.nome,
        perfil: adminUser.perfil,
        acao: 'Criou',
        detalhes: `Novo usuário ${saved.nome} (${saved.perfil}) cadastrado com sucesso.`
      });
    }

    return saved;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    const users = databaseService.getUsers();
    const target = users.find(u => u.id === id);
    if (!target) return false;

    const filtered = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));

    const adminUser = databaseService.getCurrentUserOrFallback();
    await databaseService.addLog({
      usuario: adminUser.nome,
      perfil: adminUser.perfil,
      acao: 'Excluiu',
      detalhes: `Usuário removido: ${target.nome} (${target.perfil}).`
    });

    return true;
  },

  // PROCESS LINES
  getProcessLines: (): string[] => {
    try {
      const linesStr = localStorage.getItem(PROCESS_LINES_KEY);
      if (linesStr) return JSON.parse(linesStr);
    } catch (e) {
      console.error(e);
    }
    return ['Linha de Montagem A', 'Linha de Montagem B', 'Linha de Prensas C'];
  },

  saveProcessLine: async (lineName: string): Promise<string[]> => {
    const lines = databaseService.getProcessLines();
    const trimmed = lineName.trim();
    if (!trimmed) return lines;
    if (!lines.includes(trimmed)) {
      lines.push(trimmed);
      localStorage.setItem(PROCESS_LINES_KEY, JSON.stringify(lines));
      const adminUser = databaseService.getCurrentUserOrFallback();
      await databaseService.addLog({
        usuario: adminUser.nome,
        perfil: adminUser.perfil,
        acao: 'Criou',
        detalhes: `Nova linha de processo cadastrada: ${trimmed}.`
      });
    }
    return lines;
  },

  deleteProcessLine: async (lineName: string): Promise<boolean> => {
    const lines = databaseService.getProcessLines();
    const filtered = lines.filter(l => l !== lineName);
    localStorage.setItem(PROCESS_LINES_KEY, JSON.stringify(filtered));
    const adminUser = databaseService.getCurrentUserOrFallback();
    await databaseService.addLog({
      usuario: adminUser.nome,
      perfil: adminUser.perfil,
      acao: 'Excluiu',
      detalhes: `Linha de processo removida: ${lineName}.`
    });
    return true;
  },

  // PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (!error && data) return data as Product[];
      } catch (e) {
        console.error('Supabase getProducts error, falling back to LocalStorage', e);
      }
    }
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  },

  saveProduct: async (product: Omit<Product, 'id'> & { id?: string }): Promise<Product> => {
    const currentUser = databaseService.getCurrentUser();
    let savedProduct: Product;

    if (product.id) {
      // Edit
      savedProduct = { ...product } as Product;
      const products = await databaseService.getProducts();
      const updated = products.map(p => p.id === product.id ? savedProduct : p);
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
      
      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Editou',
        detalhes: `Produto ${product.modelo} (${product.codigo}) atualizado.`
      });
    } else {
      // New
      savedProduct = {
        ...product,
        id: 'p_' + Math.random().toString(36).substr(2, 9)
      } as Product;
      const products = await databaseService.getProducts();
      products.unshift(savedProduct);
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Criou',
        detalhes: `Novo produto ${product.modelo} (${product.codigo}) cadastrado.`
      });
    }

    if (supabase) {
      try {
        if (product.id) {
          await supabase.from('products').update(product).eq('id', product.id);
        } else {
          await supabase.from('products').insert([savedProduct]);
        }
      } catch (e) {
        console.error('Supabase write error', e);
      }
    }

    return savedProduct;
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    const currentUser = databaseService.getCurrentUser();
    const products = await databaseService.getProducts();
    const target = products.find(p => p.id === id);
    if (!target) return false;

    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));

    await databaseService.addLog({
      usuario: currentUser.nome,
      perfil: currentUser.perfil,
      acao: 'Excluiu',
      detalhes: `Produto excluído: ${target.modelo} (Código: ${target.codigo})`
    });

    if (supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete error', e);
      }
    }

    return true;
  },

  // DEFECTS
  getDefects: async (): Promise<Defect[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('defects').select('*');
        if (!error && data) return data as Defect[];
      } catch (e) {
        console.error('Supabase getDefects error', e);
      }
    }
    return JSON.parse(localStorage.getItem(DEFECTS_KEY) || '[]');
  },

  saveDefect: async (defect: Omit<Defect, 'id'> & { id?: string }): Promise<Defect> => {
    const currentUser = databaseService.getCurrentUser();
    let savedDefect: Defect;

    if (defect.id) {
      savedDefect = { ...defect } as Defect;
      const defects = await databaseService.getDefects();
      const updated = defects.map(d => d.id === defect.id ? savedDefect : d);
      localStorage.setItem(DEFECTS_KEY, JSON.stringify(updated));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Editou',
        detalhes: `Defeito ${defect.nome} (${defect.codigo}) modificado.`
      });
    } else {
      savedDefect = {
        ...defect,
        id: 'd_' + Math.random().toString(36).substr(2, 9)
      } as Defect;
      const defects = await databaseService.getDefects();
      defects.unshift(savedDefect);
      localStorage.setItem(DEFECTS_KEY, JSON.stringify(defects));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Criou',
        detalhes: `Defeito ${defect.nome} (${defect.codigo}) cadastrado para monitoramento.`
      });
    }

    if (supabase) {
      try {
        if (defect.id) {
          await supabase.from('defects').update(defect).eq('id', defect.id);
        } else {
          await supabase.from('defects').insert([savedDefect]);
        }
      } catch (e) {
        console.error(e);
      }
    }

    return savedDefect;
  },

  deleteDefect: async (id: string): Promise<boolean> => {
    const currentUser = databaseService.getCurrentUser();
    const defects = await databaseService.getDefects();
    const target = defects.find(d => d.id === id);
    if (!target) return false;

    const filtered = defects.filter(d => d.id !== id);
    localStorage.setItem(DEFECTS_KEY, JSON.stringify(filtered));

    await databaseService.addLog({
      usuario: currentUser.nome,
      perfil: currentUser.perfil,
      acao: 'Excluiu',
      detalhes: `Defeito removido da lista de inspeções: ${target.nome} (${target.codigo})`
    });

    if (supabase) {
      try {
        await supabase.from('defects').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }

    return true;
  },

  // AUDITS
  getAudits: async (): Promise<Audit[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('audits').select('*');
        if (!error && data) return data as Audit[];
      } catch (e) {
        console.error('Supabase getAudits error', e);
      }
    }
    const audits: Audit[] = JSON.parse(localStorage.getItem(AUDITS_KEY) || '[]');
    // Sort audits by date descending as default
    return audits.sort((a, b) => new Date(b.data + 'T' + b.hora).getTime() - new Date(a.data + 'T' + a.hora).getTime());
  },

  getAuditDefects: async (auditId?: string): Promise<AuditDefect[]> => {
    if (supabase && auditId) {
      try {
        const { data, error } = await supabase.from('audit_defects').select('*').eq('audit_id', auditId);
        if (!error && data) return data as AuditDefect[];
      } catch (e) {
        console.error('Supabase getAuditDefects error', e);
      }
    }
    const all = JSON.parse(localStorage.getItem(AUDIT_DEFECTS_KEY) || '[]');
    if (auditId) {
      return all.filter((ad: AuditDefect) => ad.audit_id === auditId);
    }
    return all;
  },

  getAuditPhotos: async (auditId: string): Promise<AuditPhoto[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('audit_photos').select('*').eq('audit_id', auditId);
        if (!error && data) return data as AuditPhoto[];
      } catch (e) {
        console.error('Supabase getAuditPhotos error', e);
      }
    }
    const all = JSON.parse(localStorage.getItem(AUDIT_PHOTOS_KEY) || '[]');
    return all.filter((ap: AuditPhoto) => ap.audit_id === auditId);
  },

  saveAudit: async (
    audit: Omit<Audit, 'id' | 'created_at'> & { id?: string },
    defects?: { defect_id: string; quantidade: number }[],
    images?: string[] // base64 images
  ): Promise<Audit> => {
    const currentUser = databaseService.getCurrentUser();
    let savedAudit: Audit;
    const isEdit = !!audit.id;

    if (isEdit) {
      savedAudit = {
        ...audit,
        created_at: new Date().toISOString()
      } as Audit;
      const audits = await databaseService.getAudits();
      const updated = audits.map(a => a.id === audit.id ? savedAudit : a);
      localStorage.setItem(AUDITS_KEY, JSON.stringify(updated));

      // Clear existing defects for this audit to rewrite them
      const allDefects = await databaseService.getAuditDefects();
      const filteredDefects = allDefects.filter(ad => ad.audit_id !== audit.id);
      localStorage.setItem(AUDIT_DEFECTS_KEY, JSON.stringify(filteredDefects));

      // Clear existing photos for this audit to rewrite them
      const allPhotos = JSON.parse(localStorage.getItem(AUDIT_PHOTOS_KEY) || '[]');
      const filteredPhotos = allPhotos.filter((ap: AuditPhoto) => ap.audit_id !== audit.id);
      localStorage.setItem(AUDIT_PHOTOS_KEY, JSON.stringify(filteredPhotos));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Editou',
        detalhes: `Auditoria de lote ${audit.lote} (${audit.produto_tipo}) revisada.`
      });
    } else {
      const generatedId = 'a_' + Math.random().toString(36).substr(2, 9);
      savedAudit = {
        ...audit,
        id: generatedId,
        created_at: new Date().toISOString()
      } as Audit;
      const audits = await databaseService.getAudits();
      audits.unshift(savedAudit);
      localStorage.setItem(AUDITS_KEY, JSON.stringify(audits));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Criou',
        detalhes: `Lançada nova auditoria no lote ${audit.lote} (FPY: ${((audit.quantidade_aprovada / audit.quantidade_auditada) * 100).toFixed(1)}%).`
      });
    }

    const auditId = savedAudit.id;

    // Save linked defects
    if (defects && defects.length > 0) {
      const allDefects = JSON.parse(localStorage.getItem(AUDIT_DEFECTS_KEY) || '[]');
      const newDefects: AuditDefect[] = defects.map(d => ({
        id: 'ad_' + Math.random().toString(36).substr(2, 9),
        audit_id: auditId,
        defect_id: d.defect_id,
        quantidade: d.quantidade
      }));
      localStorage.setItem(AUDIT_DEFECTS_KEY, JSON.stringify([...allDefects, ...newDefects]));
    }

    // Save attached photos (base64 or reference URL)
    if (images && images.length > 0) {
      const allPhotos = JSON.parse(localStorage.getItem(AUDIT_PHOTOS_KEY) || '[]');
      const newPhotos: AuditPhoto[] = images.map(img => ({
        id: 'ap_' + Math.random().toString(36).substr(2, 9),
        audit_id: auditId,
        imagem_url: img
      }));
      localStorage.setItem(AUDIT_PHOTOS_KEY, JSON.stringify([...allPhotos, ...newPhotos]));
    }

    // Try Supabase sync
    if (supabase) {
      try {
        if (isEdit) {
          await supabase.from('audits').update(savedAudit).eq('id', auditId);
          await supabase.from('audit_defects').delete().eq('audit_id', auditId);
          await supabase.from('audit_photos').delete().eq('audit_id', auditId);
        } else {
          await supabase.from('audits').insert([savedAudit]);
        }

        if (defects && defects.length > 0) {
          const insertableDefects = defects.map(d => ({
            audit_id: auditId,
            defect_id: d.defect_id,
            quantidade: d.quantidade
          }));
          await supabase.from('audit_defects').insert(insertableDefects);
        }

        if (images && images.length > 0) {
          const insertablePhotos = images.map(img => ({
            audit_id: auditId,
            imagem_url: img
          }));
          await supabase.from('audit_photos').insert(insertablePhotos);
        }
      } catch (e) {
        console.error('Supabase write failure for audit', e);
      }
    }

    return savedAudit;
  },

  deleteAudit: async (id: string): Promise<boolean> => {
    const currentUser = databaseService.getCurrentUser();
    const audits = await databaseService.getAudits();
    const target = audits.find(a => a.id === id);
    if (!target) return false;

    const filtered = audits.filter(a => a.id !== id);
    localStorage.setItem(AUDITS_KEY, JSON.stringify(filtered));

    // Clear linked defects & photos
    const allDefects = await databaseService.getAuditDefects();
    const filteredDefects = allDefects.filter(ad => ad.audit_id !== id);
    localStorage.setItem(AUDIT_DEFECTS_KEY, JSON.stringify(filteredDefects));

    const allPhotos = JSON.parse(localStorage.getItem(AUDIT_PHOTOS_KEY) || '[]');
    const filteredPhotos = allPhotos.filter((ap: AuditPhoto) => ap.audit_id !== id);
    localStorage.setItem(AUDIT_PHOTOS_KEY, JSON.stringify(filteredPhotos));

    await databaseService.addLog({
      usuario: currentUser.nome,
      perfil: currentUser.perfil,
      acao: 'Excluiu',
      detalhes: `Excluída auditoria do lote ${target.lote} (${target.produto_tipo}) realidada por ${target.auditor}.`
    });

    if (supabase) {
      try {
        await supabase.from('audit_defects').delete().eq('audit_id', id);
        await supabase.from('audit_photos').delete().eq('audit_id', id);
        await supabase.from('audits').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }

    return true;
  },

  // BULK CSV ACTIONS
  importCSVProducts: async (productsToImport: Omit<Product, 'id'>[]): Promise<{ success: number; errors: string[] }> => {
    const currentUser = databaseService.getCurrentUser();
    const currentProducts = await databaseService.getProducts();
    const errors: string[] = [];
    let success = 0;

    const imported: Product[] = [];
    productsToImport.forEach((p, idx) => {
      if (!p.tipo || !['Ventilador', 'Liquidificador', 'Panela de Pressão'].includes(p.tipo)) {
        errors.push(`Linha ${idx + 1}: Tipo inválido "${p.tipo}". Escolha Ventilador, Liquidificador ou Panela de Pressão.`);
        return;
      }
      if (!p.modelo || !p.codigo) {
        errors.push(`Linha ${idx + 1}: Modelo e Código são campos obrigatórios.`);
        return;
      }

      const isDuplicate = currentProducts.some(curr => curr.codigo.toLowerCase() === p.codigo.toLowerCase());
      if (isDuplicate) {
        errors.push(`Linha ${idx + 1}: Produto com código "${p.codigo}" já está cadastrado.`);
        return;
      }

      imported.push({
        ...p,
        id: 'p_' + Math.random().toString(36).substr(2, 9)
      });
      success++;
    });

    if (imported.length > 0) {
      const updated = [...imported, ...currentProducts];
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Importou',
        detalhes: `Importação em massa executada: ${imported.length} produtos de fabricação adicionados.`
      });

      if (supabase) {
        try {
          await supabase.from('products').insert(imported);
        } catch (e) {
          console.error(e);
        }
      }
    }

    return { success, errors };
  },

  importCSVDefects: async (defectsToImport: Omit<Defect, 'id'>[]): Promise<{ success: number; errors: string[] }> => {
    const currentUser = databaseService.getCurrentUser();
    const currentDefects = await databaseService.getDefects();
    const errors: string[] = [];
    let success = 0;

    const imported: Defect[] = [];
    defectsToImport.forEach((d, idx) => {
      if (!d.codigo || !d.nome || !d.categoria || !d.severidade) {
        errors.push(`Linha ${idx + 1}: Código, Nome, Categoria e Severidade são obrigatórios.`);
        return;
      }
      if (!['Crítico', 'Maior', 'Menor'].includes(d.severidade)) {
        errors.push(`Linha ${idx + 1}: Severidade inválida "${d.severidade}". Use Crítico, Maior ou Menor.`);
        return;
      }

      const isDuplicate = currentDefects.some(curr => curr.codigo.toLowerCase() === d.codigo.toLowerCase());
      if (isDuplicate) {
        errors.push(`Linha ${idx + 1}: Defeito com código "${d.codigo}" já existe.`);
        return;
      }

      imported.push({
        ...d,
        id: 'd_' + Math.random().toString(36).substr(2, 9)
      });
      success++;
    });

    if (imported.length > 0) {
      const updated = [...imported, ...currentDefects];
      localStorage.setItem(DEFECTS_KEY, JSON.stringify(updated));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Importou',
        detalhes: `Importou ${imported.length} códigos de falha/defeito para as linhas de produtos.`
      });

      if (supabase) {
        try {
          await supabase.from('defects').insert(imported);
        } catch (e) {
          console.error(e);
        }
      }
    }

    return { success, errors };
  },

  importCSVAudits: async (auditsToImport: Omit<Audit, 'id' | 'created_at'>[]): Promise<{ success: number; errors: string[] }> => {
    const currentUser = databaseService.getCurrentUser();
    const currentAudits = await databaseService.getAudits();
    const products = await databaseService.getProducts();
    const errors: string[] = [];
    let success = 0;

    const imported: Audit[] = [];
    auditsToImport.forEach((a, idx) => {
      if (!a.data || !a.auditor || !a.lote || !a.linha || !a.quantidade_auditada) {
        errors.push(`Linha ${idx + 1}: Data, Auditor, Lote, Linha e Qtd Auditada são campos obrigatórios.`);
        return;
      }

      // Try finding the matched product
      const product = products.find(p => p.modelo.toLowerCase() === a.modelo.toLowerCase() || p.codigo.toLowerCase() === a.modelo.toLowerCase());
      if (!product) {
        errors.push(`Linha ${idx + 1}: Produto "${a.modelo}" não cadastrado no sistema.`);
        return;
      }

      imported.push({
        ...a,
        id: 'a_' + Math.random().toString(36).substr(2, 9),
        produto_id: product.id,
        produto_tipo: product.tipo,
        modelo: product.modelo,
        created_at: new Date().toISOString()
      });
      success++;
    });

    if (imported.length > 0) {
      const updated = [...imported, ...currentAudits];
      localStorage.setItem(AUDITS_KEY, JSON.stringify(updated));

      await databaseService.addLog({
        usuario: currentUser.nome,
        perfil: currentUser.perfil,
        acao: 'Importou',
        detalhes: `Importação em massa de histórico de auditoria concluída: ${imported.length} laudos adicionados.`
      });

      if (supabase) {
        try {
          await supabase.from('audits').insert(imported);
        } catch (e) {
          console.error(e);
        }
      }
    }

    return { success, errors };
  }
};
