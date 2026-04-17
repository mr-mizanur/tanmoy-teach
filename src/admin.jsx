import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayUnion 
} from "firebase/firestore";
import { 
  UserCheck, 
  LogOut, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Loader2, 
  List,
  ShieldAlert,
  Clock,
  ChevronRight,
  Database,
  RefreshCcw
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCY7_QfNATjA7Vl64jRvY_ogcTwEsWMyn8",
  authDomain: "talkowall.firebaseapp.com",
  projectId: "talkowall",
  storageBucket: "talkowall.firebasestorage.app",
  messagingSenderId: "194798356865",
  appId: "1:194798356865:web:46f3f1eaf8bc6654a48080"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const Dst = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('admin_token') === 'authorized');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState('');
  
  const [lockoutTime, setLockoutTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [newStudent, setNewStudent] = useState({ name: '', id: '' });
  const [newMark, setNewMark] = useState({ sid: '', subject: '', mcq: '', cq: '' });

  // --- Configuration ---
  const ADMIN_PASS = "T2a#7n6m!309y@MxD"; 
  const BAN_DURATION = 60 * 60 * 1000; // 60 Minutes

  // --- Lock Logic & Timer (FIXED: Removed auto-lock on first visit) ---
  useEffect(() => {
    const checkLockout = () => {
      const savedLockout = localStorage.getItem('admin_lockout_until');
      if (savedLockout) {
        const remaining = parseInt(savedLockout) - Date.now();
        if (remaining > 0) {
          setLockoutTime(parseInt(savedLockout));
          setTimeLeft(Math.ceil(remaining / 1000));
        } else {
          localStorage.removeItem('admin_lockout_until');
          setLockoutTime(null);
          setTimeLeft(0);
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    if (lockoutTime) return;

    if (password === ADMIN_PASS) {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_token', 'authorized');
      localStorage.removeItem('admin_lockout_until');
      setStatus('🔓 Access Granted. Welcome back!');
    } else {
      // Lock only happens on WRONG password
      const expiry = Date.now() + BAN_DURATION;
      localStorage.setItem('admin_lockout_until', expiry.toString());
      setLockoutTime(expiry);
      alert("❌ Access Denied! Your browser has been blocked for 60 minutes for security reasons.");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setIsLoggedIn(false);
      sessionStorage.removeItem('admin_token');
      setPassword('');
    }
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));
      setStudents(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    } catch (e) {
      setStatus('❌ Failed to load database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadStudents();
  }, [isLoggedIn, loadStudents]);

  const addStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.id.trim()) return alert("Please fill all fields!");
    setLoading(true);
    try {
      await addDoc(collection(db, "students"), { 
        name: newStudent.name.trim(), 
        id: newStudent.id.trim(), 
        exams: [],
        createdAt: new Date().toISOString()
      });
      setNewStudent({ name: '', id: '' });
      setStatus('✅ Student added successfully');
      loadStudents();
    } catch (e) { alert("Error adding student"); }
    finally { setLoading(false); }
  };

  const addMark = async () => {
    const { sid, subject, mcq, cq } = newMark;
    if (!sid || !subject || mcq === '' || cq === '') return alert("Please provide complete exam data!");

    const student = students.find(x => x.id === sid.trim());
    if (!student) return alert("Student ID not found in database!");

    setLoading(true);
    try {
      await updateDoc(doc(db, "students", student.docId), {
        exams: arrayUnion({ 
          subject: subject.trim(), 
          mcq: Number(mcq), 
          cq: Number(cq), 
          date: new Date().toLocaleDateString() 
        })
      });
      setNewMark({ sid: '', subject: '', mcq: '', cq: '' });
      setStatus(`✅ Results saved for ${subject}`);
      loadStudents();
    } catch (e) { alert("Error updating marks"); }
    finally { setLoading(false); }
  };

  const deleteStudent = async (docId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action is permanent.`)) return;
    try {
      await deleteDoc(doc(db, "students", docId));
      setStatus('🗑️ Student record removed');
      loadStudents();
    } catch (e) { alert("Error deleting record"); }
  };

  // --- UI Components remain the same as your previous version ---
  // (Login UI and Dashboard UI code here...)
  if (!isLoggedIn) {
    const isLocked = lockoutTime && timeLeft > 0;
    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full border-b-8 border-indigo-600">
          <div className="text-center mb-10">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 ${isLocked ? 'bg-rose-100 text-rose-600 scale-110 shadow-lg shadow-rose-100' : 'bg-indigo-100 text-indigo-600'}`}>
              {isLocked ? <ShieldAlert size={44} /> : <UserCheck size={44} />}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight underline decoration-indigo-200 underline-offset-8">Admin Portal</h2>
            <p className="text-slate-400 mt-4 font-medium italic">Tanmoy Teach Management System</p>
          </div>

          {isLocked ? (
            <div className="text-center space-y-6">
              <div className="bg-rose-50 text-rose-700 py-8 rounded-[2rem] border border-rose-100 ring-4 ring-rose-50/50">
                <p className="font-bold text-sm uppercase tracking-[0.2em] mb-2 opacity-80">Security Lockout Active</p>
                <div className="flex items-center justify-center gap-3 font-mono text-5xl font-black">
                   <Clock size={32} />
                   <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 px-6 leading-relaxed">This device is temporarily blocked due to security protocols. Please wait for the timer to expire.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="group relative">
                <input 
                  type="password" 
                  placeholder="Enter Administrator Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-indigo-500 focus:bg-white outline-none transition-all text-center text-xl font-mono placeholder:font-sans placeholder:text-sm shadow-inner"
                />
              </div>
              <button 
                onClick={handleLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                Unlock Dashboard <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfdfe] min-h-screen pb-20 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        
        {/* Header */}
        <header className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Database size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tanmoy Teach <span className="text-indigo-600">HQ</span></h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Security Status: Enhanced
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-100 transition-all text-sm shadow-sm border border-rose-100">
            <LogOut size={18} /> Sign Out
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Section: Registration */}
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-lg transition-shadow duration-500">
            <div className="flex items-center gap-3 mb-8">
              <UserPlus className="text-emerald-500" size={28} />
              <h2 className="text-xl font-black text-slate-800">Student Registration</h2>
            </div>
            <div className="space-y-5">
              <input placeholder="Full Name" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium" />
              <input placeholder="Roll / Student ID" value={newStudent.id} onChange={(e) => setNewStudent({...newStudent, id: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium" />
              <button disabled={loading} onClick={addStudent} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 mt-4 transition-all active:scale-[0.98]">
                {loading ? 'Processing...' : 'Register Student'}
              </button>
            </div>
          </section>

          {/* Section: Academic Records */}
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-lg transition-shadow duration-500">
            <div className="flex items-center gap-3 mb-8">
              <Edit3 className="text-indigo-500" size={28} />
              <h2 className="text-xl font-black text-slate-800">Academic Records</h2>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input placeholder="Target ID" value={newMark.sid} onChange={(e) => setNewMark({...newMark, sid: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                <input placeholder="Subject Name" value={newMark.subject} onChange={(e) => setNewMark({...newMark, subject: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-2">MCQ Score</label>
                  <input type="number" placeholder="00" value={newMark.mcq} onChange={(e) => setNewMark({...newMark, mcq: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-2">CQ Score</label>
                  <input type="number" placeholder="00" value={newMark.cq} onChange={(e) => setNewMark({...newMark, cq: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500" />
                </div>
              </div>
              <button disabled={loading} onClick={addMark} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 mt-4 transition-all active:scale-[0.98]">
                {loading ? 'Saving Data...' : 'Publish Results'}
              </button>
            </div>
          </section>
        </div>

        {/* Database Explorer */}
        <div className="mt-16 bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <List className="text-indigo-600" size={32} /> Student Explorer
              </h2>
              <p className="text-slate-400 font-medium text-sm mt-1">Found {students.length} students in global database</p>
            </div>
            <button onClick={loadStudents} className="flex items-center gap-2 text-indigo-600 text-xs font-black bg-indigo-50 px-8 py-4 rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest border border-indigo-100">
              <RefreshCcw size={16} /> Refresh Data
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading && students.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-24 opacity-30 italic">
                <Loader2 className="animate-spin text-indigo-600 mb-6" size={56} />
                <p className="font-black text-xl">Connecting to Cloud Server...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-24 border-4 border-dashed border-slate-50 rounded-[3rem]">
                <p className="text-slate-300 font-black text-xl italic tracking-tight">Database is currently empty.</p>
              </div>
            ) : (
              students.map((student) => (
                <div key={student.docId} className="group bg-slate-50 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 p-10 rounded-[2.5rem] transition-all duration-500 border-2 border-transparent hover:border-indigo-50">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="font-black text-slate-900 text-xl leading-tight group-hover:text-indigo-600 transition-colors">{student.name}</h3>
                      <p className="text-indigo-500 font-mono text-sm font-black mt-2 bg-indigo-50 inline-block px-3 py-1 rounded-lg">ID: {student.id}</p>
                    </div>
                    <button onClick={() => deleteStudent(student.docId, student.name)} className="text-slate-300 hover:text-rose-500 transition-all p-3 bg-white rounded-2xl shadow-sm hover:rotate-12">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-5 py-2.5 rounded-full text-slate-500 shadow-sm">
                      {student.exams?.length || 0} Records Found
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {status && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-slate-900 text-white text-sm font-bold px-12 py-6 rounded-full shadow-2xl flex items-center gap-5 animate-in fade-in slide-in-from-bottom-10 duration-700 border border-slate-700/50 backdrop-blur-md">
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
              {status}
              <button onClick={() => setStatus('')} className="ml-6 text-slate-500 hover:text-white transition-colors p-1">✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dst;