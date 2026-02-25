import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Upload,
    Link as LinkIcon,
    FileText,
    Sparkles,
    Calendar,
    MessageSquare,
    Plus,
    X,
    Send,
    Download,
    CheckCircle,
    Loader2,
    ChevronRight,
    Search,
    Mail,
    Edit2,
    Save
} from 'lucide-react';

const SessionMaterial = ({ token, courses, showToast }) => {
    const [activeTab, setActiveTab] = useState('materials');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');

    // Materials State
    const [files, setFiles] = useState([]);
    const [urls, setUrls] = useState([]);
    const [urlInput, setUrlInput] = useState('');
    const [uploading, setUploading] = useState(false);

    // AI Summary State
    const [summaryData, setSummaryData] = useState(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);

    // Session Plan State
    const [sessionPlan, setSessionPlan] = useState(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [isEditingPlan, setIsEditingPlan] = useState(false);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef(null);

    // Modal State
    const [showMailModal, setShowMailModal] = useState(false);
    const [sendingMail, setSendingMail] = useState(false);
    const [mailStatus, setMailStatus] = useState(null); // {type: 'success'|'error', message: ''}
    const [mailForm, setMailForm] = useState({
        divisions: [],
        subject: '',
        message: '',
        includeSummary: true
    });

    // Handle course/division derived data
    const uniqueCourses = useMemo(() => {
        const map = new Map();
        courses.forEach(c => map.set(c.course_id, c.course_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [courses]);

    const currentCourseName = useMemo(() => {
        return uniqueCourses.find(c => c.id === selectedCourseId)?.name || '';
    }, [selectedCourseId, uniqueCourses]);

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
        if (availableDivisions.length > 0 && !selectedDivision) {
            setSelectedDivision(availableDivisions[0]);
        }
    }, [uniqueCourses, availableDivisions, selectedCourseId, selectedDivision]);

    useEffect(() => {
        if (selectedCourseId) {
            setMailForm(prev => ({ ...prev, subject: `Session Material - ${currentCourseName}` }));
        }
    }, [currentCourseName]);

    // NEW: Fetch materials from server to sync UI
    const fetchMaterials = async (cid, div) => {
        if (!cid || !div) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/list-materials?course_id=${cid}&division=${div}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
                setUrls(data.urls || []);
            }
        } catch (err) {
            console.error("UI Sync failed", err);
        }
    };

    // Track the last valid session context to detect actual transitions
    const lastContextRef = useRef({ courseId: '', division: '' });

    // AUTO-CLEAR on Context Change (Division or Course)
    useEffect(() => {
        const hasCurrent = selectedCourseId && selectedDivision;
        const hasPrev = lastContextRef.current.courseId && lastContextRef.current.division;

        // Condition for clearing: We are moving from one valid context to a DIFFERENT valid context
        const isContextSwitch = hasPrev && hasCurrent && (
            lastContextRef.current.courseId !== selectedCourseId ||
            lastContextRef.current.division !== selectedDivision
        );

        if (isContextSwitch) {
            const clearPreviousSession = async () => {
                const prevCid = lastContextRef.current.courseId;
                const prevDiv = lastContextRef.current.division;

                try {
                    // Clear the PREVIOUS context on the server
                    await fetch(`${import.meta.env.VITE_API_URL}/clear-material`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            course_id: prevCid,
                            division: prevDiv
                        })
                    });
                } catch (err) {
                    console.error("Auto-clear background request failed", err);
                }

                // Reset current local state as it's a new session
                setFiles([]);
                setUrls([]);
                setSummaryData(null);
                setSessionPlan(null);
                setMessages([]);
            };

            clearPreviousSession();
        } else if (hasCurrent) {
            // If the context is valid but hasn't changed (e.g., initial mount or simple tab return)
            // fetch existing materials to ensure UI is in sync
            fetchMaterials(selectedCourseId, selectedDivision);
        }

        // Always update the reference if we have a valid context
        if (hasCurrent) {
            lastContextRef.current = { courseId: selectedCourseId, division: selectedDivision };
        }
    }, [selectedCourseId, selectedDivision, token]);

    // UI Helpers
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeTab === 'chat') scrollToBottom();
    }, [messages, activeTab]);

    // Handlers
    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        setUploading(true);

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => formData.append('files', file));
            formData.append('course_id', selectedCourseId);
            formData.append('division', selectedDivision);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/upload-material`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                await fetchMaterials(selectedCourseId, selectedDivision);
                showToast("Files uploaded successfully!", "success");
            } else {
                showToast("Upload failed", "error");
            }
        } catch (err) {
            showToast("Connection error during upload", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleAddUrl = async () => {
        if (!urlInput) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/add-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: urlInput,
                    course_id: selectedCourseId,
                    division: selectedDivision
                })
            });
            if (res.ok) {
                await fetchMaterials(selectedCourseId, selectedDivision);
                setUrlInput('');
                showToast("URL added successfully!", "success");
            } else {
                showToast("Failed to add URL", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        }
    };

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        setActiveTab('summary');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/generate-summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    division: selectedDivision
                })
            });
            if (res.ok) {
                const data = await res.json();
                setSummaryData(data);
                showToast("Summary generated!", "success");
                return data;
            } else {
                const errorData = await res.json();
                showToast(errorData.detail || "Summary generation failed", "error");
                return null;
            }
        } catch (err) {
            showToast("Connection error during summary generation", "error");
            return null;
        } finally {
            setGeneratingSummary(false);
        }
    };

    const handleGeneratePlan = async () => {
        setIsEditingPlan(false);
        setGeneratingPlan(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/generate-session-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    division: selectedDivision
                })
            });
            if (res.ok) {
                const data = await res.json();
                setSessionPlan(data);
                setActiveTab('plan');
                showToast("Session plan ready!", "success");
            } else {
                const errorData = await res.json();
                showToast(errorData.detail || "Plan generation failed", "error");
            }
        } catch (err) {
            showToast("Connection error during plan generation", "error");
        } finally {
            setGeneratingPlan(false);
        }
    };

    const handleSendMessage = async (textInput) => {
        const text = textInput || chatInput;
        if (!text) return;

        const newMessages = [...messages, { role: 'faculty', content: text }];
        setMessages(newMessages);
        setChatInput('');
        setSendingChat(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: text,
                    course_id: selectedCourseId,
                    division: selectedDivision,
                    history: messages
                })
            });
            if (res.ok) {
                const data = await res.json();
                setMessages([...newMessages, { role: 'ai', content: data.answer }]);
            }
        } catch (err) {
            console.error("Chat failed", err);
        } finally {
            setSendingChat(false);
        }
    };

    const toggleMailModal = () => {
        setShowMailModal(!showMailModal);
        setMailStatus(null);
    };

    const handleSendMail = async () => {
        if (mailForm.divisions.length === 0) {
            setMailStatus({ type: 'error', message: 'Please select at least one division.' });
            return;
        }

        let currentSummary = summaryData;

        if (mailForm.includeSummary && !currentSummary) {
            setSendingMail(true);
            setMailStatus({ type: 'info', message: 'Generating AI summary before sending...' });
            currentSummary = await handleGenerateSummary();
            if (!currentSummary) {
                setMailStatus({ type: 'error', message: 'Failed to generate summary. Cannot proceed with summary inclusion.' });
                setSendingMail(false);
                return;
            }
        }

        setSendingMail(true);
        setMailStatus(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/email-material`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    divisions: mailForm.divisions,
                    subject: mailForm.subject,
                    message: mailForm.message,
                    summary: mailForm.includeSummary ? currentSummary : null,
                    filenames: files,
                    urls: urls
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMailStatus({
                    type: 'success',
                    message: `Successfully sent ${data.sent} notification emails!`
                });
                showToast(`Sent ${data.sent} emails!`, 'success');
                // Close after delay
                setTimeout(() => setShowMailModal(false), 2000);
            } else {
                setMailStatus({ type: 'error', message: 'Failed to send emails.' });
                showToast("Failed to send emails", "error");
            }
        } catch (err) {
            setMailStatus({ type: 'error', message: 'Error connecting to server.' });
            showToast("Connection error", "error");
        } finally {
            setSendingMail(false);
        }
    };

    const handleClearMaterial = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/clear-material`, {
                method: 'POST', // Use POST as requested
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    division: selectedDivision
                })
            });
            if (res.ok) {
                setFiles([]);
                setUrls([]);
                setSummaryData(null);
                setSessionPlan(null);
                setMessages([]);
                showToast("Session cleared — ready for new upload", "success");
                return true;
            } else {
                showToast("Failed to clear session", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        }
        return false;
    };

    const handleRemoveFile = async (idx) => {
        const fileName = files[idx];
        const newFiles = files.filter((_, i) => i !== idx);
        setFiles(newFiles);

        try {
            await fetch(`${import.meta.env.VITE_API_URL}/remove-material?course_id=${selectedCourseId}&division=${selectedDivision}&source=${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Remove file backend failed", err);
        }

        // If it was the last item, clear backend completely just in case
        if (newFiles.length === 0 && urls.length === 0) {
            await handleClearMaterial();
        }
    };

    const handleRemoveUrl = async (idx) => {
        const urlName = urls[idx];
        const newUrls = urls.filter((_, i) => i !== idx);
        setUrls(newUrls);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/remove-material?course_id=${selectedCourseId}&division=${selectedDivision}&source=${encodeURIComponent(urlName)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Reference removed", "success");
            } else {
                showToast("Failed to remove from server", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        }

        // If it was the last item, clear backend
        if (newUrls.length === 0 && files.length === 0) {
            await handleClearMaterial();
        }
    };

    const handleBlockChange = (idx, field, value) => {
        const newBlocks = [...sessionPlan.blocks];
        newBlocks[idx] = { ...newBlocks[idx], [field]: value };
        setSessionPlan({ ...sessionPlan, blocks: newBlocks });
    };

    const handleQuestionChange = (blockIdx, qIdx, value) => {
        const newBlocks = [...sessionPlan.blocks];
        const newQuestions = [...newBlocks[blockIdx].questions];
        newQuestions[qIdx] = value;
        newBlocks[blockIdx] = { ...newBlocks[blockIdx], questions: newQuestions };
        setSessionPlan({ ...sessionPlan, blocks: newBlocks });
    };

    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500 w-full max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Session Material</h1>
                    <p className="text-gray-500 flex items-center mt-1">
                        <span className="font-semibold">{currentCourseName}</span>
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
                            setSelectedDivision('');
                        }}
                    >
                        {uniqueCourses.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-accent outline-none font-medium"
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                    >
                        {availableDivisions.map(div => (
                            <option key={div} value={div}>Div {div}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-6">
                {[
                    { id: 'materials', icon: FileText, label: 'Materials' },
                    { id: 'summary', icon: Sparkles, label: 'AI Summary' },
                    { id: 'plan', icon: Calendar, label: 'Session Plan' },
                    { id: 'chat', icon: MessageSquare, label: 'Chat' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id
                            ? 'border-teal-accent text-teal-accent'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white p-8 rounded-b-2xl shadow-sm border border-gray-100 min-h-[500px]">
                {/* MATERIALS TAB */}
                {activeTab === 'materials' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2">
                        {/* Drag & Drop */}
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-teal-accent transition-colors group relative cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleFileUpload({ target: { files: e.dataTransfer.files } });
                            }}
                        >
                            <input
                                type="file"
                                multiple
                                accept=".pdf"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                            />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-teal-50 text-teal-accent rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-navy">Drag & Drop PDFs here</h3>
                                <p className="text-gray-400 mt-1">or click to browse from your computer</p>
                            </div>
                        </div>

                        {/* File & URL Lists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* File List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-navy flex items-center space-x-2">
                                        <FileText className="w-5 h-5 text-gray-400" />
                                        <span>Uploaded Documents</span>
                                    </h4>
                                    {(files.length > 0 || urls.length > 0) && (
                                        <button
                                            onClick={handleClearMaterial}
                                            className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-tighter flex items-center space-x-1 p-1 hover:bg-rose-50 rounded"
                                        >
                                            <X className="w-3 h-3" />
                                            <span>Clear Context</span>
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {files.length === 0 && <p className="text-sm text-gray-300 italic">No files uploaded yet.</p>}
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <FileText className="w-4 h-4 text-navy" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{file}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFile(idx)}
                                                className="text-gray-400 hover:text-rose-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* URL Input */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-navy flex items-center space-x-2">
                                    <LinkIcon className="w-5 h-5 text-gray-400" />
                                    <span>Add Web Links</span>
                                </h4>
                                <div className="flex space-x-2">
                                    <input
                                        type="url"
                                        placeholder="https://example.com/material"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-accent text-sm"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAddUrl}
                                        className="bg-navy text-white p-2 rounded-xl hover:bg-navy/90"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {urls.length === 0 && <p className="text-sm text-gray-300 italic">No URLs added yet.</p>}
                                    {urls.map((url, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            <span className="text-xs text-blue-500 truncate mr-4">{url}</span>
                                            <button
                                                onClick={() => handleRemoveUrl(idx)}
                                                className="text-gray-400 hover:text-rose-500 flex-shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-8 flex flex-wrap gap-4 border-t border-gray-100">
                            <button
                                onClick={handleGenerateSummary}
                                disabled={generatingSummary || (files.length === 0 && urls.length === 0)}
                                className="flex items-center space-x-2 bg-gradient-to-r from-teal-accent to-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
                            >
                                <Sparkles className="w-5 h-5" />
                                <span>Generate AI Summary</span>
                            </button>
                            <button
                                onClick={toggleMailModal}
                                className="flex items-center space-x-2 bg-white border-2 border-navy text-navy px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                            >
                                <Mail className="w-5 h-5" />
                                <span>Mail to Division</span>
                            </button>
                            <button
                                onClick={handleClearMaterial}
                                className="flex items-center space-x-2 bg-rose-50 border-2 border-rose-200 text-rose-600 px-8 py-3 rounded-xl font-bold hover:bg-rose-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                                <span>Clear Session</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* AI SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2">
                        {generatingSummary ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                                <Loader2 className="w-12 h-12 text-teal-accent animate-spin" />
                                <p className="text-gray-500 font-bold">Synthesizing material...</p>
                            </div>
                        ) : summaryData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Summary */}
                                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 h-full">
                                    <h4 className="text-xl font-extrabold text-blue-900 mb-6 border-b border-blue-200 pb-2">Session Summary</h4>
                                    <ul className="space-y-4 text-blue-800">
                                        {Array.isArray(summaryData.summary) ? summaryData.summary.map((point, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                                                <span className="text-sm font-medium leading-relaxed">{point}</span>
                                            </li>
                                        )) : <p>{summaryData.summary}</p>}
                                    </ul>
                                </div>

                                {/* Key Concepts */}
                                <div className="bg-teal-50 border border-teal-100 rounded-3xl p-8 h-full">
                                    <h4 className="text-xl font-extrabold text-teal-900 mb-6 border-b border-teal-200 pb-2">Key Concepts</h4>
                                    <div className="space-y-6">
                                        {summaryData.key_concepts?.map((c, idx) => (
                                            <div key={idx} className="space-y-1">
                                                <p className="font-extrabold text-teal-950 flex items-center">
                                                    <span className="w-6 h-6 bg-teal-200 rounded-lg text-[10px] flex items-center justify-center mr-2">{idx + 1}</span>
                                                    {c.concept}
                                                </p>
                                                <p className="text-xs text-teal-800 font-medium pl-8">{c.explanation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Discussion Prompts */}
                                <div className="bg-navy text-white rounded-3xl p-8 h-full shadow-xl shadow-navy/20">
                                    <h4 className="text-xl font-extrabold mb-6 border-b border-white/10 pb-2">Discussion Prompts</h4>
                                    <ol className="space-y-6 list-decimal pl-4">
                                        {summaryData.discussion_prompts?.map((prompt, idx) => (
                                            <li key={idx} className="text-sm font-bold text-teal-100/90 leading-relaxed italic">
                                                "{prompt}"
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 italic">
                                No summary generated. Go to Materials tab to start.
                            </div>
                        )}
                    </div>
                )}

                {/* SESSION PLAN TAB */}
                {activeTab === 'plan' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleGeneratePlan}
                                    disabled={generatingPlan}
                                    className="flex items-center space-x-2 bg-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-navy/90 disabled:opacity-50"
                                >
                                    <Calendar className="w-4 h-4" />
                                    <span>{generatingPlan ? 'Drafting...' : 'Re-Generate Plan'}</span>
                                </button>
                                {sessionPlan && (
                                    <button
                                        onClick={() => setIsEditingPlan(!isEditingPlan)}
                                        className={`flex items-center space-x-2 px-6 py-2 rounded-xl font-bold transition-colors ${isEditingPlan ? 'bg-teal-accent text-white' : 'bg-gray-100 text-navy hover:bg-gray-200'
                                            }`}
                                    >
                                        {isEditingPlan ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                        <span>{isEditingPlan ? 'Save Plan' : 'Edit Plan'}</span>
                                    </button>
                                )}
                            </div>
                            {sessionPlan && (
                                <button
                                    onClick={handleDownloadPdf}
                                    className="flex items-center space-x-2 text-navy hover:text-teal-accent font-bold"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download PDF</span>
                                </button>
                            )}
                        </div>

                        {generatingPlan ? (
                            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                                <Loader2 className="w-10 h-10 text-navy animate-spin" />
                                <p className="text-gray-500">Mapping out session blocks...</p>
                            </div>
                        ) : sessionPlan ? (
                            <div className="space-y-12">
                                <div className="text-center">
                                    {isEditingPlan ? (
                                        <input
                                            type="text"
                                            className="text-2xl font-black text-navy text-center w-full bg-transparent border-b-2 border-teal-accent focus:outline-none"
                                            value={sessionPlan.session_title}
                                            onChange={(e) => setSessionPlan({ ...sessionPlan, session_title: e.target.value })}
                                        />
                                    ) : (
                                        <h4 className="text-2xl font-black text-navy">{sessionPlan.session_title}</h4>
                                    )}
                                    <div className="h-1 w-20 bg-teal-accent mx-auto mt-4 rounded-full" />
                                </div>
                                <div className="relative border-l-2 border-gray-100 ml-8 pl-8 space-y-8 py-4">
                                    {sessionPlan.blocks?.map((block, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className="absolute -left-[41px] top-0 w-4 h-4 bg-white border-2 border-teal-accent rounded-full z-10 group-hover:scale-125 transition-transform" />
                                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    {isEditingPlan ? (
                                                        <input
                                                            type="text"
                                                            className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2 py-1 rounded focus:outline-none"
                                                            value={block.duration}
                                                            onChange={(e) => handleBlockChange(idx, 'duration', e.target.value)}
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{block.duration}</span>
                                                    )}
                                                    <div className="px-2 py-0.5 bg-gray-50 text-[10px] font-bold rounded uppercase">{block.type?.replace('_', ' ')}</div>
                                                </div>
                                                {isEditingPlan ? (
                                                    <input
                                                        type="text"
                                                        className="text-lg font-extrabold text-navy mb-3 w-full bg-transparent border-b border-gray-100 focus:border-teal-accent focus:outline-none"
                                                        value={block.title}
                                                        onChange={(e) => handleBlockChange(idx, 'title', e.target.value)}
                                                    />
                                                ) : (
                                                    <h5 className="text-lg font-extrabold text-navy mb-3">{block.title}</h5>
                                                )}
                                                {isEditingPlan ? (
                                                    <textarea
                                                        className="text-sm text-gray-600 mb-4 w-full bg-transparent border border-gray-100 rounded-lg p-2 focus:border-teal-accent focus:outline-none resize-none"
                                                        rows={3}
                                                        value={block.activity}
                                                        onChange={(e) => handleBlockChange(idx, 'activity', e.target.value)}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-600 mb-4">{block.activity}</p>
                                                )}
                                                {block.questions && block.questions.length > 0 && (
                                                    <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                                                        <p className="text-[10px] font-black text-teal-800 uppercase mb-2 tracking-tighter">Teaching Cues / Questions</p>
                                                        <ul className="space-y-2">
                                                            {block.questions.map((q, qidx) => (
                                                                <li key={qidx} className="text-sm text-teal-900 flex items-start italic">
                                                                    <ChevronRight className="w-3 h-3 text-teal-400 mt-1 mr-2 flex-shrink-0" />
                                                                    {isEditingPlan ? (
                                                                        <input
                                                                            type="text"
                                                                            className="w-full bg-transparent border-b border-teal-200/50 focus:outline-none"
                                                                            value={q}
                                                                            onChange={(e) => handleQuestionChange(idx, qidx, e.target.value)}
                                                                        />
                                                                    ) : (
                                                                        <span>"{q}"</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-20 text-gray-300">Generate a plan to see timeline.</div>
                        )}
                    </div>
                )}

                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-[600px] animate-in slide-in-from-bottom-2">
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-2xl mb-6 shadow-inner border border-gray-200">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-8 h-8 text-teal-accent" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-navy">AI Teaching Assistant</h4>
                                        <p className="text-xs text-gray-400">Ask me anything about the uploaded materials</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'faculty' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-6 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${msg.role === 'faculty'
                                        ? 'bg-navy text-white rounded-br-none'
                                        : 'bg-white border-2 border-teal-50 text-gray-700 rounded-bl-none border-l-4 border-l-teal-accent'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {sendingChat && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl flex space-x-1">
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    'What are the hardest concepts here?',
                                    'Generate a quick quiz',
                                    'What should students know before this class?'
                                ].map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSendMessage(q)}
                                        className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-xs font-bold hover:bg-teal-100 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Type your question..."
                                    className="flex-1 px-6 h-12 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-accent text-sm"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    className="bg-navy text-white px-6 rounded-2xl hover:bg-navy/90 active:scale-95 transition-all shadow-lg shadow-navy/20"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mail Modal */}
            {
                showMailModal && (
                    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-teal-50 text-teal-accent rounded-2xl">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black text-navy tracking-tight">Mail Session Material</h3>
                                </div>
                                <button onClick={toggleMailModal} className="text-gray-400 hover:text-navy transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {mailStatus && (
                                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center space-x-2 ${mailStatus.type === 'success' ? 'bg-teal-50 text-teal-700' :
                                        mailStatus.type === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                        {mailStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                            mailStatus.type === 'info' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                                <X className="w-5 h-5" />}
                                        <span>{mailStatus.message}</span>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Divisions</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['A', 'B', 'C', 'D', 'E'].map(div => (
                                            <label key={div} className="flex items-center space-x-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-gray-300 text-teal-accent focus:ring-teal-accent"
                                                    checked={mailForm.divisions.includes(div)}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...mailForm.divisions, div]
                                                            : mailForm.divisions.filter(d => d !== div);
                                                        setMailForm({ ...mailForm, divisions: updated });
                                                    }}
                                                />
                                                <span className="font-bold text-navy group-hover:text-teal-accent">Div {div}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Subject</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-accent font-bold text-navy"
                                        value={mailForm.subject}
                                        onChange={(e) => setMailForm({ ...mailForm, subject: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Message Body</label>
                                    <textarea
                                        rows="5"
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-accent text-sm font-medium"
                                        placeholder="Write your message to students here..."
                                        value={mailForm.message}
                                        onChange={(e) => setMailForm({ ...mailForm, message: e.target.value })}
                                    />
                                </div>

                                {/* Include Summary Toggle */}
                                <div className="flex items-center justify-between p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white rounded-lg text-teal-accent shadow-sm">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-navy">Include AI Summary</p>
                                            <p className="text-[10px] text-teal-700 font-medium">Auto-generate 5-point summary from materials</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setMailForm(prev => ({ ...prev, includeSummary: !prev.includeSummary }))}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${mailForm.includeSummary ? 'bg-teal-accent' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mailForm.includeSummary ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-8 flex justify-end space-x-4">
                                <button onClick={toggleMailModal} className="px-6 py-2 font-bold text-gray-400 hover:text-navy">Cancel</button>
                                <button
                                    onClick={handleSendMail}
                                    disabled={sendingMail}
                                    className="bg-teal-accent text-white px-10 py-3 rounded-2xl font-black shadow-lg shadow-teal-accent/20 hover:scale-[1.05] transition-transform active:scale-95 disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {sendingMail && <Loader2 className="w-5 h-5 animate-spin" />}
                                    <span>{sendingMail ? 'Sending...' : 'Send to Students'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SessionMaterial;
