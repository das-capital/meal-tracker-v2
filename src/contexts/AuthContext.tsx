import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { setCurrentUser } from '../lib/db';
import { mergeLocalDataToFirestore } from '../lib/merge';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Set routing layer backend BEFORE components render with new auth state
            setCurrentUser(firebaseUser?.uid ?? null);

            if (firebaseUser) {
                // One-time migration: local IDB → Firestore (no-ops if already done)
                await mergeLocalDataToFirestore(firebaseUser.uid);
            }

            setUser(firebaseUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const signOut = async () => {
        setCurrentUser(null);
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
