import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlayTime = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Play Time Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Detailed play time statistics will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayTime;
