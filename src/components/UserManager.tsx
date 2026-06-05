/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Trash2, Edit2, Key, Shield, UserCheck, AlertOctagon, CheckCircle2, Eye, EyeOff, Search
} from 'lucide-react';
import { User, UserRole } from '../types';
import { databaseService } from '../services/db';

interface UserManagerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function UserManager({ currentUser, onRefreshData }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>(() => databaseService.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<UserRole>('Auditor');
  const [senha, setSenha] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  
  // Revealed passwords state in list
  const [revealedPasswordsId, setRevealedPasswordsId] = useState<{[key: string]: boolean}>({});

  // Sub Tab controlling users vs process lines
  const [subTab, setSubTab] = useState<'users' | 'lines'>('users');
  const [processLines, setProcessLines] = useState<string[]>(() => databaseService.getProcessLines());
  const [newLineName, setNewLineName] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadUsersList = () => {
    const list = databaseService.getUsers();
    setUsers(list);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Open modal for registration
  const handleOpenNew = () => {
    setEditId(null);
    setNome('');
    setEmail('');
    setPerfil('Auditor');
    setSenha('');
    setShowFormPassword(false);
    setIsOpenModal(true);
    setNotification(null);
  };

  // Open modal to edit existing user
  const handleOpenEdit = (user: User) => {
    setEditId(user.id);
    setNome(user.nome);
    setEmail(user.email);
    setPerfil(user.perfil);
    setSenha(user.senha || '');
    setShowFormPassword(false);
    setIsOpenModal(true);
    setNotification(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) {
      showNotification('error', 'Nome e E-mail são obrigatórios.');
      return;
    }

    const payload: Omit<User, 'id'> & { id?: string } = {
      nome,
      email,
      perfil,
      senha: senha || '123456'
    };

    if (editId) payload.id = editId;

    try {
      await databaseService.saveUser(payload);
      loadUsersList();
      onRefreshData();
      setIsOpenModal(false);
      showNotification('success', editId ? 'Usuário modificado com sucesso!' : 'Novo usuário cadastrado com sucesso!');
    } catch (err) {
      showNotification('error', 'Ocorreu um erro ao gravar o usuário.');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) {
      showNotification('error', 'Acesso Negado: Você não pode remover sua própria conta administradora.');
      return;
    }

    const target = users.find(u => u.id === id);
    if (!target) return;

    if (window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${target.nome}?`)) {
      try {
        await databaseService.deleteUser(id);
        loadUsersList();
        onRefreshData();
        showNotification('success', 'Cadastro removido com sucesso!');
      } catch (err) {
        showNotification('error', 'Erro ao remover cadastro.');
      }
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLineName.trim();
    if (!name) return;
    if (processLines.includes(name)) {
      showNotification('error', 'Esta linha de processo já está cadastrada.');
      return;
    }
    const updated = await databaseService.saveProcessLine(name);
    setProcessLines(updated);
    setNewLineName('');
    showNotification('success', 'Nova linha de processo cadastrada com sucesso!');
  };

  const handleDeleteLine = async (lineName: string) => {
    if (window.confirm(`Tem certeza de que deseja remover a "${lineName}"?`)) {
      try {
        await databaseService.deleteProcessLine(lineName);
        const updated = databaseService.getProcessLines();
        setProcessLines(updated);
        showNotification('success', 'Linha de processo removida com sucesso!');
      } catch (err) {
        showNotification('error', 'Erro ao remover linha de processo.');
      }
    }
  };

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswordsId(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      return u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
             u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
             u.perfil.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, searchTerm]);

  // Counts for role status stats
  const adminCount = users.filter(u => u.perfil === 'Administrador').length;
  const supervisorCount = users.filter(u => u.perfil === 'Supervisor').length;
  const auditorCount = users.filter(u => u.perfil === 'Auditor').length;

  return (
    <div className="space-y-6">
      
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            <span>Painel Administrativo - Controle de Acessos e Processos</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie colaboradores técnicos, defina níveis de acesso, senhas e controle as linhas industriais ativas de processo.
          </p>
        </div>

        {subTab === 'users' && (
          <button
            onClick={handleOpenNew}
            id="btn-add-new-user"
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 border border-sky-455 rounded-lg text-xs font-bold text-slate-950 cursor-pointer transition-colors active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Cadastrar Usuário</span>
          </button>
        )}
      </div>

      {notification && (
        <div 
          className={`flex items-start space-x-3 p-4 rounded-xl border animate-in fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-800/30 text-rose-800 dark:text-rose-300'
          }`}
          id="user-mgmt-notification"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertOctagon className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span className="text-xs font-medium leading-relaxed">{notification.message}</span>
        </div>
      )}

      {/* Sub-tabs selector style row */}
      <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl self-start inline-flex">
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'users'
              ? 'bg-white dark:bg-slate-950 text-sky-500 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Colaboradores ({users.length})</span>
        </button>
        
        <button
          type="button"
          onClick={() => setSubTab('lines')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'lines'
              ? 'bg-white dark:bg-slate-950 text-sky-500 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4 text-slate-500" />
          <span>Linhas de Processo ({processLines.length})</span>
        </button>
      </div>

      {subTab === 'users' && (
        <>
          {/* Role Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Administrador */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Administrador / Diretoria</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{adminCount}</p>
          </div>
        </div>

        {/* Supervisor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Supervisor Técnico</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{supervisorCount}</p>
          </div>
        </div>

        {/* Auditor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Auditor Operacional</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{auditorCount}</p>
          </div>
        </div>
      </div>

      {/* Main List Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Search Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none w-4 h-4 text-slate-400 my-auto" />
            <input
              id="input-search-users"
              type="text"
              placeholder="Buscar por colaborador, e-mail ou perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 ml-auto leading-none">
            {filteredUsers.length} de {users.length} usuários cadastrados
          </span>
        </div>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhum colaborador encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Refine seu termo de busca ou cadastre um novo colaborador.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="tbl-users-dashboard" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-3.5 px-6">Colaborador</th>
                  <th className="py-3.5 px-6">E-mail</th>
                  <th className="py-3.5 px-6">Nível de Perfil</th>
                  <th className="py-3.5 px-6">Código de Senha</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredUsers.map((u) => {
                  const isLogged = u.id === currentUser.id;
                  const isRevealed = !!revealedPasswordsId[u.id];
                  
                  return (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all ${
                        isLogged ? 'bg-sky-500/5 dark:bg-sky-500/10' : ''
                      }`}
                    >
                      {/* Name metadata */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            u.perfil === 'Administrador' 
                              ? 'bg-rose-105 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450' 
                              : u.perfil === 'Supervisor' 
                              ? 'bg-blue-105 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450' 
                              : 'bg-sky-105 text-sky-600 dark:bg-sky-950/40 dark:text-sky-450'
                          }`}>
                            {u.nome.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                              <span>{u.nome}</span>
                              {isLogged && (
                                <span className="text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 bg-sky-500 text-slate-950 rounded-md">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {u.email}
                      </td>

                      {/* Profile Profile Role */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase font-mono tracking-wide ${
                          u.perfil === 'Administrador'
                            ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-900/10'
                            : u.perfil === 'Supervisor'
                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/10'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/20'
                        }`}>
                          {u.perfil}
                        </span>
                      </td>

                      {/* Password */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleRevealPassword(u.id)}
                            id={`btn-reveal-pwd-${u.id}`}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                            title="Exibir Senha"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          
                          <span className="font-mono text-xs font-bold font-semibold select-all text-slate-700 dark:text-slate-100">
                            {isRevealed ? (u.senha || <span className="text-slate-400 italic">Vazia</span>) : '••••••••'}
                          </span>
                        </div>
                      </td>

                      {/* Admin actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            id={`btn-edit-user-${u.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                            title="Editar Perfil"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={isLogged}
                            id={`btn-delete-user-${u.id}`}
                            className={`p-1.5 rounded-lg transition-all ${
                              isLogged 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40' 
                                : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer'
                            }`}
                            title={isLogged ? 'Não é possível excluir seu próprio usuário' : 'Excluir Usuário'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}

      {subTab === 'lines' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Form to Register Line of Process */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm h-fit space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                Nova Linha de Processo
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Adicione novas células, linhas de injetoras ou postos de montagem técnica.
              </p>
            </div>

            <form onSubmit={handleAddLine} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Identificação da Linha DE PROCESSO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Linha de Montagem D"
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 border border-sky-455 text-slate-955 font-bold rounded-lg text-xs cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Salvar Linha de Processo</span>
              </button>
            </form>
          </div>

          {/* List of Registered Process Lines */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
                Linhas de Montagem Ativas ({processLines.length})
              </span>
              <span className="text-[11px] font-mono text-slate-400 leading-none">Ambiente do Chão de Fábrica</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {processLines.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  Nenhuma linha de processo cadastrada.
                </div>
              ) : (
                processLines.map((line) => (
                  <div key={line} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/5 dark:bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                        <span className="text-sky-500 font-mono text-[10px] font-bold">LP</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{line}</p>
                        <p className="text-[10px] font-mono text-slate-400">Status: Operativa / Ativa no Sistema</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLine(line)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/30 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                      title="Excluir Linha de Processo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Slide / Overlay Modal Form */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4.5 h-4.5 text-sky-500" />
                <span>{editId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</span>
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nome */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  placeholder="Ex: joao.silva@indfios.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  required
                />
              </div>

              {/* Roles Profile Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nível de Acesso (Perfil)
                </label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Administrador">Administrador (Diretoria)</option>
                  <option value="Supervisor">Supervisor Técnico</option>
                  <option value="Auditor">Auditor Operacional</option>
                </select>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="text-[10px] font-mono text-sky-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showFormPassword ? 'Ocultar' : 'Exibir'}</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Key className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    placeholder={editId ? "Digite para alterar a senha..." : "Defina uma senha de acesso..."}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    required={!editId}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-left">
                  {editId ? 'Deixe em branco para manter a senha atual.' : 'Senha sugerida padrão: 123456'}
                </p>
              </div>

              {/* Role limits warnings box */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-0.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Limitações de Concessão:</span>
                </span>
                {perfil === 'Administrador' && (
                  <span><strong>Acesso Total:</strong> Concede leitura e gravação completa de relatórios, produtos, falhas e usuários.</span>
                )}
                {perfil === 'Supervisor' && (
                  <span><strong>Acesso Técnico:</strong> Cadastro de produtos e defeitos, laudos e relatórios. Sem aba administrativa.</span>
                )}
                {perfil === 'Auditor' && (
                  <span><strong>Acesso Operacional:</strong> Somente emissão de laudos de inspeção e histórico. Cadastro de produtos, defeitos, relatórios gerenciais e usuários são bloqueados.</span>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-user-submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
                >
                  {editId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
