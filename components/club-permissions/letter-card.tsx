'use client';

import { useState } from 'react';
import { MemberApprovalControls } from './member-approval-controls';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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

interface LetterCardProps {
  letter: Letter;
  officialRole: string;
  authLevel: 'full' | 'view-only';
  officialDepartment: string;
  onStatusUpdate: () => void;
}

export function LetterCard({ 
  letter, 
  officialRole, 
  authLevel, 
  officialDepartment,
  onStatusUpdate 
}: LetterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: 'approve' | 'reject';
    department: string;
  } | null>(null);

  // Get members for the official's department
  const getDepartmentMembers = () => {
    if (officialDepartment === 'ALL') {
      // For view-only roles, show all departments
      return Object.entries(letter.club_members_by_dept);
    }
    
    // For HODs, only show their department
    const deptMembers = letter.club_members_by_dept[officialDepartment];
    return deptMembers ? [[officialDepartment, deptMembers]] : [];
  };

  // Handle bulk approve/reject for department
  const handleBulkAction = async (action: 'approve' | 'reject', department: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/letters/${letter.id}/bulk-action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          department,
          officialRole
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update letter status');
      }

      onStatusUpdate();
    } catch (error) {
      console.error('Error updating letter:', error);
    } finally {
      setLoading(false);
      setShowConfirmDialog(null);
    }
  };

  // Handle individual member action
  const handleMemberAction = async (
    memberNumber: string, 
    action: 'approve' | 'reject', 
    department: string
  ) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/letters/${letter.id}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department,
          memberNumber,
          status: action === 'approve' ? 'approved' : 'rejected',
          officialRole
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update member status');
      }

      onStatusUpdate();
    } catch (error) {
      console.error('Error updating member:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const departmentMembers = getDepartmentMembers();

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        {/* Letter Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{letter.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Club: {letter.club_name}</span>
              <span>Collection: {letter.collection_name}</span>
              <span>Date: {formatDate(letter.created_at)}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Letter Content (when expanded) */}
        {expanded && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Letter Content:</h4>
              <div className="text-gray-700 whitespace-pre-wrap">{letter.content}</div>
            </div>

            {/* Recipients List */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Recipients:</h4>
              <div className="flex flex-wrap gap-2">
                {letter.recipients.map((recipient) => (
                  <span
                    key={recipient}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recipient === officialRole
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {recipient.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Department Members */}
        <div className="space-y-4">
          {departmentMembers.map(([department, members]) => (
            <div key={department} className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">
                  {department} Department ({members.length} members)
                </h4>
                
                {/* Bulk Actions - only for authorized officials and their department */}
                {authLevel === 'full' && 
                 (officialDepartment === department || officialDepartment === 'ALL') && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowConfirmDialog({ type: 'approve', department })}
                      disabled={loading}
                      className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md disabled:opacity-50"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={() => setShowConfirmDialog({ type: 'reject', department })}
                      disabled={loading}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md disabled:opacity-50"
                    >
                      Reject All
                    </button>
                  </div>
                )}
              </div>

              {/* Members List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((member, index) => (
                  <div
                    key={member.number}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">#{member.number}</span>
                      <div className="flex items-center space-x-1">
                        {member.status === 'approved' && <span className="text-green-600">✅</span>}
                        {member.status === 'rejected' && <span className="text-red-600">❌</span>}
                        {member.status === 'pending' && <span className="text-yellow-600">⏰</span>}
                        <span className="text-xs text-gray-500 capitalize">{member.status}</span>
                      </div>
                    </div>

                    {/* Individual Member Controls */}
                    {authLevel === 'full' && 
                     (officialDepartment === department || officialDepartment === 'ALL') &&
                     member.status === 'pending' && (
                      <MemberApprovalControls
                        onApprove={() => handleMemberAction(member.number, 'approve', department)}
                        onReject={() => handleMemberAction(member.number, 'reject', department)}
                        disabled={loading}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmationDialog
          isOpen={true}
          title={`${showConfirmDialog.type === 'approve' ? 'Approve' : 'Reject'} All Members`}
          message={`Are you sure you want to ${showConfirmDialog.type} all members from ${showConfirmDialog.department} department?`}
          confirmText={showConfirmDialog.type === 'approve' ? 'Approve All' : 'Reject All'}
          cancelText="Cancel"
          onConfirm={() => handleBulkAction(showConfirmDialog.type, showConfirmDialog.department)}
          onCancel={() => setShowConfirmDialog(null)}
          variant={showConfirmDialog.type === 'approve' ? 'success' : 'danger'}
        />
      )}
    </>
  );
}
