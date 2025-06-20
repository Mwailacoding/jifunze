import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  BookOpen, 
  Edit, 
  Trash2,
  Target,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, Assignment, Module } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const TrainerAssignmentsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [assignmentsData, modulesData] = await Promise.all([
        apiClient.getAssignments(),
        apiClient.getTrainerModules()
      ]);
      setAssignments(assignmentsData);
      setModules(modulesData);
    } catch (error) {
      showError('Error', 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await apiClient.deleteAssignment(assignmentId);
      showSuccess('Assignment deleted successfully');
      fetchData();
    } catch (error) {
      showError('Error', 'Failed to delete assignment');
    }
  };

  const filteredAssignments = assignments.filter(assignment => 
    assignment.module_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CreateAssignmentModal = () => {
    const [formData, setFormData] = useState({
      module_id: '',
      assignment_type: 'individual' as 'individual' | 'department' | 'all',
      individual_id: '',
      department_id: '',
      employer_id: '',
      due_date: '',
      is_mandatory: true,
      notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const submitData = {
          ...formData,
          module_id: parseInt(formData.module_id),
          individual_id: formData.individual_id ? parseInt(formData.individual_id) : undefined,
          department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
          employer_id: formData.employer_id ? parseInt(formData.employer_id) : undefined,
          due_date: formData.due_date || undefined,
          assigned_by: 1, // Replace with the actual user ID of the person assigning the task
        };

        await apiClient.createAssignment(submitData);
        showSuccess('Assignment created successfully');
        setShowCreateModal(false);
        fetchData();
      } catch (error) {
        showError('Error', 'Failed to create assignment');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Assignment</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module
                </label>
                <select
                  value={formData.module_id}
                  onChange={(e) => setFormData({...formData, module_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Module</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Type
                </label>
                <select
                  value={formData.assignment_type}
                  onChange={(e) => setFormData({...formData, assignment_type: e.target.value as 'individual' | 'department' | 'all'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="department">Department</option>
                  <option value="all">All Users</option>
                </select>
              </div>

              {formData.assignment_type === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID
                  </label>
                  <input
                    type="number"
                    value={formData.individual_id}
                    onChange={(e) => setFormData({...formData, individual_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user ID"
                  />
                </div>
              )}

              {formData.assignment_type === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department ID
                  </label>
                  <input
                    type="number"
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department ID"
                  />
                </div>
              )}

              {formData.assignment_type === 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employer ID
                  </label>
                  <input
                    type="number"
                    value={formData.employer_id}
                    onChange={(e) => setFormData({...formData, employer_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employer ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_mandatory" className="text-sm text-gray-700">
                  Mandatory assignment
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any additional notes or instructions"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting && <LoadingSpinner size="sm" />}
                  <span>Create Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-600 mt-1">
              Manage and track module assignments for your learners
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Total</h3>
              <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Completed</h3>
              <p className="text-2xl font-bold text-green-600">
                {assignments.filter(a => (a.completion_percentage || 0) === 100).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">In Progress</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {assignments.filter(a => (a.completion_percentage || 0) > 0 && (a.completion_percentage || 0) < 100).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Overdue</h3>
              <p className="text-2xl font-bold text-red-600">
                {assignments.filter(a => a.due_date && new Date(a.due_date) < new Date() && (a.completion_percentage || 0) < 100).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-gray-200">
            {filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {assignment.module_title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="capitalize">{assignment.assignment_type} assignment</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.is_mandatory 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.is_mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                        {assignment.due_date && (
                          <span className={`flex items-center space-x-1 ${
                            new Date(assignment.due_date) < new Date() && (assignment.completion_percentage || 0) < 100
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }`}>
                            <Calendar className="w-4 h-4" />
                            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {assignment.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {assignment.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completion Progress</span>
                    <span className="font-medium">{assignment.completion_percentage || 0}%</span>
                  </div>
                  <ProgressBar
                    value={assignment.completion_percentage || 0}
                    size="sm"
                    className="w-full"
                    color={assignment.completion_percentage === 100 ? 'primary' : 'secondary'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No assignments found' : 'No assignments yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Create your first assignment to start tracking learner progress'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Assignment</span>
            </button>
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && <CreateAssignmentModal />}
    </Layout>
  );
};