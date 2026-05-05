import Header from './Header';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main className="max-w-lg mx-auto pb-nav" style={{ padding: '0 0 80px 0' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
