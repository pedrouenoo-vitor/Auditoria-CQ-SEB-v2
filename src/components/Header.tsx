/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Database, Users, Sun, Moon, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { databaseService } from '../services/db';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDbConfig: () => void;
}

export default function Header({
  currentUser,
  onUserChange,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  onOpenDbConfig
}: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const isSupabase = databaseService.isUsingSupabase();
  const dbConfig = databaseService.getSupabaseConnectionDetails();

  const handleRoleSwitch = (perfil: UserRole) => {
    let nome = 'Lucas Albuquerque';
    let email = 'lucas.albuquerque@indfios.com.br';

    if (perfil === 'Administrador') {
      nome = 'Ana Carolina (Diretora)';
      email = 'ana.carolina@indfios.com.br';
    } else if (perfil === 'Auditor') {
      nome = 'Carlos Eduardo (Inspetor)';
      email = 'carlos.eduardo@indfios.com.br';
    }

    const updatedUser: User = { id: 'usr_' + perfil.toLowerCase(), nome, email, perfil };
    onUserChange(updatedUser);
    setShowUserDropdown(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Executivo' },
    { id: 'audits', label: 'Módulo de Auditoria' },
    { id: 'history', label: 'Histórico de Laudos' },
    { id: 'products', label: 'Cadastro de Produtos' },
    { id: 'defects', label: 'Cadastro de Defeitos' },
    { id: 'reports', label: 'Inteligência Gerencial' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-lg text-white shadow-md flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-950" id="brand-logo" />
            </div>
            <div>
              <span className="font-sans font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text text-transparent">
                QualiControl™
              </span>
              <p className="text-[10px] font-mono text-sky-400 tracking-wider font-semibold">AUDITORIA E QUALIDADE</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {menuItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-md font-sans text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                      : 'text-slate-300 hover:bg-slate-805 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Action Tools & User Actions */}
          <div className="flex items-center space-x-3">
            {/* Supabase Status Button */}
            <button
              onClick={onOpenDbConfig}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
                isSupabase
                  ? 'bg-sky-950/40 text-sky-400 border-sky-850/50 hover:bg-sky-900/40'
                  : 'bg-amber-950/40 text-amber-400 border-amber-850/50 hover:bg-amber-900/40'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isSupabase ? 'Supabase' : 'Local DB'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabase ? 'bg-sky-450' : 'bg-amber-400 animate-pulse'}`} />
            </button>

            {/* Dark Mode toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Alternar Modo Escuro"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all text-xs"
              >
                <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white uppercase text-[10px]">
                  {currentUser.nome.substring(0, 2)}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="font-medium text-slate-200">{currentUser.nome}</p>
                  <p className="text-[9px] font-mono text-sky-400 leading-none">{currentUser.perfil}</p>
                </div>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-md bg-slate-800 border border-slate-700 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400">Logado como</p>
                    <p className="text-xs font-semibold text-white truncate">{currentUser.nome}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{currentUser.email}</p>
                  </div>
                  <div className="py-1">
                    <p className="px-4 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">Simular Perfil</p>
                    <button
                      onClick={() => handleRoleSwitch('Administrador')}
                      className={`flex items-center justify-between w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                        currentUser.perfil === 'Administrador' ? 'bg-slate-700 text-sky-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>Administrador (Diretoria)</span>
                      {currentUser.perfil === 'Administrador' && <CheckCircle className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('Supervisor')}
                      className={`flex items-center justify-between w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                        currentUser.perfil === 'Supervisor' ? 'bg-slate-700 text-sky-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>Supervisor Técnico</span>
                      {currentUser.perfil === 'Supervisor' && <CheckCircle className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('Auditor')}
                      className={`flex items-center justify-between w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                        currentUser.perfil === 'Auditor' ? 'bg-slate-700 text-sky-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>Auditor Operacional</span>
                      {currentUser.perfil === 'Auditor' && <CheckCircle className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Area */}
        <div className="md:hidden flex space-x-1 overflow-x-auto py-2 border-t border-slate-800 no-scrollbar">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 rounded text-xs shrink-0 whitespace-nowrap font-medium transition-all ${
                  active ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
