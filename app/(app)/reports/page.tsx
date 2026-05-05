'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, ExternalLink, Download, Lock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useFeatureAccess } from '@/contexts/feature-access-context';

interface Report {
  id: string; title: string; description?: string; cover_url?: string;
  short_title?: string; pages?: number; published_at?: string;
  is_free?: boolean; report_type?: string; drive_link?: string;
}

interface ReportsResponse { data: Report[]; total: number; }

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const reportsAccess = useFeatureAccess('reports_access');

  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ['/api/reports'],
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const reports = data?.data ?? [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} reports</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : reports.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map(report => {
            const canAccess = report.is_free || (user && reportsAccess.hasAccess);
            return (
              <Card key={report.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                {report.cover_url && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={report.cover_url} alt={report.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {report.report_type && <Badge variant="secondary" className="text-xs">{report.report_type}</Badge>}
                    {report.is_free && <Badge variant="success" className="text-xs">Free</Badge>}
                  </div>
                  <CardTitle className="text-base leading-tight">{report.title}</CardTitle>
                  {report.published_at && <CardDescription className="text-xs">{formatDate(report.published_at)}</CardDescription>}
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-end">
                  {report.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{report.description}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (report.short_title) router.push(`/reports/${report.short_title}`);
                        else if (report.drive_link) window.open(report.drive_link, '_blank');
                      }}
                    >
                      {canAccess ? <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />View</> : <><Lock className="h-3.5 w-3.5 mr-1.5" />Unlock</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No reports available</p>
        </div>
      )}
    </div>
  );
}
