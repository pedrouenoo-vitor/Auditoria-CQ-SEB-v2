/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Database, Sun, Moon, LogOut, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { databaseService } from '../services/db';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDbConfig: () => void;
}

export default function Header({
  currentUser,
  onUserChange,
  onLogout,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  onOpenDbConfig
}: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  
  // Prompt verification state
  const [promptUser, setPromptUser] = useState<User | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const isSupabase = databaseService.isUsingSupabase();

  // Load and refresh registered users when dropdown opens
  useEffect(() => {
    if (showUserDropdown) {
      setRegisteredUsers(databaseService.getUsers());
    }
  }, [showUserDropdown]);

  const handleDropdownToggle = () => {
    setPromptUser(null);
    setVerifyPassword('');
    setVerifyError('');
    setShowUserDropdown(!showUserDropdown);
  };

  const handleUserClick = (u: User) => {
    setPromptUser(u);
    setVerifyPassword('');
    setVerifyError('');
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptUser) return;
    
    const correctPassword = promptUser.senha || '';
    if (verifyPassword === correctPassword) {
      onUserChange(promptUser);
      setPromptUser(null);
      setShowUserDropdown(false);
    } else {
      setVerifyError('Senha incorreta.');
    }
  };

  // Dynamic menu filtering based on role permissions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Executivo', roles: ['Administrador', 'Supervisor'] },
    { id: 'audits', label: 'Módulo de Auditoria', roles: ['Administrador', 'Supervisor', 'Auditor'] },
    { id: 'history', label: 'Histórico de Laudos', roles: ['Administrador', 'Supervisor', 'Auditor'] },
    { id: 'products', label: 'Cadastro de Produtos', roles: ['Administrador', 'Supervisor'] },
    { id: 'defects', label: 'Cadastro de Defeitos', roles: ['Administrador', 'Supervisor'] },
    { id: 'reports', label: 'Inteligência Gerencial', roles: ['Administrador', 'Supervisor'] },
    { id: 'users', label: 'Controle de Usuários', roles: ['Administrador'] }, // Admin only
  ].filter(item => item.roles.includes(currentUser.perfil));

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
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
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabase ? 'bg-sky-450' : 'bg-amber-400 update-pulse animate-pulse'}`} />
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
                onClick={handleDropdownToggle}
                id="btn-header-profile-dropdown"
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-705 transition-all text-xs cursor-pointer"
              >
                <div id="usr-badge-initials" className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white uppercase text-[10px]">
                  {currentUser.nome.substring(0, 2)}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="font-semibold text-slate-250">{currentUser.nome}</p>
                  <p className="text-[9px] font-mono text-sky-400 leading-none">{currentUser.perfil}</p>
                </div>
              </button>

              {showUserDropdown && (
                <div id="header-profile-dropdown-container" className="absolute right-0 mt-2 w-60 rounded-md bg-slate-800 border border-slate-700 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400">Logado como</p>
                    <p className="text-xs font-bold text-white truncate leading-tight">{currentUser.nome}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{currentUser.email}</p>
                  </div>

                  {promptUser ? (
                    /* Password verify box inline */
                    <form onSubmit={handleVerifySubmit} className="p-3 border-t border-slate-700/60 bg-slate-950/20 space-y-2">
                      <p className="text-[10px] font-bold text-sky-400">Senha de {promptUser.nome.split(' ')[0]}:</p>
                      <input
                        type="password"
                        placeholder="Insira a senha..."
                        value={verifyPassword}
                        onChange={(e) => {
                          setVerifyPassword(e.target.value);
                          setVerifyError('');
                        }}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        autoFocus
                        required
                      />
                      {verifyError && <p className="text-[9px] text-rose-400 font-bold leading-none">{verifyError}</p>}
                      <div className="flex justify-end gap-1.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setPromptUser(null)}
                          className="px-2 py-1 rounded text-[9px] font-bold hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-1 rounded text-[9px] font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
                        >
                          Confirmar
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Users List for switching */
                    <div className="py-1">
                      <p className="px-4 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">Mudar Conta</p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/30">
                        {registeredUsers.filter(u => u.id !== currentUser.id).map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleUserClick(u)}
                            className="flex items-center justify-between w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-200 leading-tight">{u.nome}</p>
                              <p className="text-[9px] font-mono text-slate-400 leading-none mt-0.5">{u.perfil}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-slate-750 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onLogout();
                          }}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-700/80 hover:text-rose-350 transition-colors cursor-pointer font-bold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sair do Sistema</span>
                        </button>
                      </div>
                    </div>
                  )}
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
