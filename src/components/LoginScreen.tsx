/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { databaseService } from '../services/db';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export default function LoginScreen({ onLoginSuccess, users }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      // Find default or first user
      const supervisor = users.find(u => u.perfil === 'Supervisor');
      setSelectedUserId(supervisor ? supervisor.id : users[0].id);
    }
  }, [users, selectedUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUser = users.find(u => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Por favor, selecione um usuário.');
      return;
    }

    const correctPassword = targetUser.senha || '';
    if (password === correctPassword) {
      onLoginSuccess(targetUser);
    } else {
      setErrorMsg('Senha incorreta. Verifique as credenciais e tente novamente.');
    }
  };

  const activeUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      
      {/* Decorative gradient backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-sky-500 p-3 rounded-2xl text-slate-950 shadow-lg shadow-sky-500/20 mb-3 animate-bounce">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text text-transparent tracking-tight">
            QualiControl™
          </h1>
          <p className="text-[11px] font-mono tracking-widest text-sky-400 font-extrabold uppercase mt-1">
            Sistema de Inspeção e Auditoria
          </p>
          <div className="h-px bg-slate-800 w-24 mx-auto my-4" />
          <p className="text-xs text-slate-400">
            Acesso restrito para funcionários autorizados. Insira as credenciais.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Selection */}
          <div className="space-y-1.5">
            <label id="lbl-user-select" className="block text-xs font-semibold text-slate-300 tracking-wide">
              Colaborador / Perfil
            </label>
            <div className="relative">
              <select
                id="select-user-login"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setErrorMsg('');
                  setPassword('');
                }}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-850 hover:border-slate-700/60 focus:border-sky-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.perfil})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {activeUser && (
              <p className="text-[10px] font-mono text-slate-500 text-right leading-none">
                E-mail: {activeUser.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label id="lbl-password-login" className="block text-xs font-semibold text-slate-300 tracking-wide">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="input-password-login"
                type={showPassword ? 'text' : 'password'}
                placeholder="Insira sua senha..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-850 hover:border-slate-700/60 focus:border-sky-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                required
              />
              <button
                type="button"
                id="btn-toggle-login-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Erros */}
          {errorMsg && (
            <div className="flex items-start space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 p-3 rounded-lg text-xs" id="login-error-container">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            id="btn-login-submit"
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-slate-950 font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer transition-colors active:scale-[0.98]"
          >
            Acessar Sistema
          </button>
        </form>

       

      <p className="mt-6 text-[10px] font-mono text-slate-600">
        Ambiente de Auditoria em Conformidade com ISO 9001 e IATF 16949-V2
      </p>
    </div>
  );
}
