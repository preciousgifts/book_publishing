import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookEditor } from '../components/editor/BookEditor';

export default function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
      <BookEditor
        projectId={projectId}
        onBack={() => navigate('/dashboard')}
      />
    </div>
  );
}
