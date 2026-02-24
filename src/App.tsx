import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { useProfileStore } from './stores/profileStore';
import { useHistoryStore } from './stores/historyStore';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Analysis } from './pages/Analysis';
import { Report } from './pages/Report';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

function AppContent() {
  const page = useAppStore((s) => s.page);

  switch (page) {
    case 'home': return <Home />;
    case 'analysis': return <Analysis />;
    case 'report': return <Report />;
    case 'history': return <History />;
    case 'settings': return <Settings />;
  }
}

export default function App() {
  const init = useProfileStore((s) => s.init);
  const profile = useProfileStore((s) => s.profile);
  const loadHistory = useHistoryStore((s) => s.load);
  const page = useAppStore((s) => s.page);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (profile) {
      loadHistory(profile.id);
    }
  }, [profile, loadHistory]);

  // Analysis page uses full-screen, no Layout
  if (page === 'analysis') {
    return <Analysis />;
  }

  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}
