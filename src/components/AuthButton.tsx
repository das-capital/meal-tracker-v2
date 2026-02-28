import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

export const AuthButton = () => {
    const { user, signIn, signOut } = useAuth();

    if (user) {
        return (
            <div className="flex items-center gap-3 bg-zinc-900/50 rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-white/10 shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <span className="text-emerald-400 text-sm font-bold">
                                {user.displayName?.[0] ?? '?'}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{user.displayName}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/5 text-xs font-medium text-zinc-400 active:scale-95 transition-transform shrink-0"
                >
                    <LogOut className="w-3 h-3" />
                    Sign out
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={signIn}
            className="w-full h-12 bg-white rounded-xl flex items-center justify-center gap-2.5 font-medium text-zinc-800 active:scale-95 transition-transform text-sm"
        >
            <GoogleIcon />
            Sign in with Google
        </button>
    );
};
