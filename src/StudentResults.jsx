import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { FaGraduationCap, FaSearch, FaDownload, FaSpinner } from 'react-icons/fa';

const firebaseConfig = {
  apiKey: "AIzaSyDafMC8W1eO_Xvqz4df2VcUqgu9oYu2JYA",
  authDomain: "tanmoy-teach.firebaseapp.com",
  projectId: "tanmoy-teach",
  storageBucket: "tanmoy-teach.firebasestorage.app",
  messagingSenderId: "636120789013",
  appId: "1:636120789013:web:3f9a923bc14f0cbea65e1c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function StudentResults() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('name');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
  }, [searchTerm, sortType, students]);

  async function loadStudents() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));
      const studentList = [];

      snap.forEach(doc => {
        const data = doc.data();
        let totalMarks = 0;

        if (data.exams) {
          totalMarks = data.exams.reduce((sum, exam) => {
            return sum + (+exam.mcq || 0) + (+exam.cq || 0);
          }, 0);
        }

        studentList.push({
          ...data,
          totalMarks,
          docId: doc.id,                    // Firebase document ID (যদি দরকার হয়)
          displayId: data.studentId || data.rollNo || data.id || doc.id.substring(0, 8) // ← এটা গুরুত্বপূর্ণ
        });
      });

      setStudents(studentList);
    } catch (error) {
      console.error("Error loading students:", error);
      alert("Failed to load data. Check Firebase configuration.");
    } finally {
      setLoading(false);
    }
  }

  function filterAndSortStudents() {
    let result = students.filter(student =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.displayId?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorting
    if (sortType === 'name') {
      result.sort((a, b) => a.name?.localeCompare(b.name));
    } else if (sortType === 'id') {
      result.sort((a, b) => {
        const idA = a.displayId?.toString() || '';
        const idB = b.displayId?.toString() || '';
        return idA.localeCompare(idB, undefined, { numeric: true });
      });
    } else if (sortType === 'total') {
      result.sort((a, b) => b.totalMarks - a.totalMarks);
    }

    setFilteredStudents(result);
  }

  function exportCSV() {
    if (students.length === 0) {
      alert("No data to export!");
      return;
    }

    let csv = "Name,Student ID,Total Marks\n";
    students.forEach(s => {
      csv += `"${s.name}","${s.displayId}",${s.totalMarks}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen pb-10">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
              <FaGraduationCap className="text-blue-600" />
              Student Results
            </h1>
            <p className="text-gray-600 mt-1">Real-time • Tanmoy Teach</p>
          </div>

          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all mt-4 md:mt-0"
          >
            <FaDownload /> Export CSV
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-5 rounded-3xl shadow-sm mb-8 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[280px] relative">
            <FaSearch className="absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="id">Sort by ID</option>
            <option value="total">Sort by Total Marks</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
            <p className="mt-4 text-lg font-medium text-gray-600">Loading students...</p>
          </div>
        )}

        {/* Student Grid */}
        {!loading && (
          <>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-20">
                <FaSearch className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl">No students found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => {
                  let grandTotal = 0;
                  const marksHTML = student.exams?.map((exam, i) => {
                    const mcq = +exam.mcq || 0;
                    const cq = +exam.cq || 0;
                    const total = mcq + cq;
                    grandTotal += total;

                    return (
                      <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="font-medium text-gray-700">{exam.subject || 'Exam'}</span>
                        <span className="text-sm">
                          <span className="text-blue-600">{mcq}</span> +{' '}
                          <span className="text-emerald-600">{cq}</span> ={' '}
                          <span className="font-bold text-gray-800">{total}</span>
                        </span>
                      </div>
                    );
                  }) || <p className="text-gray-500 py-4">No exam data available</p>;

                  return (
                    <div
                      key={student.docId}
                      className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100"
                    >
                      <div className="h-2 bg-gradient-to-r from-blue-600 to-emerald-600" />
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-800">{student.name}</h2>
                            <p className="text-gray-500 font-medium">
                              ID: {student.displayId}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-emerald-600">
                              {grandTotal}
                            </div>
                            <p className="text-xs text-gray-500 -mt-1">TOTAL</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                          {marksHTML}
                        </div>

                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{student.exams?.length || 0} Exams</span>
                          <span className="text-emerald-600 font-medium cursor-pointer hover:underline">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}