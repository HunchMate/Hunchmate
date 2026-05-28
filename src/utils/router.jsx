'use client';

import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useParams as useNextParams } from 'next/navigation';

export function Link({ to, href, children, ...props }) {
  const destination = to || href || '#';
  return (
    <NextLink href={destination} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return React.useCallback((to, options) => {
    if (typeof to === 'number') {
      if (to === -1) {
        if (typeof window !== 'undefined') window.history.back();
      } else if (to === 1) {
        if (typeof window !== 'undefined') window.history.forward();
      }
    } else if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router]);
}



export function useLocation() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearch(window.location.search || '');
    }
  }, [pathname]);

  return {
    pathname: pathname || '',
    search,
    hash: '',
    state: null,
  };
}

export function useParams() {
  const params = useNextParams();
  return params || {};
}

export function Navigate({ to, replace }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);
  return null;
}
