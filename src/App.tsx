/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { databaseService } from './services/db';
import { User, Product, Defect, Audit, AuditDefect } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductsManager from './components/ProductsManager';
import DefectsManager from './components/DefectsManager';
import AuditForm from './components/FormAudit';
import AuditHistory from './components/AuditHistory';
import ReportsManager from './components/ReportsManager';
import SupabaseSyncOverlay from './components/SupabaseSyncOverlay';
import LoginScreen from './components/LoginScreen';
import UserManager from './components/UserManager';
import { Settings, Info, Check, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => databaseService.getCurrentUser());
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => databaseService.getUsers());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('qualicontrol_dark');
    return saved === 'true';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [auditDefects, setAuditDefects] = useState<AuditDefect[]>([]);
  
  // Interaction overlays
  const [isOpenDbConfig, setIsOpenDbConfig] = useState(false);
  const [auditToEdit, setAuditToEdit] = useState<Audit | null>(null);

  // Sync / Loading state
  const [loading, setLoading] = useState(true);

  // Apply dark mode theme class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('qualicontrol_dark', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('qualicontrol_dark', 'false');
    }
  }, [darkMode]);

  // Secure and redirect tabs based on profile access limits
  useEffect(() => {
    if (currentUser) {
      const allowedTabs = currentUser.perfil === 'Administrador' 
        ? ['dashboard', 'audits', 'history', 'products', 'defects', 'reports', 'users']
        : currentUser.perfil === 'Supervisor'
        ? ['dashboard', 'audits', 'history', 'products', 'defects', 'reports']
        : ['audits', 'history']; // Auditor

      if (!allowedTabs.includes(activeTab)) {
        setActiveTab(allowedTabs[0]);
      }
    }
  }, [currentUser, activeTab]);

  // Load all records from database service
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const pr = await databaseService.getProducts();
      const df = await databaseService.getDefects();
      const au = await databaseService.getAudits();
      const ad = await databaseService.getAuditDefects();

      setProducts(pr);
      setDefects(df);
      setAudits(au);
      setAuditDefects(ad);
    } catch (e) {
      console.error('Erro ao carregar dados d banco', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle profile changed or switched with password verification (from header dropdown)
  const handleUserChange = async (usr: User) => {
    setCurrentUser(usr);
    await databaseService.saveCurrentUser(usr);
    setRegisteredUsers(databaseService.getUsers()); // Sync dropdown with updated registered users
  };

  const handleLogout = async () => {
    await databaseService.logoutUser();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    databaseService.saveCurrentUser(user);
    setRegisteredUsers(databaseService.getUsers());
  };

  const handleRefreshUsers = () => {
    setRegisteredUsers(databaseService.getUsers());
    loadData();
  };

  // Product Actions
  const handleSaveProduct = async (product: Omit<Product, 'id'> & { id?: string }) => {
    const saved = await databaseService.saveProduct(product);
    await loadData();
    return saved;
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await databaseService.deleteProduct(id);
    await loadData();
    return res;
  };

  // Defect Actions
  const handleSaveDefect = async (defect: Omit<Defect, 'id'> & { id?: string }) => {
    const saved = await databaseService.saveDefect(defect);
    await loadData();
    return saved;
  };

  const handleDeleteDefect = async (id: string) => {
    const res = await databaseService.deleteDefect(id);
    await loadData();
    return res;
  };

  // Audit Actions
  const handleSaveAudit = async (
    audit: Omit<Audit, 'id' | 'created_at'> & { id?: string },
    defectsList?: { defect_id: string; quantidade: number }[],
    images?: string[]
  ) => {
    const saved = await databaseService.saveAudit(audit, defectsList, images);
    setAuditToEdit(null);
    await loadData();
    setActiveTab('history'); // switch to history view to check summary
    return saved;
  };

  const handleDeleteAudit = async (id: string) => {
    const res = await databaseService.deleteAudit(id);
    await loadData();
    return res;
  };

  // Trigger editing a historical record
  const handleEditAudit = (audit: Audit) => {
    setAuditToEdit(audit);
    setActiveTab('audits'); // switch to editor tab
  };

  // Trigger duplication of inspection template for new lote
  const handleDuplicateAudit = (audit: Audit) => {
    const duplicated: Audit = {
      ...audit,
      id: '', // clear ID
      lote: audit.lote + '-COPIA',
      data: new Date().toISOString().split('T')[0] // set today
    };
    setAuditToEdit(duplicated);
    setActiveTab('audits');
  };

  // Bulk CSV Import handlers
  const handleImportProducts = async (data: Omit<Product, 'id'>[]) => {
    const res = await databaseService.importCSVProducts(data);
    await loadData();
    return res;
  };

  const handleImportDefects = async (data: Omit<Defect, 'id'>[]) => {
    const res = await databaseService.importCSVDefects(data);
    await loadData();
    return res;
  };

  const handleImportAudits = async (data: Omit<Audit, 'id' | 'created_at'>[]) => {
    const res = await databaseService.importCSVAudits(data);
    await loadData();
    return res;
  };

  if (!currentUser) {
    return (
      <LoginScreen
        users={registeredUsers}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-850 dark:text-slate-100 flex flex-col transition-all duration-300">
      
      {/* Header Panel */}
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDbConfig={() => setIsOpenDbConfig(true)}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Sincronizando laudos com a base...</p>
          </div>
        ) : (
          <div className="fade-in">
            {/* View switching panel */}
            {activeTab === 'dashboard' && (
              <Dashboard
                audits={audits}
                defects={defects}
                auditDefects={auditDefects}
              />
            )}

            {activeTab === 'audits' && (
              <AuditForm
                products={products}
                defects={defects}
                currentUser={currentUser}
                onSaveAudit={handleSaveAudit}
                initialAuditToEdit={auditToEdit}
                onCancelEdit={() => {
                  setAuditToEdit(null);
                  setActiveTab('history');
                }}
              />
            )}

            {activeTab === 'history' && (
              <AuditHistory
                audits={audits}
                onEditAudit={handleEditAudit}
                onDeleteAudit={handleDeleteAudit}
                onDuplicateAudit={handleDuplicateAudit}
                currentUserRole={currentUser.perfil}
              />
            )}

            {activeTab === 'products' && (
              <ProductsManager
                products={products}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onImportCSV={handleImportProducts}
              />
            )}

            {activeTab === 'defects' && (
              <DefectsManager
                defects={defects}
                onSaveDefect={handleSaveDefect}
                onDeleteDefect={handleDeleteDefect}
                onImportCSV={handleImportDefects}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsManager
                audits={audits}
                defects={defects}
                auditDefects={auditDefects}
              />
            )}

            {activeTab === 'users' && currentUser.perfil === 'Administrador' && (
              <UserManager
                currentUser={currentUser}
                onRefreshData={handleRefreshUsers}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Area */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-[10px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 QualiControl. Sistema Aberto Conforme Certificações ISO 9001:2015.</p>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Dev Server Ativo (Port 3000)</span>
            </span>
            <button
              onClick={() => setIsOpenDbConfig(true)}
              className="hover:text-slate-200 transition-colors underline cursor-pointer"
            >
              Configurar Banco SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Connection & Schema Helper Overlay */}
      {isOpenDbConfig && (
        <SupabaseSyncOverlay
          onClose={() => setIsOpenDbConfig(false)}
        />
      )}

    </div>
  );
}
