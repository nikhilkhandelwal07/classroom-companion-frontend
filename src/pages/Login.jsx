import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2 } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                onLoginSuccess(data);
                navigate('/attendance');
            } else {
                setError(data.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('Failed to connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-navy p-3 rounded-2xl mb-4 shadow-lg">
                        <GraduationCap className="w-12 h-12 text-teal-accent" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-navy text-center">Classroom Companion</h2>
                    <p className="text-gray-500 mt-2">SPJIMR Faculty Dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                            Faculty Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="faculty@spjimr.org"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-teal-accent/20 focus:border-teal-accent transition-all duration-200 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-teal-accent/20 focus:border-teal-accent transition-all duration-200 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-navy hover:bg-navy/90 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg transform active:scale-[0.98] flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <span>Login to Dashboard</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        Secure Access for Authorized Faculty Members Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
