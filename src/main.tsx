/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bluetooth, 
  BluetoothOff, 
  Search, 
  Save, 
  AlertCircle, 
  Trash2, 
  Download, 
  History, 
  Scan,
  Database,
  ChevronRight,
  User,
  Activity,
  Weight,
  Clock,
  ArrowRightLeft,
  FileText,
  FileCode,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Definición interna de tipos para evitar dependencias externas que rompan Vercel
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

// ==========================================
// FUNCIONES DE SEGURIDAD Y LIMPIEZA DE DATOS
// ==========================================

// 1. Limpieza de textos básicos (Evita ejecución de código oculto o XSS)
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

// 2. Limpieza para exportación en Excel (Evita fórmulas dañinas al abrir el CSV)
const sanitizeForCSV = (text: string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (['=', '+', '-', '@'].includes(clean.charAt(0))) {
    clean = `'${clean}`;
  }
  return clean.replace(/"/g, '""');
};

// Generador automático de lecturas simuladas con criptografía segura para el ID
const generateMockReading = (tagPrefix: string): AnimalReading => {
  const categories: Category[] = ['Vaca', 'Vaquillona', 'Novillo', 'Toro', 'Ternero'];
  const breeds = ['Angus', 'Hereford', 'Brangus', 'Braford', 'Criollo'];
  const status = ['Vacía', 'Preñada (4 meses)', 'Preñada (6 meses)', 'En celo', 'N/A'];
  
  // ID único e imposible de duplicar matemáticamente
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

  // Validación estricta antes de guardar alertas manuales
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

  // Conectar / Desconectar Bastón por Bluetooth
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

  // Simular escaneo de caravana
  const simulateScan = () => {
    if (connectionStatus !== 'connected') return;
    const newReading = generateMockReading('AR');
    setCurrentReading(newReading);
  };

  const saveReading = () => {
    if (currentReading) {
      setHistory(prev => [currentReading, ...prev]);
      setCurrentReading(null);
    }
  };

  const discardReading = () => {
    setCurrentReading(null);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(a => a.id !== id));
  };

  // Exportar historial a formato PDF protegido
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
    
    const tableData = history.map((a, index) => [
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

  // Exportar historial a CSV con celdas blindadas para Excel
  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['ID', 'Timestamp', 'Tag', 'RFID', 'Breed', 'Category', 'Age', 'Reproduction', 'BCS', 'Weight', 'Alerts'];
    
    const rows = history.map(a => [
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

    const csvContent = [headers, ...rows].map(e =>
