import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const hideNavbarOnEventDetail = /^\/events\/[^/]+$/.test(location.pathname);
  const hideFooterOnEventDetail = /^\/events\/[^/]+$/.test(location.pathname);

  return (
    <>
      {!hideNavbarOnEventDetail ? <Navbar /> : null}
      <main key={location.pathname} className="page-transition" style={{ flex: 1 }}>
        <Outlet />
      </main>
      {!hideFooterOnEventDetail ? <Footer /> : null}
    </>
  );
}
