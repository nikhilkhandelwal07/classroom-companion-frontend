import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, ClipboardCheck, BookOpen, MessageSquare, User, LogOut } from 'lucide-react';

const Sidebar = ({ userEmail, onLogout }) => {
    const navItems = [
        { name: 'Attendance', path: '/attendance', icon: ClipboardCheck },
        { name: 'Session Material', path: '/material', icon: BookOpen },
        { name: 'Feedback', path: '/feedback', icon: MessageSquare },
    ];

    return (
        <div className="fixed left-0 top-0 flex flex-col h-screen w-72 bg-navy text-white shadow-2xl z-20 hidden md:flex overflow-y-auto">
            <div className="flex items-center px-6 h-24 border-b border-white/10">
                <GraduationCap className="w-10 h-10 text-teal-accent mr-3" />
                <h1 className="text-xl font-extrabold tracking-tight leading-tight">Classroom<br />Companion</h1>
            </div>

            <nav className="flex-grow py-8">
                <p className="px-6 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Main Menu</p>
                <ul>
                    {navItems.map((item) => (
                        <li key={item.name} className="mb-1 px-3">
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-teal-accent text-white shadow-lg shadow-teal-accent/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                <span className="font-medium">{item.name}</span>
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
