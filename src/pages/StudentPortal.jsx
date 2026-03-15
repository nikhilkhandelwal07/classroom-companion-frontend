import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    MessageCircle, Sparkles, Send, Loader2, 
    Star, MessageSquare, CheckCircle, AlertCircle,
    ChevronRight
} from 'lucide-react';

const StudentPortal = ({ showToast }) => {
    const { courseId, divisionId } = useParams();
    const [activeTab, setActiveTab] = useState('ask'); // 'ask' or 'feedback'
    const [question, setQuestion] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    const [answeredQuestions, setAnsweredQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    // Fetch answered questions
    const fetchAnsweredQuestions = async () => {
        setLoadingQuestions(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/student-questions?course_id=${courseId}&division=${divisionId}`);
            const data = await res.json();
            if (res.ok) {
                setAnsweredQuestions(data.questions || []);
            }
        } catch (err) {
            console.error("Failed to fetch questions", err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ask') {
            fetchAnsweredQuestions();
        }
    }, [activeTab, courseId, divisionId]);

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/student-question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    division: divisionId,
                    question: question
                })
            });
            if (res.ok) {
                setSubmitted(true);
                setQuestion('');
                setTimeout(() => setSubmitted(false), 5000);
            } else {
                showToast("Failed to submit question", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            showToast("Please select a rating", "error");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/student-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    division: divisionId,
                    rating: rating,
                    comment: feedbackComment
                })
            });
            if (res.ok) {
                setFeedbackSubmitted(true);
                setRating(0);
                setFeedbackComment('');
                setTimeout(() => setFeedbackSubmitted(false), 5000);
            } else {
                showToast("Failed to submit feedback", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full py-8 px-4 sm:px-6">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-navy p-2 rounded-xl">
                            <Sparkles className="w-6 h-6 text-teal-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-navy tracking-tight">Classroom Companion</h1>
                            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                <span>{courseId}</span>
                                <ChevronRight className="w-3 h-3 mx-1" />
                                <span className="text-teal-accent">Division {divisionId}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-200/50 rounded-2xl mb-8">
                    <button 
                        onClick={() => setActiveTab('ask')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'ask' 
                            ? 'bg-white text-navy shadow-sm' 
                            : 'text-gray-500 hover:text-navy hover:bg-white/50'
                        }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Ask a Question
                    </button>
                    <button 
                        onClick={() => setActiveTab('feedback')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'feedback' 
                            ? 'bg-white text-navy shadow-sm' 
                            : 'text-gray-500 hover:text-navy hover:bg-white/50'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Submit Feedback
                    </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'ask' ? (
                        <>
                            {/* Question Form */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                {submitted ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="bg-emerald-50 p-4 rounded-full mb-4">
                                            <CheckCircle className="w-12 h-12 text-emerald-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-navy mb-2">Submitted!</h3>
                                        <p className="text-gray-500">Your question has been submitted. Check back later for the answer.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleQuestionSubmit} className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-black text-navy uppercase tracking-wider">Your Question</label>
                                            <textarea 
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                placeholder="Type your question about this course..."
                                                className="w-full min-h-[120px] p-4 bg-gray-50 border border-transparent focus:bg-white focus:border-teal-accent/30 focus:ring-4 focus:ring-teal-accent/5 rounded-2xl outline-none transition-all font-medium text-navy resize-none"
                                                required
                                            />
                                        </div>
                                        <button 
                                            type="submit"
                                            disabled={submitting || !question.trim()}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-navy text-white rounded-2xl font-bold hover:bg-navy/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-navy/10"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            Submit Question
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Answered Questions */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-black text-navy flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    Answered Questions
                                </h2>
                                
                                {loadingQuestions ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                                    </div>
                                ) : answeredQuestions.length === 0 ? (
                                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
                                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageCircle className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-medium">No answered questions yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {answeredQuestions.map((q, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                                                <p className="text-gray-400 font-bold text-sm leading-relaxed">{q.question}</p>
                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                    <p className="text-navy font-bold leading-relaxed">{q.faculty_answer}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Feedback Form */
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            {feedbackSubmitted ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <div className="bg-emerald-50 p-4 rounded-full mb-4">
                                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-navy mb-2">Thank you!</h3>
                                    <p className="text-gray-500">Your feedback has been recorded.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleFeedbackSubmit} className="space-y-8">
                                    <div className="space-y-4 text-center">
                                        <label className="text-sm font-black text-navy uppercase tracking-wider block">Rate this session</label>
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    className="transition-transform active:scale-95"
                                                >
                                                    <Star 
                                                        className={`w-10 h-10 ${
                                                            (hoverRating || rating) >= star 
                                                            ? 'fill-amber-400 text-amber-400' 
                                                            : 'text-gray-200'
                                                        } transition-colors`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-navy uppercase tracking-wider">Comments (Optional)</label>
                                        <textarea 
                                            value={feedbackComment}
                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                            placeholder="Share your thoughts about this session..."
                                            className="w-full min-h-[120px] p-4 bg-gray-50 border border-transparent focus:bg-white focus:border-teal-accent/30 focus:ring-4 focus:ring-teal-accent/5 rounded-2xl outline-none transition-all font-medium text-navy resize-none"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={submitting || rating === 0}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-navy text-white rounded-2xl font-bold hover:bg-navy/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-navy/10"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Submit Feedback
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentPortal;
