/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Administrador' | 'Supervisor' | 'Auditor';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  senha?: string;
}

export type ProductType = 'Ventilador' | 'Liquidificador' | 'Panela de Pressão';

export interface Product {
  id: string;
  tipo: ProductType;
  modelo: string;
  codigo: string;
  // Dynamic specs based on product type
  potencia?: string;       // Ventilador & Liquidificador
  cor?: string;            // Ventilador & Liquidificador
  versao?: string;         // Ventilador & Panela de Pressão
  capacidade?: string;     // Liquidificador & Panela de Pressão
  material?: string;       // Panela de Pressão
  localBurnIn?: string;    // Local de Teste Burn-in
}

export interface Defect {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  categoria: string; // e.g. Elétrico, Funcional, Mecânico, Estético, Segurança
  severidade: 'Crítico' | 'Maior' | 'Menor';
}

export interface Audit {
  id: string;
  data: string; // ISO yyyy-mm-dd
  hora: string; // hh:mm
  auditor: string; // Nome do auditor
  produto_tipo: ProductType;
  produto_id: string; // Ref to product
  modelo: string; // Cached modelo name
  lote: string;
  linha: string; // e.g., Linha A, Linha B, Linha C
  turno: 'Turno 1' | 'Turno 2' | 'Turno 3';
  quantidade_auditada: number;
  quantidade_aprovada: number;
  quantidade_rejeitada: number;
  notes?: string;
  checklist: {[key: string]: boolean}; // Checklist item key -> approved (true) or failed (false)
  created_at: string;
  status: 'Aprovado' | 'Rejeitado';
}

export interface AuditDefect {
  id: string;
  audit_id: string;
  defect_id: string;
  quantidade: number;
}

export interface AuditPhoto {
  id: string;
  audit_id: string;
  imagem_url: string; // base64 string or remote file path
}
