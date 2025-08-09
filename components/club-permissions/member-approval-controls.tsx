'use client';

interface MemberApprovalControlsProps {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function MemberApprovalControls({ 
  onApprove, 
  onReject, 
  disabled = false 
}: MemberApprovalControlsProps) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={onApprove}
        disabled={disabled}
        className="p-1 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Approve member"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="p-1 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Reject member"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
