"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import axios from 'axios';

export const BatchControls = ({ jobId, totalQuestions }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/evaluate/status/${jobId}`);
        setProgress(data.progress || 0);
        setStatus(data.status);
        
        if (['completed', 'failed'].includes(data.status)) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Status check failed:", error);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Evaluation Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Processed: {Math.round((progress / 100) * totalQuestions)}/{totalQuestions}</span>
            <span className="capitalize">{status}</span>
          </div>
          <Progress value={progress} />
          {status === 'active' && (
            <Button variant="outline" className="w-full">
              Pause Evaluation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};