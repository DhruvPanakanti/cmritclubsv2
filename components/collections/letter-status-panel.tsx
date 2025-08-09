"use client";

import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LetterStatusPanelProps {
  recipients: string[];
  status: Record<string, string>;
}

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

export function LetterStatusPanel({ recipients, status = {} }: LetterStatusPanelProps) {
  // Categorize recipients by their approval status
  const approved = recipients.filter(role => status[role] === 'approved');
  const rejected = recipients.filter(role => status[role] === 'rejected');
  const pending = recipients.filter(role => !status[role] || status[role] === 'pending');

  const getDisplayName = (role: string) => ROLE_DISPLAY_MAP[role] || role.toUpperCase();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Approval Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approved Section */}
        {approved.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Approved</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {approved.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {approved.map(role => (
                <Badge key={role} variant="outline" className="border-green-200 text-green-700">
                  {getDisplayName(role)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Section */}
        {rejected.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Rejected</span>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {rejected.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {rejected.map(role => (
                <Badge key={role} variant="outline" className="border-red-200 text-red-700">
                  {getDisplayName(role)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pending Section */}
        {pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Pending</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {pending.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {pending.map(role => (
                <Badge key={role} variant="outline" className="border-yellow-200 text-yellow-700">
                  {getDisplayName(role)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {approved.length} approved, {rejected.length} rejected, {pending.length} pending
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
