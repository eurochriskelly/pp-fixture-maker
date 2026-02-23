import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClubsMap = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Clubs Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground">
            Map View Placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubsMap;
