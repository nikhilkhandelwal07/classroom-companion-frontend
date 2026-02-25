import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    Mail,
    Search,
    ChevronRight,
    Info,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const Attendance = ({ token, courses, showToast, onLogout }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [attendanceData, setAttendanceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailResult, setEmailResult] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });

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

    // Initial selection
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

    // Fetch attendance data
    const fetchAttendance = async () => {
        if (!selectedCourseId || !selectedDivision) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance?course_id=${selectedCourseId}&division=${selectedDivision}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401) return onLogout();
            const data = await response.json();
            if (response.ok) {
                setAttendanceData(data);
            } else {
                const msg = data.detail || 'Failed to fetch attendance';
                setError(msg);
                showToast(msg, 'error');
            }
        } catch (err) {
            const msg = 'Connection error. Please try again.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [selectedCourseId, selectedDivision]);

    const handleSendEmails = async () => {
        if (!selectedCourseId || !selectedDivision) return;

        setSendingEmail(true);
        setEmailResult(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/email-attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    division: selectedDivision,
                    threshold: 75
                })
            });

            if (response.status === 401) return onLogout();
            const data = await response.json();
            if (response.ok) {
                setEmailResult({ success: true, count: data.sent });
                showToast(`Successfully sent ${data.sent} notification emails!`, 'success');
            } else {
                const msg = data.detail || 'Failed to send emails';
                setEmailResult({ success: false, message: msg });
                showToast(msg, 'error');
            }
        } catch (err) {
            const msg = 'Connection error. Check your backend.';
            setEmailResult({ success: false, message: msg });
            showToast(msg, 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const sortedStudents = useMemo(() => {
        if (!attendanceData) return [];
        let items = [...attendanceData.students];
        if (sortConfig.key) {
            items.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return items;
    }, [attendanceData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-teal-accent" /> : <ArrowDown className="w-3 h-3 ml-1 text-teal-accent" />;
    };

    const studentsAtRisk = useMemo(() => {
        if (!attendanceData) return [];
        return attendanceData.students.filter(s => s.percentage < 75);
    }, [attendanceData]);

    if (!selectedCourseId) return <div className="p-8">No courses assigned.</div>;

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Attendance Overview</h1>
                    <p className="text-gray-500 flex items-center mt-1">
                        <span className="font-semibold">{uniqueCourses.find(c => c.id === selectedCourseId)?.name}</span>
                        <ChevronRight className="w-4 h-4 mx-1" />
                        <span>Division {selectedDivision}</span>
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <select
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-accent outline-none font-medium"
                        value={selectedCourseId}
                        onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            setSelectedDivision(''); // Reset division
                        }}
                    >
                        {uniqueCourses.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            setEmailResult(null);
                            setShowEmailModal(true);
                        }}
                        className="flex items-center space-x-2 bg-teal-accent hover:bg-teal-accent/90 text-white px-5 py-2 rounded-lg font-bold shadow-lg shadow-teal-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Mail className="w-4 h-4" />
                        <span>Email Low Attendance</span>
                    </button>
                </div>
            </div>

            {/* Division Tabs */}
            <div className="flex border-b border-gray-200">
                {availableDivisions.map(div => (
                    <button
                        key={div}
                        onClick={() => setSelectedDivision(div)}
                        className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${selectedDivision === div
                            ? 'border-teal-accent text-teal-accent'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Division {div}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-accent"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 p-8 rounded-xl text-center border border-red-100">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-800">Something went wrong</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button onClick={fetchAttendance} className="mt-4 text-teal-accent font-bold underline">Try Again</button>
                </div>
            ) : attendanceData ? (
                <>
                    {/* Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            label="Total Students"
                            value={attendanceData.summary.total_students}
                            icon={Users}
                            color="text-blue-500"
                            bg="bg-blue-50"
                        />
                        <StatCard
                            label="Avg Attendance"
                            value={`${attendanceData.summary.avg_attendance}%`}
                            icon={TrendingUp}
                            color="text-navy"
                            bg="bg-gray-100"
                        />
                        <StatCard
                            label="On Track"
                            value={attendanceData.summary.count_good}
                            icon={CheckCircle}
                            color="text-emerald-500"
                            bg="bg-emerald-50"
                            subtitle=">= 85% attendance"
                        />
                        <StatCard
                            label="Need Attention"
                            value={attendanceData.summary.count_poor}
                            icon={AlertTriangle}
                            color="text-rose-500"
                            bg="bg-rose-50"
                            subtitle="< 65% attendance"
                        />
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-extrabold text-navy mb-6">Student Participation</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData.students}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="student_name" hide />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${value}%`, 'Attendance']}
                                    />
                                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                                        {attendanceData.students.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.status === 'Good' ? '#10b981' :
                                                    entry.status === 'Warning' ? '#f59e0b' : '#ef4444'
                                            } />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th
                                        className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => requestSort('student_name')}
                                    >
                                        <div className="flex items-center">
                                            Student {getSortIcon('student_name')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => requestSort('sessions_attended')}
                                    >
                                        <div className="flex items-center justify-center">
                                            Sessions {getSortIcon('sessions_attended')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => requestSort('percentage')}
                                    >
                                        <div className="flex items-center justify-center">
                                            Attendance % {getSortIcon('percentage')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Sanctioned Leave</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {sortedStudents.map((student) => (
                                    <tr key={student.student_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center mr-3">
                                                    <span className="text-navy font-bold text-xs">{student.student_name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-navy">{student.student_name}</p>
                                                    <p className="text-xs text-gray-400">ID: {student.student_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-gray-600">{student.sessions_attended}</span>
                                            <span className="text-xs text-gray-400 ml-1">/ {student.total_sessions}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center w-full">
                                                <div className="w-24 bg-gray-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${student.status === 'Good' ? 'bg-emerald-500' :
                                                            student.status === 'Warning' ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${student.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">{student.percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={student.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.sanctioned_leave ? (
                                                <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                                    <Info className="w-3 h-3" />
                                                    <span>{student.sanctioned_leave.leave_type}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="text-center p-12 text-gray-400">Select a course to see data</div>
            )}

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <Mail className="w-6 h-6 text-teal-accent" />
                                <h3 className="text-xl font-bold text-navy">Notify Students (Attendance &lt; 75%)</h3>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {emailResult ? (
                                <div className="text-center py-8">
                                    {emailResult.success ? (
                                        <>
                                            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                            <h4 className="text-2xl font-bold text-navy mb-2">Success!</h4>
                                            <p className="text-gray-600">Successfully sent {emailResult.count} attendance warning emails.</p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                                            <h4 className="text-2xl font-bold text-navy mb-2">Error</h4>
                                            <p className="text-rose-600">{emailResult.message}</p>
                                        </>
                                    )}
                                </div>
                            ) : studentsAtRisk.length > 0 ? (
                                <>
                                    <p className="text-gray-500 mb-4 font-medium italic">
                                        The following {studentsAtRisk.length} students are below 75% attendance and will receive a reminder email.
                                    </p>
                                    <div className="space-y-3">
                                        {studentsAtRisk.map(s => (
                                            <div key={s.student_id} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                                <div>
                                                    <p className="font-bold text-navy">{s.student_name}</p>
                                                    <p className="text-xs text-rose-500 font-bold">{s.percentage}% attendance</p>
                                                </div>
                                                <Mail className="w-4 h-4 text-rose-300" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-gray-600 font-bold">Great news! All students are above the 75% threshold.</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-6 flex justify-end space-x-3">
                            {emailResult ? (
                                <button
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-8 py-2 rounded-lg font-bold bg-navy text-white shadow-lg"
                                >
                                    Close
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowEmailModal(false)}
                                        className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                                        disabled={sendingEmail}
                                    >
                                        Cancel
                                    </button>
                                    {studentsAtRisk.length > 0 && (
                                        <button
                                            className="px-8 py-2 rounded-lg font-bold bg-navy text-white shadow-lg hover:bg-navy/90 transition-all active:scale-95 disabled:bg-gray-400 disabled:scale-100"
                                            onClick={handleSendEmails}
                                            disabled={sendingEmail}
                                        >
                                            {sendingEmail ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Sending...</span>
                                                </div>
                                            ) : (
                                                'Send Emails Now'
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, bg, subtitle }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-start justify-between mb-2">
            <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
        <div className="flex flex-col">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</h4>
            <p className={`text-3xl font-extrabold ${color} tracking-tight`}>{value}</p>
            {subtitle && <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{subtitle}</p>}
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const configs = {
        'Good': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'Warning': 'bg-amber-50 text-amber-700 border-amber-100',
        'Poor': 'bg-rose-50 text-rose-700 border-rose-100'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${configs[status] || configs['Poor']}`}>
            {status}
        </span>
    );
};

export default Attendance;
