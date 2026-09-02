import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePreventBrowserBack() {
  const navigate = useNavigate();

  useEffect(() => {
    // Push an extra entry so there's always something to intercept
    window.history.pushState(null, '');

    const block = () => {
      // Push again so the next back-press is also intercepted
      window.history.pushState(null, '');
      navigate('/dashboard', { replace: true });
    };

    window.addEventListener('popstate', block);
    return () => window.removeEventListener('popstate', block);
  }, [navigate]);
}
