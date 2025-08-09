"use client";

import { X, CheckCircle, XCircle, Clock, FileText, Users, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


interface Letter {
  id: string;
  subject: string;
  body?: string;
  recipients: string[];
  club_members_by_dept: Record<string, Array<{
    number: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
  }>>;
  status: string; // Letter-level status format: "cse_hod-approved,csm_hod-pending,..."
  closing?: string;
  created_at: string;
}

interface LetterViewModalProps {
  letter: Letter | null;
  isOpen: boolean;
  onClose: () => void;
}

// Map departments to official roles
const DEPT_TO_ROLE_MAP: Record<string, string> = {
  'HS': 'hs_hod',
  'CSE': 'cse_hod',
  'CSM': 'csm_hod',
  'CSD': 'csd_hod',
  'ECE': 'ece_hod',
};

// Map official roles to display names
const ROLE_DISPLAY_MAP: Record<string, string> = {
  'hs_hod': 'HS HOD',
  'csm_hod': 'CSM HOD',
  'cse_hod': 'CSE HOD',
  'csd_hod': 'CSD HOD',
  'ece_hod': 'ECE HOD',
  'tpo': 'TPO',
  'dean': 'DEAN',
  'director': 'DIRECTOR',
};

export function LetterViewModal({ letter, isOpen, onClose }: LetterViewModalProps) {
  if (!letter) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700';
      case 'rejected':
        return 'text-red-700';
      default:
        return 'text-yellow-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Parse official status from the status string
  const parseOfficialStatus = (statusString: string, role: string): string => {
    if (!statusString) return 'pending';
    
    const statusPairs = statusString.split(',');
    for (const pair of statusPairs) {
      const [officialRole, status] = pair.split('-');
      if (officialRole === role) {
        return status || 'pending';
      }
    }
    return 'pending';
  };

  // Get roll number status based on department HOD approval
  const getRollNumberStatus = (department: string) => {
    const officialRole = DEPT_TO_ROLE_MAP[department];
    return parseOfficialStatus(letter.status, officialRole);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Letter Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Letter Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{letter.subject}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(letter.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {letter.recipients.length} recipients
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Letter Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letter Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {letter.body || 'No content available'}
              </div>
              {letter.closing && (
                <>
                  <hr className="my-4" />
                  <div className="text-sm text-muted-foreground">
                    {letter.closing}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recipients Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {letter.recipients.map(role => {
                  const status = parseOfficialStatus(letter.status, role);
                  return (
                    <div key={role} className="flex items-center gap-2 p-2 border rounded-lg">
                      {getStatusIcon(status)}
                      <span className={`text-sm font-medium ${getStatusColor(status)}`}>
                        {ROLE_DISPLAY_MAP[role] || role.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Roll Number Status by Department */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Club Members Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(letter.club_members_by_dept).map(([department, members]) => {
                const departmentStatus = getRollNumberStatus(department);
                const hodRole = DEPT_TO_ROLE_MAP[department];
                const hodName = ROLE_DISPLAY_MAP[hodRole] || `${department} HOD`;
                
                return (
                  <div key={department} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{department} Department</h4>
                      <Badge variant="outline" className={`
                        ${departmentStatus === 'approved' ? 'border-green-200 text-green-700' : ''}
                        ${departmentStatus === 'rejected' ? 'border-red-200 text-red-700' : ''}
                        ${departmentStatus === 'pending' ? 'border-yellow-200 text-yellow-700' : ''}
                      `}>
                        {hodName} - {departmentStatus}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {members.map((member) => (
                        <div key={member.number} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          {getStatusIcon(member.status)}
                          <span className={`text-sm ${getStatusColor(member.status)}`}>
                            #{member.number}
                          </span>
                          {member.approved_by && (
                            <span className="text-xs text-gray-500">
                              by {ROLE_DISPLAY_MAP[member.approved_by] || member.approved_by}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
