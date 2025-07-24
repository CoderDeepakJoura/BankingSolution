// src/pages/SessionExpired.tsx
const SessionExpired = () => (
  <div className="flex flex-col items-center justify-center h-screen text-center">
    <h1 className="text-3xl font-bold text-red-600 mb-4">Session Expired or you are not authorized to view this page.</h1>
    <p className="text-gray-600 mb-6">Please login again to continue.</p>
    <a
      href="/"
      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Go to Login
    </a>
  </div>
);

export default SessionExpired;
