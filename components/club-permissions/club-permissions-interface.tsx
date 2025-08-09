'use client';

import { useState, useEffect } from 'react';
import { LetterCard } from './letter-card';
import { LoadingSpinner } from '../ui/loading-spinner';

interface Letter {
  id: string;
  title: string;
  content: string;
  recipients: string[];
  club_members_by_dept: Record<string, Array<{
    number: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
  }>>;
  status: string;
  created_at: string;
  club_name: string;
  collection_name: string;
}

interface ClubPermissionsInterfaceProps {
  officialRole: string;
  currentTab: string;
  basePath: string;
}

export function ClubPermissionsInterface({ 
  officialRole, 
  currentTab, 
  basePath 
}: ClubPermissionsInterfaceProps) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab configuration
  const tabs = [
    { id: 'pending', label: 'Pending', icon: '⏰' },
    { id: 'approved', label: 'Approved', icon: '✅' },
    { id: 'rejected', label: 'Rejected', icon: '❌' }
  ];

  // Fetch letters on component mount
  useEffect(() => {
    fetchLetters();
  }, [officialRole]);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/letters/official-view?role=${officialRole}`);
      if (!response.ok) {
        throw new Error('Failed to fetch letters');
      }
      const data = await response.json();
      setLetters(data.letters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter letters based on current tab and official's status
  const getFilteredLetters = () => {
    return letters.filter(letter => {
      // Check if this official is a recipient
      if (!letter.recipients.includes(officialRole)) {
        return false;
      }

      // Parse the status string to get this official's status
      const officialStatus = parseOfficialStatus(letter.status, officialRole);
      
      return officialStatus === currentTab;
    });
  };

  // Parse official status from the status string
  const parseOfficialStatus = (statusString: string, role: string): string => {
    // Handle non-string status values
    if (!statusString || typeof statusString !== 'string') {
      return 'pending';
    }
    
    const statusPairs = statusString.split(',');
    for (const pair of statusPairs) {
      const [officialRole, status] = pair.split('-');
      if (officialRole === role) {
        return status || 'pending';
      }
    }
    return 'pending';
  };

  // Get authorization level for the official
  const getAuthorizationLevel = (role: string): 'full' | 'view-only' => {
    const fullAccessRoles = ['cse_hod', 'csm_hod', 'csd_hod', 'ece_hod'];
    return fullAccessRoles.includes(role) ? 'full' : 'view-only';
  };

  // Get department from official role
  const getDepartmentFromRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      'cse_hod': 'CSE',
      'csm_hod': 'CSM',
      'csd_hod': 'CSD',
      'ece_hod': 'ECE',
      'tpo': 'ALL',
      'dean': 'ALL',
      'director': 'ALL',
      'hs_hod': 'HS'
    };
    return roleMap[role] || 'ALL';
  };

  const filteredLetters = getFilteredLetters();
  const authLevel = getAuthorizationLevel(officialRole);
  const officialDepartment = getDepartmentFromRole(officialRole);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading letters</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`${basePath}?tab=${tab.id}`}
              className={`${
                currentTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="bg-gray-100 text-gray-900 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {getFilteredLetters().filter(letter => parseOfficialStatus(letter.status, officialRole) === tab.id).length}
              </span>
            </a>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {filteredLetters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">
              {currentTab === 'pending' ? '⏰' : currentTab === 'approved' ? '✅' : '❌'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {currentTab} letters
            </h3>
            <p className="text-gray-500">
              {currentTab === 'pending' 
                ? 'No letters are currently pending your review.'
                : currentTab === 'approved'
                ? 'You haven\'t approved any letters yet.'
                : 'You haven\'t rejected any letters yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredLetters.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                officialRole={officialRole}
                authLevel={authLevel}
                officialDepartment={officialDepartment}
                onStatusUpdate={fetchLetters}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
