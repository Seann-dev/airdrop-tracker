import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Plus } from 'lucide-react';
import { URLScannerModal } from './URLScannerModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <span className="lg:hidden text-lg font-bold text-white tracking-wider">
            AIRDROP TRACKER
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Scan URL</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <UserIcon className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-slate-200">{user?.username}</span>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-500 hover:text-rose-400 ml-2 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <URLScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
};
