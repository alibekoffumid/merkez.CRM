import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../../../supabaseClient';

export interface EducationContextType {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  students: any[];
  courses: any[];
  enrollments: any[];
  loading: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
}

const EducationContext = createContext<EducationContextType | null>(null);

export const EducationProvider = ({ children, initialTenantId = null }: { children: ReactNode, initialTenantId?: string | null }) => {
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, coursesRes, enrollmentsRes] = await Promise.all([
        supabase.from('education_students').select('*').eq('tenant_id', tenantId),
        supabase.from('education_courses').select('*').eq('tenant_id', tenantId),
        supabase.from('enrollments').select('*, education_students(*), education_courses(*)').eq('tenant_id', tenantId)
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;

      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch education data');
      console.error('Education data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchAllData();
    }
  }, [tenantId, fetchAllData]);

  return (
    <EducationContext.Provider value={{
      tenantId,
      setTenantId,
      students,
      courses,
      enrollments,
      loading,
      error,
      refreshAll: fetchAllData
    }}>
      {children}
    </EducationContext.Provider>
  );
};

export const useEducation = () => {
  const context = useContext(EducationContext);
  if (!context) {
    throw new Error('useEducation must be used within an EducationProvider');
  }
  return context;
};
