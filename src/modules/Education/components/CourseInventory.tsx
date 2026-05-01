import React from 'react';
import { BookOpen, Plus, Tag } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';

const CourseInventory = () => {
  const { courses, loading } = useEducation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Programs & Courses</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Manage academy offerings and pricing structure</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-900/20 font-bold text-sm transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Add Program
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 text-center text-gray-500 font-bold">Loading programs...</div>
        ) : courses?.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="font-bold text-lg text-gray-900">No programs available.</p>
            <p className="text-sm">Create your first educational program to get started.</p>
          </div>
        ) : (
          courses?.map((course: any) => (
            <div key={course.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:border-blue-200 transition-all group flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all text-blue-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1 font-medium">{course.description || 'No description provided.'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                <div className="flex items-center gap-1 text-emerald-600 font-black text-lg">
                  <Tag className="w-4 h-4" /> ₼{course.price}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                  {course.category || 'General'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseInventory;
