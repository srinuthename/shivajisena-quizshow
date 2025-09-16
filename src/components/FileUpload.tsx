import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, CheckCircle, XCircle, FileText } from 'lucide-react';
import { localStorageService } from '@/services/localStorageService';
import { toast } from 'sonner';

interface ValidationError {
  field: string;
  message: string;
}

export const FileUpload: React.FC = () => {
  const questionsFileRef = useRef<HTMLInputElement>(null);
  const settingsFileRef = useRef<HTMLInputElement>(null);
  
  const [questionsStatus, setQuestionsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [questionsErrors, setQuestionsErrors] = useState<ValidationError[]>([]);
  const [settingsErrors, setSettingsErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  const handleQuestionsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setQuestionsStatus('idle');
    setQuestionsErrors([]);

    const result = await localStorageService.loadQuestionsFromFile(file);
    
    if (result.success) {
      setQuestionsStatus('success');
      toast.success(`Successfully loaded ${result.data?.length} questions`);
    } else {
      setQuestionsStatus('error');
      setQuestionsErrors(result.errors);
      toast.error('Failed to load questions file');
    }
    
    setLoading(false);
  };

  const handleSettingsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSettingsStatus('idle');
    setSettingsErrors([]);

    const result = await localStorageService.loadSettingsFromFile(file);
    
    if (result.success) {
      setSettingsStatus('success');
      toast.success('Successfully loaded settings');
    } else {
      setSettingsStatus('error');
      setSettingsErrors(result.errors);
      toast.error('Failed to load settings file');
    }
    
    setLoading(false);
  };

  const downloadSampleFiles = () => {
    // Download sample questions
    const questionsLink = document.createElement('a');
    questionsLink.href = '/sample-questions.json';
    questionsLink.download = 'sample-questions.json';
    questionsLink.click();

    // Download sample settings
    const settingsLink = document.createElement('a');
    settingsLink.href = '/sample-settings.json';
    settingsLink.download = 'sample-settings.json';
    settingsLink.click();

    toast.success('Sample files downloaded');
  };

  const StatusIcon = ({ status }: { status: 'idle' | 'success' | 'error' }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Upload Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sample Files Download */}
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={downloadSampleFiles}
              variant="outline"
              className="w-fit"
            >
              Download Sample Files
            </Button>
            <p className="text-sm text-muted-foreground">
              Download sample JSON files to understand the expected format
            </p>
          </div>

          {/* Questions Upload */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusIcon status={questionsStatus} />
              <h3 className="text-lg font-semibold">Upload Questions</h3>
            </div>
            
            <div className="flex gap-2">
              <Input
                ref={questionsFileRef}
                type="file"
                accept=".json"
                onChange={handleQuestionsUpload}
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={() => questionsFileRef.current?.click()}
                disabled={loading}
                variant="outline"
              >
                Choose File
              </Button>
            </div>

            {questionsErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Validation Errors:</p>
                    {questionsErrors.map((error, index) => (
                      <p key={index} className="text-sm">
                        <strong>{error.field}:</strong> {error.message}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Settings Upload */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusIcon status={settingsStatus} />
              <h3 className="text-lg font-semibold">Upload Settings</h3>
            </div>
            
            <div className="flex gap-2">
              <Input
                ref={settingsFileRef}
                type="file"
                accept=".json"
                onChange={handleSettingsUpload}
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={() => settingsFileRef.current?.click()}
                disabled={loading}
                variant="outline"
              >
                Choose File
              </Button>
            </div>

            {settingsErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Validation Errors:</p>
                    {settingsErrors.map((error, index) => (
                      <p key={index} className="text-sm">
                        <strong>{error.field}:</strong> {error.message}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                localStorageService.resetToDefault();
                setQuestionsStatus('idle');
                setSettingsStatus('idle');
                setQuestionsErrors([]);
                setSettingsErrors([]);
                toast.success('Reset to default settings');
              }}
              variant="destructive"
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};