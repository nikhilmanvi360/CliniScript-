import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadComponent } from './components/UploadComponent';
import { Dashboard } from './components/Dashboard';
import { RecordList } from './components/RecordList';
import { MRDConfig } from './components/MRDConfig';
import { LandingPage } from './components/LandingPage';
import { analyzeClinicalRecord } from './services/geminiService';
import { AnalysisResult, AuditLog, ClinicalRecord, UserRole, RecordStatus, ComplianceStatus } from './types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  updateDoc,
  Timestamp,
  getDocFromCache,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Activity, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  User,
  AlertCircle,
  LogIn,
  ShieldCheck,
  Loader2,
  ChevronLeft
} from 'lucide-react';

const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress and return as base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('Doctor');
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);
  const [mrdFields, setMrdFields] = useState<string[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isToolLaunched, setIsToolLaunched] = useState(false);

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("Database is offline. Please check your internet connection or Firebase setup.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch or create user profile
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role as UserRole);
        } else {
          // Default to Doctor for the first login (or based on email)
          const defaultRole: UserRole = firebaseUser.email === 'nikhilmanvi360@gmail.com' ? 'Doctor' : 'Nurse';
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: defaultRole,
            displayName: firebaseUser.displayName
          });
          setUserRole(defaultRole);
        }
      } else {
        setUser(null);
        setSelectedRecord(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Records Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'records'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ClinicalRecord[];
      setRecords(recordsData);
      
      // Update selected record if it's in the list
      if (selectedRecord) {
        const updated = recordsData.find(r => r.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'records');
    });
    return () => unsubscribe();
  }, [user]);

  // MRD Config Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'mrd_config'), (snapshot) => {
      if (snapshot.exists()) {
        setMrdFields(snapshot.data().fields || []);
      } else {
        // Default fields if config doesn't exist
        setMrdFields(['Patient ID', 'Date', 'Doctor Signature', 'Nurse Signature', 'Legibility']);
      }
    }, (err) => {
      // For config, we can handle it silently and use defaults, or use the standard error handler
      // If it's a permission error, it's serious, so let's use the handler
      handleFirestoreError(err, OperationType.GET, 'settings/mrd_config');
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setIsProcessing(true);
    setError(null);
    
    const recordId = Math.random().toString(36).substr(2, 9);
    const tempRecord: ClinicalRecord = {
      id: recordId,
      fileName: file.name,
      imageUrl: '', // Will be set after reader
      status: 'Processing',
      mrdStatus: 'INCOMPLETE',
      lastUpdated: new Date().toLocaleString(),
      data: null,
      auditLogs: [{
        id: 'initial',
        timestamp: new Date().toLocaleTimeString(),
        user: user.displayName || 'User',
        action: 'Record Uploaded',
        details: 'File upload started'
      }]
    };

    try {
      console.log('Compressing image...');
      const compressedBase64 = await compressImage(file);
      console.log('Compression complete. Size:', (compressedBase64.length / 1024).toFixed(2), 'KB');

      if (compressedBase64.length > 1000000) {
        console.warn('Compressed image still exceeds Firestore 1MB limit');
      }

      tempRecord.imageUrl = compressedBase64;
      
      // Save initial record to Firestore
      await setDoc(doc(db, 'records', recordId), tempRecord);
      console.log('Initial record saved:', recordId);
      
      try {
        console.log('Starting AI analysis...');
        const result = await analyzeClinicalRecord(compressedBase64, 'image/jpeg', mrdFields);
        console.log('AI analysis completed');
        
        const finalRecord: Partial<ClinicalRecord> = {
          status: 'Completed',
          data: result,
          lastUpdated: new Date().toLocaleString(),
          auditLogs: [
            ...tempRecord.auditLogs,
            {
              id: 'analyzed',
              timestamp: new Date().toLocaleTimeString(),
              user: 'AI Engine',
              action: 'Analysis Completed',
              details: 'Clinical data extracted successfully'
            }
          ]
        };
        
        await updateDoc(doc(db, 'records', recordId), finalRecord);
        setActiveTab('dashboard');
      } catch (err) {
        console.error('AI Analysis Error:', err);
        await updateDoc(doc(db, 'records', recordId), { 
          status: 'Failed' as RecordStatus,
          lastUpdated: new Date().toLocaleString()
        });
        setError(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `records/${recordId}`);
    }
  };

  const handleUpdateData = async (updatedData: AnalysisResult, log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    if (!selectedRecord || !user) return;
    
    const newLog: AuditLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };

    const updatedRecord: Partial<ClinicalRecord> = {
      data: updatedData,
      lastUpdated: new Date().toLocaleString(),
      auditLogs: [newLog, ...selectedRecord.auditLogs]
    };

    try {
      await updateDoc(doc(db, 'records', selectedRecord.id), updatedRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `records/${selectedRecord.id}`);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'records', id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `records/${id}`);
    }
  };

  const handleSwitchRole = async (newRole: UserRole) => {
    if (!user) return;
    setUserRole(newRole);
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSaveMrdConfig = async (fields: string[]) => {
    if (!user) return;
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'mrd_config'), {
        id: 'mrd_config',
        fields,
        updatedBy: user.displayName || user.email,
        updatedAt: new Date().toLocaleString()
      });
      setMrdFields(fields);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/mrd_config');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleReprocess = async (record: ClinicalRecord) => {
    if (!user || !record.imageUrl) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      // Update status to Processing
      await updateDoc(doc(db, 'records', record.id), { 
        status: 'Processing',
        lastUpdated: new Date().toLocaleString(),
        auditLogs: [
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            user: user.displayName || 'User',
            action: 'Re-analysis Started',
            details: 'OCR re-processing requested'
          },
          ...record.auditLogs
        ]
      });

      console.log('Starting AI re-analysis...');
      const result = await analyzeClinicalRecord(record.imageUrl, 'image/jpeg', mrdFields);
      console.log('AI re-analysis completed');
      
      const finalRecord: Partial<ClinicalRecord> = {
        status: 'Completed',
        data: result,
        lastUpdated: new Date().toLocaleString(),
        auditLogs: [
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            user: 'AI Engine',
            action: 'Re-analysis Completed',
            details: 'Clinical data re-extracted successfully'
          },
          ...record.auditLogs
        ]
      };
      
      await updateDoc(doc(db, 'records', record.id), finalRecord);
      setSelectedRecord({ ...record, ...finalRecord } as ClinicalRecord);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('AI Re-analysis Error:', err);
      await updateDoc(doc(db, 'records', record.id), { 
        status: 'Failed' as RecordStatus,
        lastUpdated: new Date().toLocaleString()
      });
      setError(`Re-analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const patientName = record.data?.patientInfo.name?.toLowerCase() || '';
    const patientId = record.data?.patientInfo.id?.toLowerCase() || '';
    const transcription = record.data?.transcription?.toLowerCase() || '';
    const fileName = record.fileName.toLowerCase();
    
    return patientName.includes(searchLower) || 
           patientId.includes(searchLower) || 
           transcription.includes(searchLower) ||
           fileName.includes(searchLower);
  });

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isToolLaunched) {
    return <LandingPage onLaunch={() => setIsToolLaunched(true)} />;
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Activity className="w-12 h-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">CliniScript AI</h1>
            <p className="text-slate-500 mt-2">Clinical Grade Transcription & Analysis</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign in with Google</span>
          </button>
          <p className="text-xs text-slate-400">Secure access for medical professionals only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-soft z-20">
        <div className="p-8 flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-glow">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">CliniScript</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Menu</p>
          </div>
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Clinical Records" 
            active={activeTab === 'records'} 
            onClick={() => setActiveTab('records')} 
          />
          
          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role & Security</p>
          </div>
          <div className="space-y-1 px-2">
            <RoleItem icon={<ShieldCheck className="w-4 h-4" />} label="Doctor" active={userRole === 'Doctor'} onClick={() => handleSwitchRole('Doctor')} />
            <RoleItem icon={<ShieldCheck className="w-4 h-4" />} label="Nurse" active={userRole === 'Nurse'} onClick={() => handleSwitchRole('Nurse')} />
            <RoleItem icon={<ShieldCheck className="w-4 h-4" />} label="MRD Officer" active={userRole === 'MRD Officer'} onClick={() => handleSwitchRole('MRD Officer')} />
          </div>
          
          {userRole === 'MRD Officer' && (
            <div className="pt-6">
              <div className="px-4 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administration</p>
              </div>
              <NavItem 
                icon={<Settings className="w-5 h-5" />} 
                label="Checklist Config" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
              />
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <button 
            onClick={() => setIsToolLaunched(false)}
            className="flex items-center space-x-3 w-full px-4 py-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-semibold text-sm"
          >
            <Activity className="w-5 h-5" />
            <span>Home Screen</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center bg-slate-100/80 rounded-2xl px-5 py-2.5 w-[400px] border border-slate-200/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input 
              type="text" 
              placeholder="Search records, patients, or medications..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-6">
            <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user.displayName}</p>
                <p className="text-[10px] font-bold text-indigo-600 mt-1.5 uppercase tracking-widest">{userRole}</p>
              </div>
              {user.photoURL ? (
                <div className="relative">
                  <img src={user.photoURL} alt="User" className="w-11 h-11 rounded-2xl border-2 border-white shadow-soft object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
              ) : (
                <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-soft">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-4 text-red-800 shadow-soft"
                >
                  <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">System Alert</p>
                    <p className="text-sm opacity-80 mt-0.5">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="p-1.5 hover:bg-red-100 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {selectedRecord ? 'Clinical Insight' : 'New Analysis'}
                      </h2>
                      <p className="text-slate-500 mt-2 text-lg font-medium">
                        {selectedRecord 
                          ? `Patient: ${selectedRecord.data?.patientInfo.name || 'Anonymous'}` 
                          : 'Transform handwritten clinical notes into structured medical data.'}
                      </p>
                    </div>
                    {selectedRecord && (
                      <button 
                        onClick={() => setSelectedRecord(null)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-soft flex items-center space-x-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Return to Upload</span>
                      </button>
                    )}
                  </div>

                  {!selectedRecord ? (
                    <div className="py-8">
                      {userRole !== 'Doctor' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-soft">
                          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-10 h-10 text-amber-600" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-3">Authorization Required</h3>
                          <p className="text-slate-500 mb-8 leading-relaxed">
                            Only licensed medical practitioners are authorized to initiate new clinical record analyses. 
                            Please switch to the <span className="font-bold text-indigo-600">Doctor</span> profile to proceed.
                          </p>
                          <button 
                            onClick={() => setActiveTab('records')}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-glow"
                          >
                            Browse Existing Records
                          </button>
                        </div>
                      ) : (
                        <UploadComponent onUpload={handleUpload} isProcessing={isProcessing} />
                      )}
                    </div>
                  ) : (
                    <Dashboard 
                      data={selectedRecord.data!} 
                      imageUrl={selectedRecord.imageUrl}
                      onUpdate={handleUpdateData} 
                      auditLogs={selectedRecord.auditLogs}
                      role={userRole}
                      userName={user.displayName || 'User'}
                      onReprocess={() => handleReprocess(selectedRecord)}
                      isProcessing={isProcessing}
                    />
                  )}
                </motion.div>
              )}

              {activeTab === 'records' && (
                <motion.div 
                  key="records-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Archive</h2>
                      <p className="text-slate-500 mt-2 text-lg font-medium">Centralized repository for all processed patient documentation.</p>
                    </div>
                  </div>
                  <RecordList 
                    records={filteredRecords} 
                    onSelect={(r) => {
                      setSelectedRecord(r);
                      setActiveTab('dashboard');
                    }}
                    onDelete={handleDeleteRecord}
                    onReprocess={handleReprocess}
                  />
                </motion.div>
              )}

              {activeTab === 'settings' && userRole === 'MRD Officer' && (
                <motion.div 
                  key="settings-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Compliance</h2>
                      <p className="text-slate-500 mt-2 text-lg font-medium">Define and manage clinical audit parameters.</p>
                    </div>
                  </div>
                  <MRDConfig 
                    fields={mrdFields} 
                    onSave={handleSaveMrdConfig} 
                    isSaving={isSavingConfig} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-3 w-full px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        active 
          ? 'bg-indigo-600 text-white shadow-glow' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`}>
        {icon}
      </span>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-indicator"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full" 
        />
      )}
    </button>
  );
}

function RoleItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-xs transition-all duration-300 ${
        active 
          ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 shadow-sm' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className={`${active ? 'text-emerald-600' : 'text-slate-300'}`}>
        {icon}
      </div>
      <span className="tracking-wide">{label}</span>
      {active && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" />}
    </button>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>
  );
}
