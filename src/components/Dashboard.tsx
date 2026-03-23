import React, { useState, useEffect } from 'react';
import { AnalysisResult, MRDItem, AuditLog, ComplianceStatus, UserRole, ConfidenceLevel, Medication, AlertStatus } from '../types';
import { 
  ClipboardList, 
  Pill, 
  AlertTriangle, 
  History, 
  Info, 
  Activity,
  CheckCircle, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Flag,
  Clock,
  ChevronRight,
  ChevronLeft,
  Layout,
  Maximize2,
  RefreshCw,
  Loader2,
  Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImagePreview } from './ImagePreview';

interface DashboardProps {
  data: AnalysisResult;
  imageUrl: string;
  onUpdate: (updatedData: AnalysisResult, log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  auditLogs: AuditLog[];
  role: UserRole;
  userName: string;
  onReprocess?: () => void;
  isProcessing?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, imageUrl, onUpdate, auditLogs, role, userName, onReprocess, isProcessing }) => {
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(data.transcription);
  
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState(data.patientInfo);

  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [editedVitals, setEditedVitals] = useState(data.vitals || {});

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(data.notes);

  const [viewMode, setViewMode] = useState<'split' | 'data'>('split');
  const [activeTab, setActiveTab] = useState<'transcription' | 'structured' | 'alerts' | 'mrd'>('structured');

  useEffect(() => {
    setEditedTranscription(data.transcription);
    setEditedPatient(data.patientInfo);
    setEditedVitals(data.vitals || {});
    setEditedNotes(data.notes);
  }, [data]);

  const handleSaveTranscription = () => {
    onUpdate({ ...data, transcription: editedTranscription }, {
      user: `${userName} (${role})`,
      action: 'Transcription Updated',
      details: 'Manual correction of AI transcription'
    });
    setIsEditingTranscription(false);
  };

  const clearFormatting = () => {
    // Strips extra whitespace and normalizes the text
    const cleaned = editedTranscription
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))
      .join('\n')
      .trim();
    setEditedTranscription(cleaned);
  };

  const handleSavePatient = () => {
    onUpdate({ ...data, patientInfo: editedPatient }, {
      user: `${userName} (${role})`,
      action: 'Patient Info Updated',
      details: 'Updated patient demographics'
    });
    setIsEditingPatient(false);
  };

  const handleSaveVitals = () => {
    onUpdate({ ...data, vitals: editedVitals }, {
      user: `${userName} (${role})`,
      action: 'Vitals Updated',
      details: 'Updated patient vital signs'
    });
    setIsEditingVitals(false);
  };

  const handleSaveNotes = () => {
    onUpdate({ ...data, notes: editedNotes }, {
      user: `${userName} (${role})`,
      action: 'Notes Updated',
      details: 'Clinical notes modified'
    });
    setIsEditingNotes(false);
  };

  const handleMRDAction = (itemId: string, newStatus: ComplianceStatus) => {
    const updatedMRD = data.mrdCompliance.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    const item = data.mrdCompliance.find(i => i.id === itemId);
    onUpdate({ ...data, mrdCompliance: updatedMRD }, {
      user: `${userName} (${role})`,
      action: `MRD Item ${newStatus}`,
      details: `Status of "${item?.field}" changed to ${newStatus}`
    });
  };

  const handleAlertAction = (medId: string, time: string) => {
    const updatedMeds: Medication[] = data.medications.map(med => {
      if (med.id === medId) {
        return {
          ...med,
          alertTimes: med.alertTimes.map(at => 
            at.time === time ? { ...at, status: (at.status === 'Pending' ? 'Completed' : 'Pending') as AlertStatus } : at
          )
        };
      }
      return med;
    });
    const med = data.medications.find(m => m.id === medId);
    onUpdate({ ...data, medications: updatedMeds }, {
      user: `${userName} (${role})`,
      action: 'Medication Administered',
      details: `${med?.drugName} at ${time}`
    });
  };

  const canEdit = role === 'Doctor';
  const canReviewMRD = role === 'Doctor' || role === 'MRD Officer';
  const isNurse = role === 'Nurse';

  return (
    <div className="flex flex-col h-full space-y-8">
      {/* View Controls */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-soft sticky top-0 z-10">
        <div className="flex space-x-1">
          <ViewTab active={viewMode === 'split'} onClick={() => setViewMode('split')} icon={<Layout className="w-4 h-4" />} label="Split View" />
          <ViewTab active={viewMode === 'data'} onClick={() => setViewMode('data')} icon={<Maximize2 className="w-4 h-4" />} label="Data Only" />
        </div>
        <div className="flex space-x-1">
          <NavTab active={activeTab === 'transcription'} onClick={() => setActiveTab('transcription')} label="Transcription" />
          <NavTab active={activeTab === 'structured'} onClick={() => setActiveTab('structured')} label="Structured Data" />
          <NavTab active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} label="Nursing Alerts" />
          <NavTab active={activeTab === 'mrd'} onClick={() => setActiveTab('mrd')} label="MRD Compliance" />
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : 'block'}`}>
        {/* Left Panel: Image Viewer */}
        {viewMode === 'split' && (
          <div className="h-full min-h-[600px] sticky top-24">
            <div className="h-full bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
              <ImagePreview src={imageUrl} />
            </div>
          </div>
        )}

        {/* Right Panel: Data Content */}
        <div className="h-full overflow-y-auto pr-2 space-y-8 pb-10">
          <AnimatePresence mode="wait">
            {activeTab === 'transcription' && (
              <motion.section 
                key="transcription"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden group"
              >
                <SectionHeader 
                  icon={<ClipboardList className="w-5 h-5 text-indigo-600" />} 
                  title="Transcription" 
                  isEditing={isEditingTranscription}
                  onEdit={() => setIsEditingTranscription(true)}
                  onSave={handleSaveTranscription}
                  onCancel={() => setIsEditingTranscription(false)}
                  showEdit={canEdit}
                  onReprocess={onReprocess}
                  isProcessing={isProcessing}
                />
                <div className="p-8">
                  {isEditingTranscription ? (
                    <div className="space-y-4">
                      <textarea 
                        className="w-full h-[500px] p-6 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all"
                        value={editedTranscription}
                        onChange={(e) => setEditedTranscription(e.target.value)}
                      />
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <div className="flex items-center space-x-2">
                            <span className="text-indigo-600">Words:</span>
                            <span className="text-slate-900">{editedTranscription.trim() ? editedTranscription.trim().split(/\s+/).length : 0}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-indigo-600">Characters:</span>
                            <span className="text-slate-900">{editedTranscription.length}</span>
                          </div>
                        </div>
                        <button 
                          onClick={clearFormatting}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          title="Clean up whitespace and formatting"
                        >
                          <Eraser className="w-3 h-3" />
                          <span>Clear Formatting</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm bg-slate-50/50 p-6 rounded-2xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed tracking-tight">
                      {data.transcription.split('[UNCLEAR]').map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest mx-1 border border-amber-200">UNCLEAR</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 'structured' && (
              <motion.div 
                key="structured"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Patient Info */}
                <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft relative group">
                  <SectionHeader 
                    icon={<Info className="w-5 h-5 text-indigo-600" />} 
                    title="Patient Information" 
                    isEditing={isEditingPatient}
                    onEdit={() => setIsEditingPatient(true)}
                    onSave={handleSavePatient}
                    onCancel={() => setIsEditingPatient(false)}
                    showEdit={canEdit}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <InfoField label="Patient Name" value={editedPatient.name} isEditing={isEditingPatient} onChange={(v) => setEditedPatient({...editedPatient, name: v})} confidence={data.patientInfo.confidence} />
                    <InfoField label="Age / Gender" value={`${editedPatient.age} / ${editedPatient.gender}`} isEditing={isEditingPatient} onChange={(v) => {
                      const [age, gender] = v.split('/').map(s => s.trim());
                      setEditedPatient({...editedPatient, age: age || '', gender: gender || ''});
                    }} />
                    <InfoField label="Patient ID" value={editedPatient.id} isEditing={isEditingPatient} onChange={(v) => setEditedPatient({...editedPatient, id: v})} mono />
                    <InfoField label="Admission Date" value={editedPatient.admissionDate} isEditing={isEditingPatient} onChange={(v) => setEditedPatient({...editedPatient, admissionDate: v})} />
                  </div>
                </section>

                {/* Vitals */}
                <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft relative group">
                  <SectionHeader 
                    icon={<Activity className="w-5 h-5 text-indigo-600" />} 
                    title="Vital Signs" 
                    isEditing={isEditingVitals}
                    onEdit={() => setIsEditingVitals(true)}
                    onSave={handleSaveVitals}
                    onCancel={() => setIsEditingVitals(false)}
                    showEdit={canEdit || isNurse}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-6">
                    <InfoField label="BP" value={editedVitals.bp || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, bp: v})} />
                    <InfoField label="Pulse" value={editedVitals.pulse || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, pulse: v})} />
                    <InfoField label="Temp" value={editedVitals.temp || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, temp: v})} />
                    <InfoField label="SpO2" value={editedVitals.spo2 || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, spo2: v})} />
                    <InfoField label="Resp Rate" value={editedVitals.respRate || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, respRate: v})} />
                    <InfoField label="Weight" value={editedVitals.weight || 'N/A'} isEditing={isEditingVitals} onChange={(v) => setEditedVitals({...editedVitals, weight: v})} />
                  </div>
                </section>

                {/* Clinical Notes */}
                <section className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden group">
                  <SectionHeader 
                    icon={<Info className="w-5 h-5 text-indigo-600" />} 
                    title="Clinical Notes" 
                    isEditing={isEditingNotes}
                    onEdit={() => setIsEditingNotes(true)}
                    onSave={handleSaveNotes}
                    onCancel={() => setIsEditingNotes(false)}
                    showEdit={canEdit}
                  />
                  <div className="p-8">
                    {isEditingNotes ? (
                      <textarea 
                        className="w-full h-40 p-6 text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all"
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                      />
                    ) : (
                      <p className="text-slate-700 leading-relaxed text-lg opacity-90">{data.notes}</p>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div 
                key="alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Timeline View */}
                <section className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 tracking-tight">Nursing Timeline</h3>
                    </div>
                  </div>
                  <div className="p-8 space-y-10">
                    {['08:00', '12:00', '14:00', '18:00', '20:00', '22:00'].map(time => {
                      const medsAtTime = data.medications.filter(m => m.alertTimes.some(at => at.time === time));
                      if (medsAtTime.length === 0) return null;
                      return (
                        <div key={time} className="flex space-x-8 relative">
                          <div className="w-20 pt-1 text-sm font-black text-slate-300 tracking-tighter">{time}</div>
                          <div className="flex-1 space-y-4">
                            {medsAtTime.map(med => {
                              const alert = med.alertTimes.find(at => at.time === time);
                              return (
                                <div 
                                  key={med.id} 
                                  className={`p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                                    alert?.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100 shadow-soft hover:border-indigo-200'
                                  }`}
                                >
                                  <div>
                                    <p className="font-bold text-slate-900 text-lg tracking-tight">{med.drugName}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{med.dosage} • {med.route}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleAlertAction(med.id, time)}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                      alert?.status === 'Completed' 
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-100'
                                    }`}
                                  >
                                    {alert?.status === 'Completed' ? 'Administered' : 'Mark Done'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Table View */}
                <section className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
                    <Pill className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 tracking-tight">Medication Chart</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Drug Name</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Times</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.medications.map((med) => (
                          <tr key={med.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center space-x-3">
                                <span className="font-bold text-slate-900 tracking-tight">{med.drugName}</span>
                                <ConfidenceBadge level={med.confidence} />
                              </div>
                            </td>
                            <td className="px-8 py-5 text-sm font-medium text-slate-600">{med.dosage}</td>
                            <td className="px-8 py-5 text-sm font-medium text-slate-600">{med.route}</td>
                            <td className="px-8 py-5">
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                {med.frequency}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-wrap gap-2">
                                {med.alertTimes.map((at, tIdx) => (
                                  <span key={tIdx} className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                    at.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                  }`}>
                                    {at.time}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'mrd' && (
              <motion.div 
                key="mrd"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <section className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 tracking-tight">Compliance Checklist</h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.mrdCompliance.map((item) => (
                      <div key={item.id} className="group flex flex-col p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-soft hover:border-indigo-100 transition-all">
                        <div className="flex items-start space-x-4">
                          <div className={`mt-1 p-1.5 rounded-xl ${
                            item.status === 'COMPLETE' || item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' : 
                            item.status === 'FLAGGED' ? 'bg-red-100 text-red-600' :
                            item.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {item.status === 'COMPLETE' || item.status === 'RESOLVED' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-black text-slate-900 tracking-tight">{item.field}</p>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${
                                item.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' : 
                                item.severity === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}>
                                {item.severity}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                        
                        {canReviewMRD && item.status !== 'COMPLETE' && item.status !== 'RESOLVED' && (
                          <div className="mt-6 flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <button 
                              onClick={() => handleMRDAction(item.id, 'RESOLVED')}
                              className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                            >
                              <Check className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                            <button 
                              onClick={() => handleMRDAction(item.id, 'FLAGGED')}
                              className="flex items-center space-x-2 px-4 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Flag</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audit Trail */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 tracking-tight">Audit Trail</h3>
            </div>
            <div className="p-8 space-y-8 relative max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="absolute left-10 top-10 bottom-10 w-px bg-slate-100" />
              {auditLogs.map((log) => (
                <div key={log.id} className="relative flex items-start space-x-6 pl-8">
                  <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-indigo-500 border-2 border-white ring-4 ring-indigo-50" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.timestamp}</p>
                      <span className="text-[10px] font-bold text-slate-400 italic">by {log.user}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1 tracking-tight">{log.action}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

function SectionHeader({ icon, title, isEditing, onEdit, onSave, onCancel, showEdit, onReprocess, isProcessing }: { 
  icon: React.ReactNode, 
  title: string, 
  isEditing: boolean, 
  onEdit: () => void, 
  onSave: () => void, 
  onCancel: () => void,
  showEdit: boolean,
  onReprocess?: () => void,
  isProcessing?: boolean
}) {
  return (
    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white rounded-xl shadow-soft">
          {icon}
        </div>
        <h3 className="font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="flex items-center space-x-2">
        {onReprocess && showEdit && !isEditing && (
          <button 
            onClick={onReprocess}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
            title="Re-run AI Analysis (OCR)"
          >
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span>{isProcessing ? 'Processing...' : 'Re-analyze'}</span>
          </button>
        )}
        {showEdit && (
          !isEditing ? (
            <button 
              onClick={onEdit}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex space-x-2">
              <button onClick={onSave} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Save className="w-4 h-4" /></button>
              <button onClick={onCancel} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X className="w-4 h-4" /></button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value, isEditing, onChange, mono, confidence }: { label: string, value: string, isEditing: boolean, onChange: (v: string) => void, mono?: boolean, confidence?: ConfidenceLevel }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {!isEditing && <ConfidenceBadge level={confidence} />}
      </div>
      {isEditing ? (
        <input 
          type="text" 
          className={`w-full px-4 py-2 text-sm border border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none bg-indigo-50/30 rounded-xl transition-all ${mono ? '' : 'font-bold'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className={`text-lg font-bold text-slate-900 tracking-tight ${mono ? '' : ''}`}>{value}</p>
      )}
    </div>
  );
}

function ConfidenceBadge({ level }: { level?: ConfidenceLevel }) {
  if (!level) return null;
  const colors = {
    High: 'bg-emerald-500',
    Medium: 'bg-amber-500',
    Low: 'bg-red-500'
  };
  return (
    <div className="group relative">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[level]} shadow-sm`} />
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-20">
        {level} Confidence
      </span>
    </div>
  );
}

function ViewTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NavTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
