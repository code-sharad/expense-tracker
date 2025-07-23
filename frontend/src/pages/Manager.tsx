import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hook/useAuth';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface Expense {
  _id: string;
  userId: User;
  amount: number;
  description: string;
  date: string;
  ResolvedBy?: User;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function Manager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { authToken } = useAuth();

  // Fetch expenses for approval
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/expenses`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle expense approval/rejection
  const handleExpenseAction = async (expenseId: string, action: 'approved' | 'rejected') => {
    setProcessingId(expenseId);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/expenses/${expenseId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} expense`);
      }

      // Refresh the list
      fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} expense`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };


  // Filter expenses based on selected status
  const filteredExpenses = expenses.filter(expense =>
    filterStatus === 'all' || expense.status === filterStatus
  );

  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Expense Approvals
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve employee expense requests
            </p>
          </div>
          <div className="mt-4 flex items-center space-x-4 md:mt-0 md:ml-4">
            {/* Notification Badge */}
            {pendingCount > 0 && (
              <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-2 rounded-md">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L3 7v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7l-7-5zM8 18v-6h4v6H8z" />
                </svg>
                <span className="text-sm font-medium">{pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="pending">Pending Only</option>
              <option value="all">All Expenses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>



        {/* Expenses List */}
        <div className="mt-8">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterStatus === 'pending' ? 'No pending expenses to review.' : `No ${filterStatus} expenses found.`}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <li key={expense._id}>
                    <div className="px-4 py-4 sm:px-6 hover:">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {expense.userId.name || expense.userId.email}
                                    </p>
                                    <span className={getStatusBadge(expense.status)}>
                                      {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500">{expense.userId.email}</p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-lg font-semibold text-gray-900">${expense.amount.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <p className="text-sm text-gray-700 line-clamp-2">{expense.description}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-500">

                                  Submitted {new Date(expense.createdAt).toLocaleDateString()}
                                </div>

                                {expense.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleExpenseAction(expense._id, 'rejected')}
                                      disabled={processingId === expense._id}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {processingId === expense._id ? (
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleExpenseAction(expense._id, 'approved')}
                                      disabled={processingId === expense._id}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {processingId === expense._id ? (
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      Approve
                                    </button>
                                  </div>
                                )}

                                {expense.status !== 'pending' && expense.ResolvedBy && (
                                  <div className="text-xs text-gray-500">
                                    {expense.status === 'approved' ? 'Approved' : 'Rejected'} by {expense.ResolvedBy.name || expense.ResolvedBy.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
