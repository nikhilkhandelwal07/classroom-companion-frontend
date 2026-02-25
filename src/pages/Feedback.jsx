import React, { useState, useEffect, useMemo } from 'react';
import {
    MessageSquare,
    Smile,
    Meh,
    Frown,
    TrendingUp,
    Star,
    BarChart3,
    CheckCircle2,
    ArrowRightCircle,
    Sparkles,
    LayoutDashboard,
    Target
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';

const Feedback = ({ token, courses, showToast }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [feedbackData, setFeedbackData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    // Initial selections
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

    const fetchFeedback = async () => {
        if (!selectedCourseId || !selectedDivision) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/feedback?course_id=${selectedCourseId}&division=${selectedDivision}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setFeedbackData(data);
                showToast("Feedback analysis updated!", "success");
            } else {
                const msg = data.detail || 'Failed to fetch feedback';
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
        fetchFeedback();
    }, [selectedCourseId, selectedDivision]);

    // Graph Data formatting
    const sentimentData = useMemo(() => {
        if (!feedbackData) return [];
        return [
            { name: 'Positive', value: feedbackData.positive_count, color: '#10B981' },
            { name: 'Neutral', value: feedbackData.neutral_count, color: '#F59E0B' },
            { name: 'Negative', value: feedbackData.negative_count, color: '#EF4444' }
        ].filter(d => d.value > 0);
    }, [feedbackData]);

    const ratingData = useMemo(() => {
        if (!feedbackData || !feedbackData.rating_distribution) return [];
        return feedbackData.rating_distribution.map(d => ({
            stars: `${d.stars} Stars`,
            count: d.count
        }));
    }, [feedbackData]);

    return (
        <div className="p-8 pb-16 min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-navy flex items-center gap-3 tracking-tight">
                        <LayoutDashboard className="text-blue-600" size={40} />
                        Feedback Insights
                    </h2>
                    <p className="text-slate-500 mt-2 font-semibold">AI-powered analysis of student sentiment and performance.</p>
                </div>
                <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                    <button onClick={fetchFeedback} disabled={loading} className="px-6 py-2.5 bg-navy text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                        {loading ? 'Analyzing...' : 'Refresh Analysis'}
                    </button>
                </div>
            </div>

            {/* Selection Tabs */}
            <div className="flex flex-col gap-4 mb-10">
                <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2 overflow-x-auto scroller-hide shadow-sm">
                    {uniqueCourses.map(course => (
                        <button
                            key={course.id}
                            onClick={() => {
                                setSelectedCourseId(course.id);
                                setSelectedDivision('');
                            }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCourseId === course.id
                                ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {course.name}
                        </button>
                    ))}
                </div>
                <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2 overflow-x-auto scroller-hide shadow-sm self-start">
                    {availableDivisions.map(div => (
                        <button
                            key={div}
                            onClick={() => setSelectedDivision(div)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedDivision === div
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Division {div}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-32 bg-white rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-navy mb-6"></div>
                        <p className="text-navy font-black uppercase tracking-[0.3em] text-xs">Processing Student Feedback...</p>
                        <p className="text-slate-400 mt-2 text-sm font-medium italic">Generating AI summaries and sentiment models</p>
                    </div>
                </div>
            ) : error ? (
                <div className="p-12 bg-red-50 text-red-600 rounded-3xl border-2 border-red-100 text-center font-black animate-in zoom-in duration-300">
                    <LayoutDashboard className="mx-auto mb-4 opacity-50" size={48} />
                    {error}
                </div>
            ) : feedbackData ? (
                <div className="space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StatCard icon={<Smile className="text-green-600" size={24} />} label="Positive" value={`${feedbackData.positive_pct}%`} color="from-green-500 to-emerald-600" />
                        <StatCard icon={<Meh className="text-amber-500" size={24} />} label="Neutral" value={`${feedbackData.neutral_pct}%`} color="from-amber-500 to-orange-600" />
                        <StatCard icon={<Frown className="text-red-600" size={24} />} label="Negative" value={`${feedbackData.negative_pct}%`} color="from-rose-500 to-red-600" />
                        <StatCard icon={<Star className="text-blue-500" size={24} />} label="Avg Rating" value={`${feedbackData.avg_rating} / 5`} color="from-blue-500 to-indigo-600" />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                            <h3 className="text-xl font-black text-navy mb-8 flex items-center gap-2">
                                <Target size={24} className="text-blue-600" />
                                Sentiment Analysis
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={sentimentData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                                            {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }} itemStyle={{ fontWeight: 900, fontSize: '14px' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 700 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                            <h3 className="text-xl font-black text-navy mb-8 flex items-center gap-2">
                                <BarChart3 size={24} className="text-blue-600" />
                                Rating Distribution
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={ratingData} margin={{ left: 20, right: 40 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="stars" type="category" width={80} tick={{ fontSize: 12, fontWeight: 800, fill: '#475569' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#F8FAFC', radius: 10 }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={32}>
                                            {ratingData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : index === 4 ? '#EF4444' : '#3B82F6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* AI Summary Card */}
                    <div className="relative overflow-hidden bg-navy rounded-3xl p-8 text-white shadow-2xl group border-4 border-blue-600/20">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Sparkles size={160} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <Sparkles size={28} className="text-blue-400 animate-pulse" />
                                AI Session Summary
                            </h3>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                                <p className="text-lg font-medium leading-relaxed text-blue-50 italic">
                                    "{feedbackData.ai_analysis.summary}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* What's Working */}
                        <div className="bg-emerald-50 rounded-3xl border-2 border-emerald-100 p-8 shadow-sm">
                            <h4 className="text-emerald-900 text-xl font-black mb-6 flex items-center gap-3">
                                <CheckCircle2 size={24} />
                                What's Working Well
                            </h4>
                            <ul className="space-y-4">
                                {feedbackData.ai_analysis.working_well.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-white/60 p-4 rounded-xl border border-emerald-100 font-bold text-emerald-800 text-sm leading-snug">
                                        <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                                {feedbackData.ai_analysis.working_well.length === 0 && <li className="text-emerald-600 font-medium italic opacity-60">No specific strengths identified.</li>}
                            </ul>
                        </div>

                        {/* Areas to Improve */}
                        <div className="bg-rose-50 rounded-3xl border-2 border-rose-100 p-8 shadow-sm">
                            <h4 className="text-rose-900 text-xl font-black mb-6 flex items-center gap-3">
                                <Target size={24} />
                                Areas to Improve
                            </h4>
                            <ul className="space-y-4">
                                {feedbackData.ai_analysis.areas_to_improve.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-white/60 p-4 rounded-xl border border-rose-100 font-bold text-rose-800 text-sm leading-snug">
                                        <ArrowRightCircle size={18} className="text-rose-500 mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                                {feedbackData.ai_analysis.areas_to_improve.length === 0 && <li className="text-rose-600 font-medium italic opacity-60">No specific improvement areas identified.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Detailed Feedbacks */}
                    <div className="mt-16">
                        <h3 className="text-2xl font-black text-navy mb-8 flex items-center gap-3">
                            <MessageSquare className="text-blue-600" size={28} />
                            Student Voices
                            <span className="text-sm font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{feedbackData.total_responses} Feedbacks</span>
                        </h3>
                        {feedbackData.comments && feedbackData.comments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {feedbackData.comments.map((comment, idx) => (
                                    <CommentCard key={idx} comment={comment} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No written comments captured for this session</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-32 rounded-3xl border border-dashed border-slate-300 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-50/50"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <MessageSquare className="text-slate-200 mb-6" size={80} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Select a section to explore AI deep-dive</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => (
    <div className={`bg-white p-8 rounded-3xl border border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-500 group relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.03] -mr-12 -mt-12 rounded-full transform group-hover:scale-110 transition-transform duration-700`}></div>
        <div className="flex justify-between items-center relative z-10">
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                <h4 className="text-3xl font-black text-navy tracking-tighter">{value}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:rotate-12 transition-all duration-300">
                {icon}
            </div>
        </div>
    </div>
);

const CommentCard = ({ comment }) => {
    const isPositive = comment.sentiment === 'Positive';
    const isNegative = comment.sentiment === 'Negative';

    let bgColor = "bg-white";
    let accentColor = "text-slate-600";
    let badgeColor = "bg-slate-100 text-slate-600";
    let icon = <Meh size={14} />;

    if (isPositive) {
        bgColor = "bg-emerald-50/50";
        accentColor = "text-emerald-800";
        badgeColor = "bg-emerald-100 text-emerald-700";
        icon = <Smile size={14} />;
    } else if (isNegative) {
        bgColor = "bg-rose-50/50";
        accentColor = "text-rose-800";
        badgeColor = "bg-rose-100 text-rose-700";
        icon = <Frown size={14} />;
    }

    return (
        <div className={`p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all duration-300 shadow-sm ${bgColor} flex flex-col justify-between group`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                        {icon}
                        {comment.sentiment}
                    </div>
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-sm">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-black text-navy">{comment.rating}</span>
                    </div>
                </div>
                <p className={`text-sm leading-relaxed font-bold italic ${accentColor} line-clamp-4 group-hover:line-clamp-none transition-all`}>
                    "{comment.text || "No written comment provided."}"
                </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-between items-center">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={`h-1 w-3 rounded-full ${s <= comment.rating ? 'bg-navy/30' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Feedback;
