import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams, useLocation } from 'react-router-dom';

const Officials = () => {
  const location = useLocation();
  const path = location.pathname.split('/').pop() || 'Officials';
  const label = path.charAt(0).toUpperCase() + path.slice(1);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Officials - {label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Manage {label.toLowerCase()} here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Officials;
