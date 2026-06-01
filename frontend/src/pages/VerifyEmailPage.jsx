import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.get(`/auth/verify/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        {status === 'loading' && <p className="text-gray-500">Verifying...</p>}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h1>
            <p className="text-gray-500 mb-6">Your account is now fully active.</p>
            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-gray-500 mb-6">The link is invalid or has expired.</p>
            <Link to="/login" className="btn-secondary">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
