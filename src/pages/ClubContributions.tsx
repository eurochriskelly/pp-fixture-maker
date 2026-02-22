import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClubContributions = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Club Contributions Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Club contribution statistics and details will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubContributions;
