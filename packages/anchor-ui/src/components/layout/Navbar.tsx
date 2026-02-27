import { useState } from 'react';
import { navigate } from '../../utils/routing';
import { Button } from '../ui/Button';
import { GithubModal } from '../features/GithubModal';
import { GitCommandsModal } from '../features/GitCommandsModal';
import { ResearchModal } from '../features/ResearchModal';

interface NavbarProps {
    showBackButton?: boolean;
    backTo?: string;
    customButtons?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ 
    showBackButton = false, 
    backTo = '/dashboard',
    customButtons 
}) => {
    const [showResearch, setShowResearch] = useState(false);
    const [showGithub, setShowGithub] = useState(false);
    const [showGitCommands, setShowGitCommands] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');

    const handleBackup = async () => {
        setBackupStatus('Saving...');
        try {
            const { api } = await import('../../services/api');
            const data = await api.backup();
            setBackupStatus(`Saved: ${data.filename}`);
            setTimeout(() => setBackupStatus(''), 3000);
        } catch {
            setBackupStatus('Failed');
            setTimeout(() => setBackupStatus(''), 3000);
        }
    };

    return (
        <>
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                    {showBackButton && (
                        <Button 
                            onClick={() => navigate(backTo)} 
                            style={{ 
                                fontSize: '1.2rem', 
                                padding: '0.4rem 0.8rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-subtle)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                            }}
                        >
                            ←
                        </Button>
                    )}
                    
                    {/* System Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button
                            onClick={handleBackup}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                background: backupStatus === 'Failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 187, 247, 0.1)',
                                color: backupStatus === 'Failed' ? '#f87171' : 'var(--accent-primary)',
                                border: '1px solid rgba(59, 187, 247, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            💾 {backupStatus || 'Backup'}
                        </Button>
                        
                        <Button
                            onClick={() => setShowResearch(true)}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(167, 139, 250, 0.1)',
                                color: '#a78bfa',
                                border: '1px solid rgba(167, 139, 250, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            🌐 Research
                        </Button>
                        
                        <Button
                            onClick={() => setShowGithub(true)}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(52, 211, 153, 0.1)',
                                color: '#34d399',
                                border: '1px solid rgba(52, 211, 153, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            🐙 GitHub
                        </Button>
                        
                        <Button
                            onClick={() => setShowGitCommands(true)}
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(251, 191, 36, 0.1)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            💻 Git
                        </Button>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Button
                        onClick={() => navigate('/quarantine')}
                        style={{
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(248, 113, 113, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        🦠 Infection Center
                    </Button>
                    
                    <Button
                        onClick={() => navigate('/paths')}
                        style={{
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(96, 165, 250, 0.1)',
                            color: '#60a5fa',
                            border: '1px solid rgba(96, 165, 250, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        📁 Manage Paths
                    </Button>
                    
                    {customButtons}
                </div>
            </nav>

            {/* Modals */}
            {showResearch && <ResearchModal onClose={() => setShowResearch(false)} />}
            {showGithub && <GithubModal onClose={() => setShowGithub(false)} />}
            {showGitCommands && <GitCommandsModal onClose={() => setShowGitCommands(false)} />}
        </>
    );
};
