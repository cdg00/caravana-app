/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bluetooth, 
  BluetoothOff, 
  Save, 
  AlertCircle, 
  Trash2, 
  History, 
  Scan,
  Database,
  User,
  Activity,
  Clock,
  FileText,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type Category = 'Vaca' | 'Vaquillona' | 'Novillo' | 'Toro' | 'Ternero';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface AnimalReading {
  id: string;
  timestamp: Date;
  tagNumber: string;
  rfidCode: string;
  breed: string;
  category: Category;
  age: string;
  reproductionStatus: string;
  bodyCondition: number;
  weight: number;
  alerts: string[];
}

const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeForCSV = (text: string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (['=', '+', '-', '@'].includes(clean.charAt(0))) {
    clean = `'${clean}`;
  }
  return clean.replace(/"/g, '""');
};

const generateMockReading = (tagPrefix: string): AnimalReading => {
  const categories: Category[] = ['Vaca', 'Vaquillona', 'Novillo', 'Toro', 'Ternero'];
  const breeds = ['Angus', 'Hereford', 'Brangus', 'Braford', 'Criollo'];
  const status = ['Vacía', 'Preñada (4 meses)', 'Preñada (6 meses)', 'En celo', 'N/A'];
  
  const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const tagNumber = `${tagPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  return {
    id,
    timestamp: new Date(),
    tagNumber,
    rfidCode: `RFID-${Math.random().toString(16).toUpperCase().substring(2, 10)}`,
    breed: breeds[Math.floor(Math.random() * breeds.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    age: `${Math.floor(1 + Math.random() * 8)} años`,
    reproductionStatus: status[Math.floor(Math.random() * status.length)],
    bodyCondition: Math.floor(1 + Math.random() * 5),
    weight: Math.floor(150 + Math.random() * 500),
    alerts: Math.random() > 0.7 ? ['Requiere vacunación aftosa', 'Tratamiento activo garrapaticida'] : []
  };
};

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<'reading' | 'history'>('reading');
  const [currentReading, setCurrentReading] = useState<AnimalReading | null>(null);
  const [history, setHistory] = useState<AnimalReading[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const addNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    if (trimmed.length > 200) {
      alert("La alerta ingresada es demasiado larga (máximo 200 caracteres).");
      return;
    }

    if (currentReading) {
      const safeNote = sanitizeText(trimmed);
      setCurrentReading({
        ...currentReading,
        alerts: [...currentReading.alerts, safeNote]
      });
      setNoteText('');
      setIsNoteModalOpen(false);
    }
  };

  const handleConnectionToggle = () => {
    if (connectionStatus === 'connected') {
      setConnectionStatus('disconnected');
      setCurrentReading(null);
    } else if (connectionStatus === 'disconnected') {
      setConnectionStatus('connecting');
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 1500);
    }
  };

  const simulateScan = () => {
    if (connectionStatus !== 'connected') return;
    const newReading = generateMockReading('AR');
    setCurrentReading(newReading);
  };

  const saveReading = () => {
    if (currentReading) {
      setHistory((prev: any) => [currentReading, ...prev]);
      setCurrentReading(null);
    }
  };

  const discardReading = () => {
    setCurrentReading(null);
  };

  const deleteFromHistory = (id: string) => {
    setHistory((prev: any) => prev.filter((a: any) => a.id !== id));
  };

  const exportToPDF = () => {
    if (history.length === 0) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(46, 125, 50); 
    doc.text('CaravanaTrack Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha del Reporte: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);
    doc.text(`Total de animales: ${history.length}`, 14, 35);
    
    const tableData = history.map((a: any, index: number) => [
      index + 1,
      sanitizeText(a.tagNumber),
      sanitizeText(a.category),
      sanitizeText(a.breed),
      `${a.weight}kg`,
      sanitizeText(a.reproductionStatus),
      a.alerts.map(sanitizeText).join(', ') || '-'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Caravana', 'Categoría', 'Raza', 'Peso', 'Estado', 'Alertas']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [46, 125, 50] },
      styles: { fontSize: 8 },
    });

    doc.save(`CaravanaTrack_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['ID', 'Timestamp', 'Tag', 'RFID', 'Breed', 'Category', 'Age', 'Reproduction', 'BCS', 'Weight', 'Alerts'];
    
    const rows = history.map((a: any) => [
      sanitizeForCSV(a.id),
      sanitizeForCSV(a.timestamp.toISOString()),
      sanitizeForCSV(a.tagNumber),
      sanitizeForCSV(a.rfidCode),
      sanitizeForCSV(a.breed),
      sanitizeForCSV(a.category),
      sanitizeForCSV(a.age),
      sanitizeForCSV(a.reproductionStatus),
      sanitizeForCSV(a.bodyCondition.toString()),
      sanitizeForCSV(a.weight.toString()),
      sanitizeForCSV(a.alerts.join(' | '))
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `CaravanaTrack_Lote_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 overflow-hidden border-x border-gray-200 shadow-xl">
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-700/20">
              <Scan size={22} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-xl font-black text-green-700 tracking-tight uppercase leading-none">CaravanaTrack</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión Ganadera Pro</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
              }`} />
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                {connectionStatus === 'connected' ? 'VINCULADO' : 
                 connectionStatus === 'connecting' ? 'BUSCANDO' : 'DESCONECTADO'}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleConnectionToggle}
          disabled={connectionStatus === 'connecting'}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all uppercase tracking-tight ${
            connectionStatus === 'connected' 
              ? 'bg-red-50 text-red-600 border-2 border-red-100 shadow-sm' 
              : connectionStatus === 'connecting'
              ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
              : 'bg-green-700 text-white shadow-lg shadow-green-700/20'
          }`}
        >
          {connectionStatus === 'connected' ? <BluetoothOff size={18} strokeWidth={3} /> : <Bluetooth size={18} strokeWidth={3} />}
          {connectionStatus === 'connected' ? 'DESVINCULAR EQUIPO' : connectionStatus === 'connecting' ? 'VINCULANDO...' : 'VINCULAR BASTÓN RFID'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'reading' ? (
          <div className="p-4 space-y-4">
            {!currentReading ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                  <Scan className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Esperando Lectura</h3>
                <p className="text-sm text-gray-500 px-8">Escanee una caravana electrónica con el bastón para comenzar la gestión.</p>
                
                {connectionStatus === 'connected' && (
                  <button 
                    onClick={simulateScan}
                    className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-300 transition-colors"
                  >
                    Simular Lectura de Bastón
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentReading.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                      <Clock size={16} className="text-gray-300" />
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Número de Caravana</p>
                      <h2 className="text-5xl font-black text-green-700 tracking-tighter">
                        {currentReading.tagNumber}
                      </h2>
                      <p className="text-xs font-mono text-gray-400 mt-1">{currentReading.rfidCode}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pelaje/Raza</p>
                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Activity size={14} className="text-green-700" />
                          {currentReading.breed}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoría</p>
                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                          <User size={14} className="text-green-700" />
                          {currentReading.category}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edad Aprox.</p>
                        <p className="font-bold text-gray-800">{currentReading.age}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Peso Actual</p>
                        <p className="text-2xl font-black text-gray-800 tracking-tighter">
                          {currentReading.weight}<span className="text-xs font-bold text-gray-400 ml-1">kg</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tacto Cuerpo</p>
                      <p className="font-bold text-green-700 text-sm">{currentReading.reproductionStatus}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">C. Corporal (1-5)</p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div 
                            key={v}
                            className={`w-4 h-4 rounded-full border ${
                              v <= currentReading.bodyCondition 
                                ? 'bg-green-700 border-green-700' 
                                : 'bg-gray-100 border-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {currentReading.alerts.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={20} />
                      <div>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Alertas / Observaciones</p>
                        <ul className="text-xs font-bold text-red-700">
                          {currentReading.alerts.map((a, i) => (
                            <li key={i}>• {a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={saveReading}
                      className="flex-1 bg-green-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-green-700/30 flex items-center justify-center gap-2 uppercase text-sm tracking-tight"
                    >
                      <Save size={20} strokeWidth={2.5} />
                      Guardar Registro
                    </button>
                    <button 
                      onClick={() => setIsNoteModalOpen(true)}
                      className="w-16 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-50"
                    >
                      <AlertCircle size={24} />
                    </button>
                    <button 
                      onClick={discardReading}
                      className="w-16 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-red-500 hover:border-red-200"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Lote Actual</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">{history.length} ANIMALES</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={exportToPDF}
                  title="Descargar PDF"
                  className="p-2.5 bg-white rounded-xl border-2 border-gray-100 text-gray-600 hover:border-red-100 hover:text-red-500 shadow-sm"
                >
                  <FileText size={20} />
                </button>
                <button 
                  onClick={exportToCSV}
                  title="Descargar CSV"
                  className="p-2.5 bg-white rounded-xl border-2 border-gray-100 text-gray-600 hover:border-blue-100 hover:text-blue-500 shadow-sm"
                >
                  <FileCode size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
                  <Database className="mx-auto text-gray-200 mb-2" size={48} />
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Sin registros guardados</p>
                </div>
              ) : (
                history.map((a: any) => (
                  <motion.div 
                    layout
                    key={a.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-4 rounded-2xl border-2 border-gray-50 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-700/10 rounded-xl flex items-center justify-center">
                        <Activity className="text-green-700" size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-800 tracking-tight text-lg leading-tight">{a.tagNumber}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                            {a.category}
                          </span>
                          <span className="text-[10px] font-bold text-gray-300">
                            {a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-black text-gray-800 text-lg leading-tight">{a.weight}kg</p>
                        <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">{a.breed}</p>
                      </div>
                      <button 
                        onClick={() => deleteFromHistory(a.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-8 py-3 flex justify-between items-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('reading')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'reading' ? 'text-green-700 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'reading' ? 'bg-green-700/10' : ''}`}>
            <Scan size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Lectura</span>
        </button>
        
        <div className="h-8 w-px bg-gray-100" />
        
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-green-700 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'history' ? 'bg-green-700/10' : ''}`}>
            <History size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Historial</span>
        </button>
      </nav>

      {connectionStatus === 'connected' && !currentReading && activeTab === 'reading' && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={simulateScan}
          className="fixed bottom-24 right-8 w-14 h-14 bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white"
        >
          <Scan size={28} />
        </motion.button>
      )}

      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-green-700" size={20} />
                <h3 className="font-black text-gray-800 uppercase tracking-tight">Agregar Alerta</h3>
              </div>
              <textarea 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej: Requiere vacunación..."
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-700 focus:outline-none focus:border-green-700/30 min-h-[100px] mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-400 text-sm uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={addNote}
                  className="flex-1 py-3 bg-green-700 text-white rounded-xl font-black text-sm shadow-lg shadow-green-700/20 uppercase tracking-tight"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
