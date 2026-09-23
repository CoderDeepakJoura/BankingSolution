const SessionExpired = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">

      {/* Icon */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-5">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6 text-sm leading-relaxed">
        You are not authorized to view this page, or your session is no longer valid. This can happen for one of the following reasons:
      </p>

      {/* Reasons list */}
      <ul className="text-left text-sm text-gray-600 space-y-3 mb-8">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">1</span>
          <span><strong className="text-gray-700">Session timed out</strong> — You were inactive for too long and your login token expired.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">2</span>
          <span><strong className="text-gray-700">Logged in elsewhere</strong> — Another login was made for this account from a different device or browser, which ended this session.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">3</span>
          <span><strong className="text-gray-700">Password or permissions changed</strong> — An administrator updated your account settings, requiring a fresh login.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">4</span>
          <span><strong className="text-gray-700">Browser data cleared</strong> — Cookies or site data were cleared, removing your active session.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">5</span>
          <span><strong className="text-gray-700">Unauthorized access</strong> — You attempted to open a page directly without being logged in, or you do not have permission to access it.</span>
        </li>
      </ul>

      <a
        href="/"
        className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
      >
        Back to Login
      </a>
    </div>
  </div>
);

export default SessionExpired;
