import { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { 
  FaSearch, FaSpinner, FaExclamationTriangle, FaTrophy, FaStar, 
  FaUsers, FaCheckCircle, FaChartLine, FaShieldAlt 
} from 'react-icons/fa';

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCY7_QfNATjA7Vl64jRvY_ogcTwEsWMyn8",
  authDomain: "talkowall.firebaseapp.com",
  projectId: "talkowall",
  storageBucket: "talkowall.firebasestorage.app",
  messagingSenderId: "194798356865",
  appId: "1:194798356865:web:46f3f1eaf8bc6654a48080",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Helper Functions
const sanitize = (val) => {
  if (val === undefined || val === null || val === "") return "N/A";
  return val.toString().replace(/[<>]/g, "").trim();
};

const getGradeData = (m) => {
  if (m >= 80) return { label: "A+", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (m >= 70) return { label: "A", color: "text-blue-600", bar: "bg-blue-500" };
  if (m >= 60) return { label: "A-", color: "text-indigo-600", bar: "bg-indigo-500" };
  if (m >= 50) return { label: "B", color: "text-amber-600", bar: "bg-amber-500" };
  if (m >= 33) return { label: "D", color: "text-slate-600", bar: "bg-slate-500" };
  return { label: "F", color: "text-red-600", bar: "bg-red-500" };
};

// 3. Main Component
export default function EnterpriseDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const rawData = snap.docs.map(doc => {
          const s = doc.data();
          let totalMarks = 0;
          let failedCount = 0;

          // CQ and MCQ Processing
          const exams = (s.exams || []).map(e => {
            const cq = Number(e.cq || 0);
            const mcq = Number(e.mcq || 0);
            const m = Math.max(0, Math.min(cq + mcq, 100));
            
            if (m < 33) failedCount++;
            totalMarks += m;
            return { 
              ...e, 
              totalSubMark: m, 
              cq, 
              mcq, 
              ...getGradeData(m) 
            };
          });

          const studentIdentifier = s.studentId || s.sid || s.id || "N/A";

          return {
            ...s,
            name: sanitize(s.name || "Unknown"),
            docId: doc.id,
            exams,
            totalMarks,
            hasFailed: failedCount > 0,
            avgMarks: exams.length ? (totalMarks / exams.length).toFixed(1) : 0,
            sid: sanitize(studentIdentifier) 
          };
        });

        const rankedData = rawData
          .sort((a, b) => b.totalMarks - a.totalMarks)
          .map((st, idx) => ({ ...st, rank: idx + 1 }));

        setStudents(rankedData);
      } catch (err) {
        console.error("Data Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const passed = students.filter(s => !s.hasFailed).length;
    return {
      total: students.length,
      passRate: students.length ? ((passed / students.length) * 100).toFixed(0) : 0,
      topScore: students.length ? students[0].totalMarks : 0
    };
  }, [students]);

  const displayData = useMemo(() => {
    return students.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = s.sid.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSearch = nameMatch || idMatch;

      if (filter === "Toppers") return !s.hasFailed && matchSearch;
      if (filter === "Failed") return s.hasFailed && matchSearch;
      return matchSearch;
    });
  }, [students, searchTerm, filter]);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#f8fafc]">
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
        <FaShieldAlt className="absolute text-blue-600 text-xl" />
      </div>
      <p className="mt-6 font-black text-slate-400 tracking-[0.2em] uppercase text-[10px]">Securely Loading Records...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20 font-sans text-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 uppercase tracking-widest text-[9px] font-black mb-1">
              <span className="h-[2px] w-6 bg-blue-600"></span> 
              Enterprise Management
            </div>
            <h1 className="text-2xl font-black tracking-tight">Tanmoy <span className="text-blue-600">Teach</span></h1>
          </div>
          
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..." 
              className="w-full rounded-2xl border-none bg-slate-100 px-12 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<FaUsers/>} label="Active Students" value={stats.total} color="blue" />
          <StatCard icon={<FaCheckCircle/>} label="Pass Percentage" value={`${stats.passRate}%`} color="emerald" />
          <StatCard icon={<FaTrophy/>} label="Top Marks" value={stats.topScore} color="amber" />
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['All', 'Toppers', 'Failed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-8 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${filter === f ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f === 'Toppers' ? '🌟 Elite List' : f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {displayData.map((s) => (
            <div key={s.docId} className={`group relative rounded-[2.5rem] bg-white border border-slate-200 p-8 transition-all hover:shadow-2xl hover:border-blue-200 ${s.rank <= 3 && !s.hasFailed ? 'ring-2 ring-amber-100' : ''}`}>
              
              <div className={`absolute -top-3 -right-3 h-12 w-12 flex items-center justify-center rounded-2xl font-black text-sm shadow-xl rotate-12 transition-transform group-hover:rotate-0 
                ${s.rank === 1 ? 'bg-amber-400 text-white' : s.rank === 2 ? 'bg-slate-300 text-white' : s.rank === 3 ? 'bg-orange-300 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}>
                #{s.rank}
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">{s.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    ID: {s.sid}
                  </span>
                  <span className={`h-1 w-1 rounded-full ${s.hasFailed ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                  <span className={`text-[9px] font-black uppercase ${s.hasFailed ? 'text-red-500' : 'text-emerald-600'}`}>
                    {s.hasFailed ? 'Not Qualified' : 'Qualified'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Total</p>
                  <p className="text-2xl font-black text-slate-900">{s.totalMarks}</p>
                </div>
                <div className={`rounded-3xl p-5 border ${s.hasFailed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">GPA</p>
                  <p className={`text-2xl font-black ${s.hasFailed ? 'text-red-600' : 'text-emerald-600'}`}>
                    {s.finalGPA || (s.totalMarks/s.exams.length/20 || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Subject Mastery with CQ/MCQ breakdown */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Subject Mastery</p>
                {s.exams.map((e, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{e.subject}</span>
                      <span className={`${e.color} font-black text-[11px]`}>{e.totalSubMark}% ({e.label})</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                          <span>CQ</span> <span>{e.cq}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${e.cq}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                          <span>MCQ</span> <span>{e.mcq}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${e.mcq}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!s.hasFailed && s.rank <= 3 && (
                <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-[10px] font-black text-white uppercase tracking-[0.15em] shadow-lg">
                  <FaStar className="text-amber-400 animate-pulse" /> Top Ranked Professional
                </div>
              )}
            </div>
          ))}
        </div>

        {displayData.length === 0 && (
          <div className="mt-20 text-center py-20 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
            <FaExclamationTriangle className="mx-auto text-slate-200 text-7xl mb-6" />
            <h3 className="text-slate-500 font-black uppercase tracking-[0.3em]">No Records Found</h3>
            <p className="text-slate-400 text-sm mt-2">Adjust your search or filter to see results.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100"
  };
  return (
    <div className="bg-white p-7 rounded-[2rem] border border-slate-200 flex items-center gap-6 shadow-sm">
      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}