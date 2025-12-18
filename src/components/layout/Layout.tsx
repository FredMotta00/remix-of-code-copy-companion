import { Outlet } from 'react-router-dom';
import Header from './Header';
import ChatBot from '@/components/chat/ChatBot';

const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <Outlet />
      </main>
      <ChatBot />
    </div>
  );
};

export default Layout;
