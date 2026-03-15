import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, ClipboardCheck, BookOpen, MessageSquare, User, LogOut, Users, MessageCircle } from 'lucide-react';

const Sidebar = ({ userEmail, onLogout, token, courses }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread questions count
    useEffect(() => {
        if (!token || !courses || courses.length === 0) return;

        const fetchUnreadCount = async () => {
            try {
                // To keep it simple, we'll fetch for the first course/division for now, 
                // or we could aggregate if the backend supported it. 
                // Since the UI currently selects one course/div at a time, let's just 
                // get the first one to show proof of concept for the badge.
                // Ideally, a new endpoint like /questions/unread-count?all=true would be better.
                // For now, we'll fetch unanswered for the first active course.
                const firstCourse = courses[0];
                const res = await fetch(`${import.meta.env.VITE_API_URL}/questions?course_id=${firstCourse.course_id}&division=${firstCourse.division}&status=unanswered`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.questions?.length || 0);
                }
            } catch (err) {
                console.error("Failed to fetch unread questions count", err);
            }
        };

        fetchUnreadCount();
        // Option to poll every minute:
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [token, courses]);


    const navItems = [
        { name: 'Attendance', path: '/attendance', icon: ClipboardCheck },
        { name: 'Participation', path: '/participation', icon: Users },
        { name: 'Session Material', path: '/material', icon: BookOpen },
        { name: 'Discussions', path: '/discussions', icon: MessageCircle, badge: unreadCount },
        { name: 'Feedback', path: '/feedback', icon: MessageSquare },
    ];

    return (
        <div className="fixed left-0 top-0 flex flex-col h-screen w-72 bg-navy text-white shadow-2xl z-20 hidden md:flex overflow-y-auto">
            <div className="flex items-center px-6 h-24 border-b border-white/10 shrink-0">
                <GraduationCap className="w-10 h-10 text-teal-accent mr-3" />
                <h1 className="text-xl font-extrabold tracking-tight leading-tight">Classroom<br />Companion</h1>
            </div>

            <nav className="flex-grow py-8 overflow-y-auto">
                <p className="px-6 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">Main Menu</p>
                <ul>
                    {navItems.map((item) => (
                        <li key={item.name} className="mb-1 px-3">
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-teal-accent text-white shadow-lg shadow-teal-accent/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                <div className="flex items-center">
                                    <item.icon className="w-5 h-5 mr-3" />
                                    <span className="font-medium">{item.name}</span>
                                </div>
                                {item.badge > 0 && (
                                    <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-6 bg-white/5 border-t border-white/10">
                <div className="flex items-center space-x-3 mb-6 overflow-hidden">
                    <div className="bg-teal-accent/20 p-2 rounded-lg">
                        <User className="w-5 h-5 text-teal-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty</p>
                        <p className="text-sm font-medium truncate text-white" title={userEmail}>
                            {userEmail?.split('@')[0].replace('.', ' ') || 'Faculty Member'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/50 transition-all duration-200 group"
                >
                    <LogOut className="w-5 h-5 mr-3 group-hover:text-rose-500" />
                    <span className="font-bold">Log Out</span>
                </button>
                <p className="text-[10px] text-gray-500 text-center font-medium uppercase tracking-tighter">
                    © 2026 SPJIMR Faculty Dashboard
                </p>
            </div>
        </div>
    );
};

export default Sidebar;
