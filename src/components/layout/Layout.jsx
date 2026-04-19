import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from '../SiteHeader';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const hideFooterOnEventDetail = /^\/events\/[^/]+$/.test(location.pathname);

  return (
    <>
      <SiteHeader />
      <main key={location.pathname} className="page-transition" style={{ flex: 1 }}>
        <Outlet />
      </main>
      {!hideFooterOnEventDetail ? <Footer /> : null}
    </>
  );
}
