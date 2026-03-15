import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Calendar,
    Save,
    ChevronRight,
    Search,
    TrendingUp,
    Award,
    AlertCircle,
    Loader2,
    CheckCircle2
} from 'lucide-react';

const Participation = ({ token, courses, showToast, onLogout }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Derived unique courses
    const uniqueCourses = useMemo(() => {
        const map = new Map();
        courses.forEach(c => map.set(c.course_id, c.course_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [courses]);

    // Derived divisions for selected course
    const availableDivisions = useMemo(() => {
        if (!selectedCourseId) return [];
        return courses
            .filter(c => c.course_id === selectedCourseId)
            .map(c => c.division);
    }, [selectedCourseId, courses]);

    // Set initial selections
    useEffect(() => {
        if (uniqueCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(uniqueCourses[0].id);
        }
    }, [uniqueCourses, selectedCourseId]);

    useEffect(() => {
        if (availableDivisions.length > 0 && !selectedDivision) {
            setSelectedDivision(availableDivisions[0]);
        }
    }, [availableDivisions, selectedDivision]);

    // Fetch participation data
    const fetchParticipation = async () => {
        if (!selectedCourseId || !selectedDivision || !sessionDate) return;
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/participation?course_id=${selectedCourseId}&division=${selectedDivision}&session_date=${sessionDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return onLogout();
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
            } else {
                showToast("Failed to fetch participation data", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipation();
    }, [selectedCourseId, selectedDivision, sessionDate]);

    const handleScoreChange = (sid, score) => {
        setStudents(prev => prev.map(s =>
            s.student_id === sid ? { ...s, score: score === '' ? null : parseInt(score) } : s
        ));
    };

    const handleRemarkChange = (sid, remark) => {
        setStudents(prev => prev.map(s =>
            s.student_id === sid ? { ...s, remark: remark } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const grades = students
                .filter(s => s.score !== null || (s.remark && s.remark.trim() !== ""))
                .map(s => ({
                    student_id: s.student_id,
                    score: s.score,
                    remark: s.remark
                }));

            if (grades.length === 0) {
                showToast("No grades to save", "info");
                setSaving(false);
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/participation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    division: selectedDivision,
                    session_date: sessionDate,
                    grades: grades
                })
            });

            if (res.status === 401) return onLogout();
            if (res.ok) {
                const data = await res.json();
                showToast(`Successfully saved grades for ${data.saved} students!`, "success");
                fetchParticipation(); // Refresh to get updated cumulative avgs
            } else {
                showToast("Failed to save grades", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toString().includes(searchTerm)
    );

    const getScoreColor = (score) => {
        if (!score) return 'bg-gray-50 border-gray-200';
        if (score >= 8) return 'bg-emerald-50 border-emerald-200';
        if (score >= 5) return 'bg-amber-50 border-amber-200';
        return 'bg-rose-50 border-rose-200';
    };

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500 w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-navy tracking-tight">Class Participation</h1>
                    <p className="text-gray-500 flex items-center mt-2 font-medium">
                        {uniqueCourses.find(c => c.id === selectedCourseId)?.name}
                        <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
                        Division {selectedDivision}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-accent transition-all">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="outline-none text-sm font-bold text-navy"
                        />
                    </div>

                    <select
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-accent outline-none font-bold text-navy text-sm"
                        value={selectedCourseId}
                        onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            setSelectedDivision('');
                        }}
                    >
                        {uniqueCourses.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center space-x-2 bg-navy text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{saving ? 'Saving...' : 'Save All Grades'}</span>
                    </button>
                </div>
            </div>

            {/* Division Tabs */}
            <div className="flex space-x-2 border-b border-gray-100">
                {availableDivisions.map(div => (
                    <button
                        key={div}
                        onClick={() => setSelectedDivision(div)}
                        className={`px-8 py-4 text-sm font-black transition-all relative ${selectedDivision === div
                                ? 'text-teal-accent'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Division {div}
                        {selectedDivision === div && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-accent rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Search & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-accent transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        <span>High (8-10)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <span>Avg (5-7)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                        <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                        <span>Low (1-4)</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <Loader2 className="w-12 h-12 text-teal-accent animate-spin" />
                    <p className="text-gray-400 font-bold animate-pulse">Loading Students...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Users className="w-16 h-16 text-gray-200 mb-4" />
                    <p className="text-gray-400 font-bold">No students found matching your criteria</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cumulative Avg</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">Score (1-10)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.map((student) => (
                                    <tr
                                        key={student.student_id}
                                        className="group hover:bg-gray-50/50 transition-all duration-200"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-navy font-black text-sm shadow-sm border ${student.score >= 8 ? 'bg-emerald-50 border-emerald-100' :
                                                        student.score >= 5 ? 'bg-amber-50 border-amber-100' :
                                                            student.score ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'
                                                    }`}>
                                                    {student.student_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-navy leading-tight">{student.student_name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {student.student_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                                                <TrendingUp className="w-3 h-3 text-gray-400" />
                                                <span className={`text-sm font-black ${!student.cumulative_avg ? 'text-gray-300' :
                                                        student.cumulative_avg >= 8 ? 'text-emerald-600' :
                                                            student.cumulative_avg >= 5 ? 'text-amber-600' : 'text-rose-600'
                                                    }`}>
                                                    {student.cumulative_avg || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={student.score === null ? '' : student.score}
                                                    onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
                                                    placeholder="—"
                                                    className="w-20 text-center bg-gray-50 border-2 border-transparent focus:border-teal-accent focus:bg-white rounded-xl px-2 py-3 text-lg font-black text-navy outline-none transition-all"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end">
                                                <input
                                                    type="text"
                                                    value={student.remark || ''}
                                                    onChange={(e) => handleRemarkChange(student.student_id, e.target.value)}
                                                    placeholder="Add remark..."
                                                    className="w-full max-w-xs bg-gray-50 border-2 border-transparent focus:border-teal-accent focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-navy outline-none transition-all"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sticky Mobile Save FAB */}
            <div className="fixed bottom-8 right-8 md:hidden">
                <button
                    onClick={handleSave}
                    className="w-14 h-14 bg-navy text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    <Save className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default Participation;
