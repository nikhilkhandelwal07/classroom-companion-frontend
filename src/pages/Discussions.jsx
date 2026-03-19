import React, { useState, useEffect, useMemo } from 'react';
import { 
    MessageCircle, Search, Calendar, ChevronRight, 
    ChevronDown, ChevronUp, CheckCircle, Clock, 
    Sparkles, Send, Loader2, AlertCircle, Share2
} from 'lucide-react';

const Discussions = ({ token, courses, showToast, onLogout }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'unanswered', 'answered'
    const [questions, setQuestions] = useState([]);
    const [counts, setCounts] = useState({ all: 0, unanswered: 0, answered: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedQid, setExpandedQid] = useState(null);
    
    // Action states
    const [generating, setGenerating] = useState(null); // qid
    const [posting, setPosting] = useState(null); // qid
    const [editAnswers, setEditAnswers] = useState({}); // qid -> text

    // Derived logic (similar to Participation)
    const uniqueCourses = useMemo(() => {
        const map = new Map();
        courses.forEach(c => map.set(c.course_id, c.course_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [courses]);

    const availableDivisions = useMemo(() => {
        if (!selectedCourseId) return [];
        return courses
            .filter(c => c.course_id === selectedCourseId)
            .map(c => c.division);
    }, [selectedCourseId, courses]);

    useEffect(() => {
        if (uniqueCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(uniqueCourses[0].id);
        }
    }, [uniqueCourses, selectedCourseId]);

    useEffect(() => {
        if (availableDivisions.length > 0 && !selectedDivision && selectedCourseId) {
            setSelectedDivision(availableDivisions[0]);
        } else if (availableDivisions.length > 0 && !availableDivisions.includes(selectedDivision)) {
            setSelectedDivision(availableDivisions[0]);
        }
    }, [availableDivisions, selectedDivision, selectedCourseId]);

    const fetchQuestions = async () => {
        if (!selectedCourseId || !selectedDivision) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/questions?course_id=${selectedCourseId}&division=${selectedDivision}&status=${filter}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (res.status === 401) return onLogout();
            const data = await res.json();
            if (res.ok) {
                setQuestions(data.questions || []);
                if (data.counts) setCounts(data.counts);
            } else {
                setError(data.detail || 'Failed to fetch questions');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
        setExpandedQid(null);
    }, [selectedCourseId, selectedDivision, filter]);

    const handleSuggestAnswer = async (q) => {
        setGenerating(q.question_id);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/suggest-answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    course_id: selectedCourseId,
                    division: selectedDivision
                })
            });
            if (res.status === 401) return onLogout();
            const data = await res.json();
            if (res.ok) {
                // Update local state to show the suggestion
                setQuestions(prev => prev.map(pq => 
                    pq.question_id === q.question_id 
                    ? { ...pq, ai_suggestion: data.ai_suggestion, used_material: data.used_material }
                    : pq
                ));
                // Pre-fill the edit box
                setEditAnswers(prev => ({...prev, [q.question_id]: data.ai_suggestion}));
                showToast("Idea generated!", "success");
            } else {
                showToast(data.detail || "Failed to generate answer", "error");
            }
        } catch (err) {
            showToast("Connection error during generation", "error");
        } finally {
            setGenerating(null);
        }
    };

    const handlePostAnswer = async (qid) => {
        const answerText = editAnswers[qid];
        if (!answerText || !answerText.trim()) {
            showToast("Answer cannot be empty", "error");
            return;
        }

        setPosting(qid);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/post-answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question_id: qid,
                    faculty_answer: answerText
                })
            });
            if (res.status === 401) return onLogout();
            if (res.ok) {
                showToast("Answer posted successfully", "success");
                fetchQuestions(); // Refresh list to update status/badges
                setExpandedQid(null);
            } else {
                const data = await res.json();
                showToast(data.detail || "Failed to post answer", "error");
            }
        } catch (err) {
            showToast("Connection error posting answer", "error");
        } finally {
            setPosting(null);
        }
    };

    const toggleExpand = (q) => {
        const qid = q.question_id;
        if (expandedQid === qid) {
            setExpandedQid(null);
        } else {
            setExpandedQid(qid);
            // Pre-fill textarea if they already have an answer or suggestion
            if (!editAnswers[qid]) {
                const initialText = q.faculty_answer || q.ai_suggestion || "";
                setEditAnswers(prev => ({...prev, [qid]: initialText}));
            }
        }
    };

    const filteredQuestions = questions.filter(q => 
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const timeAgo = (dateStr) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "m ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min ago";
        return Math.floor(seconds) + " sec ago";
    };

    const handleShareLink = () => {
        if (!selectedCourseId || !selectedDivision) return;
        const url = `${window.location.origin}/student/${selectedCourseId}/${selectedDivision}`;
        navigator.clipboard.writeText(url);
        showToast("Student Portal link copied to clipboard!", "success");
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500 w-full max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-navy tracking-tight">Student Discussions</h1>
                    <p className="text-gray-500 flex items-center mt-2 font-medium">
                        {uniqueCourses.find(c => c.id === selectedCourseId)?.name}
                        <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
                        Division {selectedDivision}
                    </p>
                </div>
                <div className="flex items-center gap-4">
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
                        onClick={handleShareLink}
                        className="flex items-center space-x-2 bg-navy hover:bg-navy/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-navy/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Share Student Link</span>
                    </button>
                </div>
            </div>

            {/* Division & Filter Tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex space-x-1 p-1 bg-gray-50 rounded-xl overflow-x-auto w-full md:w-auto">
                    {availableDivisions.map(div => (
                        <button
                            key={div}
                            onClick={() => setSelectedDivision(div)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                selectedDivision === div 
                                ? 'bg-white text-navy shadow-sm' 
                                : 'text-gray-500 hover:text-navy hover:bg-gray-100'
                            }`}
                        >
                            Div {div}
                        </button>
                    ))}
                </div>

                <div className="flex space-x-2 w-full md:w-auto overflow-x-auto">
                    {['all', 'unanswered', 'answered'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap border flex items-center gap-2 ${
                                filter === f
                                ? 'border-navy bg-navy text-white shadow-md'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            {f}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                                filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                                {counts[f] || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Search questions..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-accent transition-all font-medium text-navy"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-accent mb-4" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading discussions...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-6 rounded-2xl flex items-center shadow-sm">
                    <AlertCircle className="w-6 h-6 mr-3 text-rose-500" />
                    <p className="font-bold">{error}</p>
                </div>
            ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="bg-gray-50 p-6 rounded-full mb-4">
                        <MessageCircle className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-navy mb-2">No questions found</h3>
                    <p className="text-gray-500">Looks quiet here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuestions.map(q => {
                        const isExpanded = expandedQid === q.question_id;
                        const isAnswered = q.status?.toLowerCase() === 'answered';
                        
                        return (
                            <div 
                                key={q.question_id} 
                                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                                    isExpanded ? 'shadow-xl border-teal-accent/30 ring-4 ring-teal-accent/5' : 'shadow-sm border-gray-100 hover:border-gray-300 hover:shadow-md'
                                }`}
                            >
                                {/* Card Header (Clickable) */}
                                <div 
                                    className="p-6 cursor-pointer flex items-start justify-between"
                                    onClick={() => toggleExpand(q)}
                                >
                                    <div className="pr-6">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                                                isAnswered ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                                            }`}>
                                                {isAnswered ? 'Answered' : 'Unanswered'}
                                            </span>
                                            <span className="flex items-center text-xs font-bold text-gray-400">
                                                <Clock className="w-3.5 h-3.5 mr-1" />
                                                {timeAgo(q.asked_at)}
                                            </span>
                                        </div>
                                        <h3 className={`text-lg font-bold text-navy line-clamp-2 ${isExpanded ? 'line-clamp-none' : ''}`}>
                                            {q.question_text}
                                        </h3>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-xl text-gray-400">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/30">
                                        <div className="mt-6 flex flex-col space-y-4">
                                            
                                            {/* AI Section */}
                                            {!isAnswered && (
                                                <div className="bg-navy rounded-xl p-5 shadow-inner">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex items-center text-teal-accent">
                                                                <Sparkles className="w-5 h-5 mr-2" />
                                                                <span className="font-bold text-sm tracking-wide">AI Teaching Assistant</span>
                                                            </div>
                                                            {q.ai_suggestion && (
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                                                                    q.used_material 
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                }`}>
                                                                    {q.used_material ? 'Course Material' : 'General Knowledge'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            {(!q.ai_suggestion || q.ai_suggestion.trim() === '') ? (
                                                                <button 
                                                                    onClick={() => handleSuggestAnswer(q)}
                                                                    disabled={generating === q.question_id}
                                                                    className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    {generating === q.question_id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                                    Generate Idea
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleSuggestAnswer(q)}
                                                                    disabled={generating === q.question_id}
                                                                    className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all tracking-wide uppercase"
                                                                >
                                                                    {generating === q.question_id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                                                                    Regenerate Idea
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {q.ai_suggestion && (
                                                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                                                            {q.ai_suggestion}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Final Answer Input */}
                                            <div className="space-y-3 pt-2">
                                                <label className="text-sm font-black text-navy tracking-tight">
                                                    {isAnswered ? "Your Saved Answer" : "Draft Your Answer"}
                                                </label>
                                                <textarea
                                                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-navy text-sm focus:ring-2 focus:ring-teal-accent focus:border-transparent outline-none transition-all resize-y min-h-[120px]"
                                                    placeholder="Type your answer here..."
                                                    value={editAnswers[q.question_id] || ''}
                                                    onChange={(e) => setEditAnswers(prev => ({...prev, [q.question_id]: e.target.value}))}
                                                    readOnly={isAnswered} // Make readonly if already answered, or allow edits? Let's allow edits.
                                                />
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        onClick={() => handlePostAnswer(q.question_id)}
                                                        disabled={posting === q.question_id}
                                                        className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${
                                                            isAnswered 
                                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                                                            : 'bg-navy hover:bg-navy/90 text-white shadow-navy/20'
                                                        }`}
                                                    >
                                                        {posting === q.question_id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : isAnswered ? (
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                        ) : (
                                                            <Send className="w-4 h-4 mr-2" />
                                                        )}
                                                        {isAnswered ? "Update Answer" : "Post Answer"}
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Discussions;
