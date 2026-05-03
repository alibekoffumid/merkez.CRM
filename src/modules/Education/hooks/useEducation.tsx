import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../../../supabaseClient';

export interface EducationContextType {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  students: any[];
  courses: any[];
  enrollments: any[];
  lessons: any[];
  rooms: any[];
  teachers: any[];
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
  const [lessons, setLessons] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, coursesRes, enrollmentsRes, lessonsRes, roomsRes, teachersRes] = await Promise.all([
        supabase.from('education_students').select('*').eq('tenant_id', tenantId),
        supabase.from('education_courses').select('*').eq('tenant_id', tenantId),
        supabase.from('enrollments').select('*, education_students(*), education_courses(*)').eq('tenant_id', tenantId),
        supabase.from('education_lessons').select('*, education_courses(*)').eq('tenant_id', tenantId),
        supabase.from('education_rooms').select('*').eq('tenant_id', tenantId),
        supabase.from('education_teachers').select('*').eq('tenant_id', tenantId)
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (teachersRes.error) throw (teachersRes as any).error; // Handle types


      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
      setLessons(lessonsRes.data || []);
      setRooms(roomsRes.data || []);
      setTeachers((teachersRes as any).data || []);
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
      lessons,
      rooms,
      teachers,
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
